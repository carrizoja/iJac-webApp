import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '../firebase/firebase.module';
import { MigrationModule } from './migration.module';

/**
 * Minimal context for the organization CLI commands: config, Firebase and the
 * migration services only, so they run without the OAuth and encryption
 * secrets the full API requires.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development.local'],
      validate: (config: Record<string, unknown>) => {
        if (!config.FIREBASE_PROJECT_ID) {
          throw new Error('FIREBASE_PROJECT_ID is required');
        }
        return config;
      },
    }),
    FirebaseModule,
    MigrationModule,
  ],
})
export class CliModule {}
