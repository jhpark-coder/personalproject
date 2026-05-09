import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { JwtAuthService } from './jwt-auth.service';

const secret =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const base64url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const createToken = (payload: Record<string, unknown>) => {
  const header = base64url({ alg: 'HS512', typ: 'JWT' });
  const body = base64url(payload);
  const signature = createHmac('sha512', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
};

describe('JwtAuthService', () => {
  let service: JwtAuthService;

  beforeEach(() => {
    service = new JwtAuthService({
      get: jest.fn((key: string) =>
        key === 'JWT_SECRET' ? secret : undefined,
      ),
    } as unknown as ConfigService);
  });

  it('accepts the shared HttpOnly auth cookie as a request token source', () => {
    const token = createToken({
      sub: '42',
      role: 'ROLE_USER',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    const identity = service.requireIdentity(
      undefined,
      `fitmate_auth=${encodeURIComponent(token)}`,
    );

    expect(identity).toEqual({ userId: '42', roles: ['ROLE_USER'] });
  });

  it('accepts the shared auth cookie during socket handshakes', () => {
    const token = createToken({
      sub: '7',
      role: 'ROLE_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    const identity = service.getSocketIdentity(
      {},
      undefined,
      `fitmate_auth=${encodeURIComponent(token)}`,
    );

    expect(identity).toEqual({ userId: '7', roles: ['ROLE_ADMIN'] });
  });

  it('prefers a valid bearer token over the shared auth cookie', () => {
    const bearerToken = createToken({
      sub: '11',
      role: 'ROLE_USER',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const cookieToken = createToken({
      sub: '22',
      role: 'ROLE_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    const identity = service.requireIdentity(
      `Bearer ${bearerToken}`,
      `fitmate_auth=${encodeURIComponent(cookieToken)}`,
    );

    expect(identity).toEqual({ userId: '11', roles: ['ROLE_USER'] });
  });

  it('rejects expired or tampered tokens', () => {
    const expiredToken = createToken({
      sub: '42',
      role: 'ROLE_USER',
      exp: Math.floor(Date.now() / 1000) - 1,
    });
    const validToken = createToken({
      sub: '42',
      role: 'ROLE_USER',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const tamperedToken = validToken.replace(/\.[^.]+$/, '.bad-signature');

    expect(service.verifyToken(expiredToken)).toBeNull();
    expect(service.verifyToken(tamperedToken)).toBeNull();
    expect(() => service.requireIdentity(`Bearer ${expiredToken}`)).toThrow(
      UnauthorizedException,
    );
  });

  it('enforces user access while allowing admins to inspect other users', () => {
    const userToken = createToken({
      sub: '42',
      roles: ['ROLE_USER'],
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const adminToken = createToken({
      sub: '7',
      roles: ['ROLE_ADMIN'],
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    expect(
      service.requireUserAccess(`Bearer ${userToken}`, undefined, 42),
    ).toEqual({ userId: '42', roles: ['ROLE_USER'] });
    expect(() =>
      service.requireUserAccess(`Bearer ${userToken}`, undefined, 43),
    ).toThrow(ForbiddenException);
    expect(
      service.requireUserAccess(`Bearer ${adminToken}`, undefined, 43),
    ).toEqual({ userId: '7', roles: ['ROLE_ADMIN'] });
  });

  it('requires the admin role for admin-only operations', () => {
    const userToken = createToken({
      sub: '42',
      role: 'ROLE_USER',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const adminToken = createToken({
      sub: '7',
      role: 'ROLE_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    expect(() => service.requireAdmin(`Bearer ${userToken}`)).toThrow(
      ForbiddenException,
    );
    expect(service.requireAdmin(`Bearer ${adminToken}`)).toEqual({
      userId: '7',
      roles: ['ROLE_ADMIN'],
    });
  });

  it('prefers explicit socket auth over handshake cookies', () => {
    const authToken = createToken({
      sub: '100',
      role: 'ROLE_USER',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const cookieToken = createToken({
      sub: '200',
      role: 'ROLE_ADMIN',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    const identity = service.getSocketIdentity(
      { token: authToken },
      undefined,
      `fitmate_auth=${encodeURIComponent(cookieToken)}`,
    );

    expect(identity).toEqual({ userId: '100', roles: ['ROLE_USER'] });
  });
});
