import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ApiEnvironment } from '../config/env';
import { selectFirebaseCredentialMode } from './firebase-credential-mode';

export const FIRESTORE = Symbol('FIRESTORE');

@Global()
@Module({
  providers: [
    {
      provide: FIRESTORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnvironment>) => {
        const projectId = config.getOrThrow('FIREBASE_PROJECT_ID');
        const credentials = selectFirebaseCredentialMode({
          FIREBASE_CLIENT_EMAIL: config.get('FIREBASE_CLIENT_EMAIL'),
          FIREBASE_PRIVATE_KEY: config.get('FIREBASE_PRIVATE_KEY'),
        });

        const app = initializeApp(
          {
            projectId,
            ...(credentials.mode === 'explicit' && {
              credential: cert({
                projectId,
                clientEmail: credentials.clientEmail,
                privateKey: credentials.privateKey,
              }),
            }),
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
