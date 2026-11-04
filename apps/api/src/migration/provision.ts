import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CliModule } from './cli.module';
import { describeTarget, parseProvisionArgs } from './cli-args';
import { OrganizationProvisioningService } from './organization-provisioning.service';

async function main() {
  let args: ReturnType<typeof parseProvisionArgs>;
  try {
    args = parseProvisionArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    console.error(
      'Usage: provision:organization -- --organization-id=<id> --name=<name> --admin-uid=<uid> --admin-email=<email> (--dry-run | --yes)',
    );
    process.exit(2);
  }

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error'] });
  const config = app.get(ConfigService);
  const [admin] = args.input.members;
  console.log(
    `Target: ${describeTarget({
      FIREBASE_PROJECT_ID: config.get('FIREBASE_PROJECT_ID'),
      FIRESTORE_EMULATOR_HOST: config.get('FIRESTORE_EMULATOR_HOST'),
    })}`,
  );
  console.log(`Organization: ${args.input.organizationId} (${args.input.name})`);
  console.log(`Admin: ${admin.email} (${admin.uid})`);

  let exitCode = 1;
  try {
    const result = await app
      .get(OrganizationProvisioningService)
      .provision(args.input, { dryRun: args.dryRun });

    console.log(`\nMode: ${args.dryRun ? 'DRY RUN (nothing written)' : 'APPLY'}`);
    console.log(
      `Organization: ${result.organizationCreated ? 'created' : 'already exists (left unchanged)'}`,
    );
    console.log(`Members created: ${result.membersCreated}`);
    console.log(`Members updated: ${result.membersUpdated}`);
    exitCode = 0;
  } catch (error: unknown) {
    console.error('Provisioning failed:', error);
  } finally {
    await app.close();
  }
  process.exit(exitCode);
}

void main();
