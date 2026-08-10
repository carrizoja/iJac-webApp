import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrganizationMigrationService } from './organization-migration.service';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const defaultOrgId = process.argv
    .find((arg) => arg.startsWith('--organization-id='))
    ?.split('=')[1];

  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(OrganizationMigrationService);

  try {
    const result = await migrationService.migrate(dryRun, defaultOrgId);

    console.log('\n=== Migration Result ===');
    console.log(`Mode: ${result.dryRun ? 'DRY RUN' : 'APPLY'}`);
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

    process.exit(result.success ? 0 : 1);
  } catch (error: unknown) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
