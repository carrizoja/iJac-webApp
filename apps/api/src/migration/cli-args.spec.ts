import { describeTarget, parseMigrateArgs, parseProvisionArgs } from './cli-args';

describe('parseMigrateArgs', () => {
  it('reads the organization id and dry-run flag', () => {
    expect(parseMigrateArgs(['--organization-id=ijac', '--dry-run'])).toEqual({
      organizationId: 'ijac',
      dryRun: true,
    });
  });

  it('requires --yes to write', () => {
    expect(() => parseMigrateArgs(['--organization-id=ijac'])).toThrow(
      'Refusing to write without --yes. Run with --dry-run first.',
    );
    expect(parseMigrateArgs(['--organization-id=ijac', '--yes'])).toEqual({
      organizationId: 'ijac',
      dryRun: false,
    });
  });

  it('requires an organization id', () => {
    expect(() => parseMigrateArgs(['--dry-run'])).toThrow('Missing --organization-id=<id>');
  });
});

describe('parseProvisionArgs', () => {
  const required = [
    '--organization-id=ijac',
    '--name=IJAC',
    '--admin-uid=uid-1',
    '--admin-email=owner@ijac.com.ar',
  ];

  it('builds a provision input with the admin member', () => {
    expect(parseProvisionArgs([...required, '--dry-run'])).toEqual({
      input: {
        organizationId: 'ijac',
        name: 'IJAC',
        members: [{ uid: 'uid-1', email: 'owner@ijac.com.ar', role: 'admin' }],
      },
      dryRun: true,
    });
  });

  it('keeps values that contain an equals sign or spaces', () => {
    const parsed = parseProvisionArgs([
      ...required.slice(0, 1),
      '--name=iJac IT = Solutions',
      ...required.slice(2),
      '--yes',
    ]);
    expect(parsed.input.name).toBe('iJac IT = Solutions');
    expect(parsed.dryRun).toBe(false);
  });

  it('names every missing flag', () => {
    expect(() => parseProvisionArgs(['--dry-run'])).toThrow(
      'Missing --organization-id=<id>, --name=<name>, --admin-uid=<uid>, --admin-email=<email>',
    );
  });

  it('requires --yes to write', () => {
    expect(() => parseProvisionArgs(required)).toThrow(
      'Refusing to write without --yes. Run with --dry-run first.',
    );
  });
});

describe('describeTarget', () => {
  it('names the emulator when FIRESTORE_EMULATOR_HOST is set', () => {
    expect(
      describeTarget({
        FIREBASE_PROJECT_ID: 'ijac-webapp',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      }),
    ).toBe('Firestore emulator at 127.0.0.1:8080 (project ijac-webapp)');
  });

  it('flags production when no emulator is set', () => {
    expect(describeTarget({ FIREBASE_PROJECT_ID: 'ijac-webapp' })).toBe(
      'PRODUCTION Firestore (project ijac-webapp)',
    );
  });
});
