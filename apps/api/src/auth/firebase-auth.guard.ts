import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getApp } from 'firebase-admin/app';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UserRequest } from './user-request';
import { ApiEnvironment } from '../config/env';
import { OrganizationMembershipRepository } from './organization-membership.repository';
import { ORGANIZATION_MEMBERSHIP_REPOSITORY } from './auth.module';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<ApiEnvironment>,
    @Inject(ORGANIZATION_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: OrganizationMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    let decoded: DecodedIdToken;
    try {
      const app = getApp('ijac-api');
      decoded = await getAuth(app).verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid authorization token');
    }

    if (decoded.email) {
      const allowedDomain = this.config.get('ALLOWED_DOMAIN');
      if (allowedDomain && !decoded.email.endsWith(`@${allowedDomain}`)) {
        throw new ForbiddenException('Domain not allowed');
      }
    }

    const repositoryMode = this.config.get('REPOSITORY_MODE') ?? 'global';
    const membership =
      repositoryMode === 'organization'
        ? await this.membershipRepo.findActiveByUid(decoded.uid)
        : null;

    request.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      organizationId:
        repositoryMode === 'organization'
          ? membership?.organizationId
          : decoded.uid,
      role: repositoryMode === 'organization' ? membership?.role : undefined,
    } as UserRequest;

    return true;
  }

  extractToken(request: { headers: { authorization?: string } }): string | null {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return null;
    }
    return auth.slice(7);
  }
}
