import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ApiEnvironment } from '../config/env';

export const FIRESTORE = Symbol('FIRESTORE');

@Global()
@Module({
  providers: [
    {
      provide: FIRESTORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnvironment>) => {
        const projectId = config.getOrThrow('FIREBASE_PROJECT_ID');
        const clientEmail = config.getOrThrow('FIREBASE_CLIENT_EMAIL');
        const privateKey = config
          .getOrThrow('FIREBASE_PRIVATE_KEY')
          .replace(/\\n/g, '\n');

        const app = initializeApp(
          {
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
            projectId,
          },
          'ijac-api',
        );

        return getFirestore(app);
      },
    },
  ],
  exports: [FIRESTORE],
})
export class FirebaseModule {}
