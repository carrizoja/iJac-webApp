import { Test } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { Workbook } from 'exceljs';
import { Client, DataExport, Payment, WorkOrder } from '@ijac/shared';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRequest } from '../auth/user-request';
import { ApiEnvironment } from '../config/env';
import { CLIENT_REPOSITORY } from '../clients/client.constants';
import { PAYMENT_REPOSITORY } from '../payments/payment.constants';
import { WORK_ORDER_REPOSITORY } from '../work-orders/work-order.constants';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

const records = {
  'org-a': {
    clients: [{ id: 'c1', name: 'Ana Pérez', createdAt: '', updatedAt: '' } as unknown as Client],
    workOrders: [
      { id: 'o1', title: 'Reparación techo', clientId: 'c1', createdAt: '', updatedAt: '' },
    ] as unknown as WorkOrder[],
    payments: [
      {
        id: 'p1',
        workOrderId: 'o1',
        receiptNumber: 1,
        amountMinor: 100,
        workOrderTitle: 'Reparación techo',
        client: { name: 'Ana Pérez' },
      },
    ] as unknown as Payment[],
  },
  'org-b': {
    clients: [{ id: 'b-client', name: 'Otra', createdAt: '', updatedAt: '' } as unknown as Client],
    workOrders: [] as WorkOrder[],
    payments: [] as Payment[],
  },
};

function repository<K extends 'clients' | 'workOrders' | 'payments'>(key: K) {
  return {
    listAll: jest.fn(async (org: string) => records[org as keyof typeof records]?.[key] ?? []),
  };
}

/** Sets the caller from test headers, after a bearer-token check like FirebaseAuthGuard's. */
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.headers.authorization) throw new UnauthorizedException('Missing authorization token');
    req.user = {
      uid: 'u1',
      email: 'u1@x.test',
      organizationId: req.headers['x-test-org'] ?? 'org-a',
      role: req.headers['x-test-role'] ?? 'admin',
    } as UserRequest;
    return true;
  }
}

async function createApp(guard: CanActivate | 'firebase'): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ExportController],
    providers: [
      ExportService,
      { provide: CLIENT_REPOSITORY, useValue: repository('clients') },
      { provide: WORK_ORDER_REPOSITORY, useValue: repository('workOrders') },
      { provide: PAYMENT_REPOSITORY, useValue: repository('payments') },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  const reflector = app.get(Reflector);
  const auth =
    guard === 'firebase'
      ? new FirebaseAuthGuard(
          reflector,
          { get: jest.fn() } as unknown as ConfigService<ApiEnvironment>,
          { findActiveByUid: jest.fn().mockResolvedValue(null) } as never,
        )
      : guard;
  app.useGlobalGuards(auth, new RolesGuard(reflector));
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

/** Reads response bytes as a workbook; exceljs declares its own Buffer type. */
async function loadWorkbook(bytes: Buffer): Promise<Workbook> {
  const workbook = new Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<Workbook['xlsx']['load']>[0]);
  return workbook;
}

/** Collects a binary response body as a Buffer. */
function binary(res: request.Response, callback: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Data export endpoints (HTTP)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createApp(new TestAuthGuard());
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the Excel workbook to an admin as a dated attachment', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export.xlsx')
      .set('Authorization', 'Bearer t')
      .buffer(true)
      .parse(binary)
      .expect(200);

    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="ijac-export-\d{4}-\d{2}-\d{2}\.xlsx"$/,
    );
    expect(res.headers['cache-control']).toBe('no-store');
    const workbook = await loadWorkbook(res.body as Buffer);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(['Clientes', 'Órdenes', 'Pagos']);
  });

  it('serves the JSON copy to an admin as a dated attachment', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export.json')
      .set('Authorization', 'Bearer t')
      .expect(200);

    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="ijac-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(res.headers['cache-control']).toBe('no-store');
    const body = JSON.parse(res.text) as DataExport;
    expect(Object.keys(body)).toEqual([
      'formatVersion',
      'exportedAt',
      'organizationId',
      'clients',
      'workOrders',
      'payments',
    ]);
  });

  it.each(['/api/export.xlsx', '/api/export.json'])(
    'refuses %s to a member with 403 and no data',
    async (path) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer t')
        .set('x-test-role', 'member')
        .expect(403);

      expect(res.text).not.toContain('Ana Pérez');
    },
  );

  it("contains only the caller's organization", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export.json')
      .set('Authorization', 'Bearer t')
      .set('x-test-org', 'org-a')
      .expect(200);

    const body = JSON.parse(res.text) as DataExport;
    expect(body.organizationId).toBe('org-a');
    expect(body.clients.map((c) => c.id)).toEqual(['c1']);
    expect(res.text).not.toContain('b-client');
  });

  it('holds the same records in both formats', async () => {
    const json = JSON.parse(
      (await request(app.getHttpServer()).get('/api/export.json').set('Authorization', 'Bearer t'))
        .text,
    ) as DataExport;
    const xlsx = await request(app.getHttpServer())
      .get('/api/export.xlsx')
      .set('Authorization', 'Bearer t')
      .buffer(true)
      .parse(binary);
    const workbook = await loadWorkbook(xlsx.body as Buffer);

    const ids = (name: string) =>
      workbook
        .getWorksheet(name)!
        .getColumn(1)
        .values.slice(2)
        .map((v) => String(v));
    expect(ids('Clientes')).toEqual(json.clients.map((c) => c.id));
    expect(ids('Órdenes')).toEqual(json.workOrders.map((o) => o.id));
    expect(ids('Pagos')).toEqual(json.payments.map((p) => p.id));
  });
});

describe('Data export endpoints without a session (HTTP)', () => {
  it.each(['/api/export.xlsx', '/api/export.json'])(
    'rejects %s without a token with 401',
    async (path) => {
      const app = await createApp('firebase');
      try {
        await request(app.getHttpServer()).get(path).expect(401);
      } finally {
        await app.close();
      }
    },
  );
});
