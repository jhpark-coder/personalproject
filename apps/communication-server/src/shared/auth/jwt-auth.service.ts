import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AuthIdentity {
  userId: string;
  roles: string[];
}

const AUTH_COOKIE_NAME = 'fitmate_auth';

@Injectable()
export class JwtAuthService {
  constructor(private readonly configService: ConfigService) {}

  verifyToken(token: string | undefined | null): AuthIdentity | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const header = this.decodeJson<{ alg?: string }>(encodedHeader);
    if (header?.alg !== 'HS512') return null;

    const secret = this.getSecret();
    if (!secret) return null;

    const expectedSignature = createHmac('sha512', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (!this.safeEquals(signature, expectedSignature)) return null;

    const payload = this.decodeJson<{
      exp?: number;
      role?: string;
      roles?: string[];
      sub?: string | number;
    }>(encodedPayload);
    if (!payload?.sub) return null;

    if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) {
      return null;
    }

    const roles = Array.isArray(payload.roles)
      ? payload.roles
      : payload.role
        ? [payload.role]
        : [];

    return {
      userId: String(payload.sub),
      roles,
    };
  }

  requireIdentity(
    authorization: string | undefined,
    cookieHeader?: string,
  ): AuthIdentity {
    const identity = this.verifyToken(
      this.extractRequestToken(authorization, cookieHeader),
    );
    if (!identity) {
      throw new UnauthorizedException('Valid authentication token is required');
    }
    return identity;
  }

  requireUserAccess(
    authorization: string | undefined,
    cookieHeader: string | undefined,
    targetUserId: string | number,
  ): AuthIdentity {
    const identity = this.requireIdentity(authorization, cookieHeader);
    if (!this.canAccessUser(identity, targetUserId)) {
      throw new ForbiddenException('Cannot access another user');
    }
    return identity;
  }

  requireAdmin(
    authorization: string | undefined,
    cookieHeader?: string,
  ): AuthIdentity {
    const identity = this.requireIdentity(authorization, cookieHeader);
    if (!this.isAdmin(identity)) {
      throw new ForbiddenException('Admin role is required');
    }
    return identity;
  }

  getSocketIdentity(
    auth: unknown,
    authorization: unknown,
    cookieHeader?: unknown,
  ): AuthIdentity | null {
    const authObject =
      auth && typeof auth === 'object' ? (auth as Record<string, unknown>) : {};
    const token =
      this.asString(authObject.token) ||
      this.extractBearerToken(this.asString(authObject.authorization)) ||
      this.extractBearerToken(this.headerToString(authorization)) ||
      this.extractCookieToken(this.headerToString(cookieHeader));

    return this.verifyToken(token);
  }

  canAccessUser(
    identity: AuthIdentity,
    targetUserId: string | number,
  ): boolean {
    return this.isAdmin(identity) || identity.userId === String(targetUserId);
  }

  isAdmin(identity: AuthIdentity | null | undefined): boolean {
    return !!identity?.roles.some((role) => role === 'ROLE_ADMIN');
  }

  extractBearerToken(authorization: string | undefined): string | undefined {
    if (!authorization) return undefined;
    const [scheme, token] = authorization.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
  }

  extractRequestToken(
    authorization: string | undefined,
    cookieHeader?: string,
  ): string | undefined {
    return (
      this.extractBearerToken(authorization) ||
      this.extractCookieToken(cookieHeader)
    );
  }

  private extractCookieToken(
    cookieHeader: string | undefined,
  ): string | undefined {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) =>
      cookie.startsWith(`${AUTH_COOKIE_NAME}=`),
    );
    if (!tokenCookie) return undefined;
    return decodeURIComponent(tokenCookie.slice(AUTH_COOKIE_NAME.length + 1));
  }

  private getSecret(): string | null {
    const secret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      return null;
    }
    return secret;
  }

  private decodeJson<T>(encoded: string): T | null {
    try {
      return JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as T;
    } catch {
      return null;
    }
  }

  private safeEquals(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private headerToString(value: unknown): string | undefined {
    if (Array.isArray(value)) return value[0];
    return this.asString(value);
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
