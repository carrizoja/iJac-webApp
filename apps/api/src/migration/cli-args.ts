import { ProvisionInput } from './organization-provisioning.service';

const CONFIRMATION_ERROR = 'Refusing to write without --yes. Run with --dry-run first.';

function readFlag(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = argv.find((a) => a.startsWith(prefix));
  const value = arg?.slice(prefix.length).trim();
  return value ? value : undefined;
}

function readDryRun(argv: string[]): boolean {
  const dryRun = argv.includes('--dry-run');
  if (!dryRun && !argv.includes('--yes')) {
    throw new Error(CONFIRMATION_ERROR);
  }
  return dryRun;
}

function requireFlags<K extends string>(
  argv: string[],
  flags: Record<K, string>,
): Record<K, string> {
  const values = {} as Record<K, string>;
  const missing: string[] = [];
  for (const [key, placeholder] of Object.entries(flags) as Array<[K, string]>) {
    const value = readFlag(argv, key);
    if (value === undefined) {
      missing.push(`--${key}=<${placeholder}>`);
    } else {
      values[key] = value;
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')}`);
  }
  return values;
}

export function parseMigrateArgs(argv: string[]): { organizationId: string; dryRun: boolean } {
  const flags = requireFlags(argv, { 'organization-id': 'id' });
  return { organizationId: flags['organization-id'], dryRun: readDryRun(argv) };
}

export function parseProvisionArgs(argv: string[]): { input: ProvisionInput; dryRun: boolean } {
  const flags = requireFlags(argv, {
    'organization-id': 'id',
    name: 'name',
    'admin-uid': 'uid',
    'admin-email': 'email',
  });
  return {
    input: {
      organizationId: flags['organization-id'],
      name: flags.name,
      members: [{ uid: flags['admin-uid'], email: flags['admin-email'], role: 'admin' }],
    },
    dryRun: readDryRun(argv),
  };
}

/** One line naming the Firestore the command is about to use. */
export function describeTarget(env: {
  FIREBASE_PROJECT_ID?: string;
  FIRESTORE_EMULATOR_HOST?: string;
}): string {
  const project = env.FIREBASE_PROJECT_ID ?? '(unset)';
  return env.FIRESTORE_EMULATOR_HOST
    ? `Firestore emulator at ${env.FIRESTORE_EMULATOR_HOST} (project ${project})`
    : `PRODUCTION Firestore (project ${project})`;
}
