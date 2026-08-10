import { INestApplication } from '@nestjs/common';
import request from 'supertest';
export declare function createTestApp(authenticatedUser?: {
    uid: string;
    email: string;
    organizationId?: string;
    role?: string;
} | null): Promise<{
    app: INestApplication;
    cleanup: () => Promise<void>;
}>;
export declare function createAuthenticatedRequest(app: INestApplication, token?: string): {
    get: (path: string) => request.SuperTestStatic.Test;
    post: (path: string) => request.SuperTestStatic.Test;
    patch: (path: string) => request.SuperTestStatic.Test;
    delete: (path: string) => request.SuperTestStatic.Test;
};
//# sourceMappingURL=test-app.d.ts.map