import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CliModule } from './cli.module';
import { describeTarget, parseMigrateArgs } from './cli-args';
import { OrganizationMigrationService } from './organization-migration.service';

async function main() {
  let args: ReturnType<typeof parseMigrateArgs>;
  try {
    args = parseMigrateArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    console.error('Usage: migrate:organization -- --organization-id=<id> (--dry-run | --yes)');
    process.exit(2);
  }

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error'] });
  const config = app.get(ConfigService);
  console.log(
    `Target: ${describeTarget({
      FIREBASE_PROJECT_ID: config.get('FIREBASE_PROJECT_ID'),
      FIRESTORE_EMULATOR_HOST: config.get('FIRESTORE_EMULATOR_HOST'),
    })}`,
  );
  console.log(`Organization: ${args.organizationId}`);

  let exitCode = 1;
  try {
    const result = await app
      .get(OrganizationMigrationService)
      .migrate(args.dryRun, args.organizationId);

    console.log('\n=== Migration Result ===');
    console.log(`Mode: ${result.dryRun ? 'DRY RUN (nothing written)' : 'APPLY'}`);
    console.log(`Clients copied: ${result.clientsCopied}`);
    console.log(`Clients skipped: ${result.clientsSkipped}`);
    console.log(`Clients conflicts: ${result.clientsConflicts}`);
    console.log(`Work orders copied: ${result.workOrdersCopied}`);
    console.log(`Work orders skipped: ${result.workOrdersSkipped}`);
    console.log(`Work orders conflicts: ${result.workOrdersConflicts}`);
    console.log(`Work orders orphaned: ${result.workOrdersOrphaned}`);
    console.log(`Mappings copied: ${result.mappingsCopied}`);
    console.log(`Mappings skipped: ${result.mappingsSkipped}`);
    console.log(`Success: ${result.success ? 'YES' : 'NO'}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }
    exitCode = result.success ? 0 : 1;
  } catch (error: unknown) {
    console.error('Migration failed:', error);
  } finally {
    await app.close();
  }
  process.exit(exitCode);
}

void main();
