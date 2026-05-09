import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authFetch, authHeaders } from './http';
import { setAuthSession } from './storage';

const createLocalStorageMock = () => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
};

describe('authFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createLocalStorageMock() });
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=csrf%20value; theme=dark' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
  });

  it('sends credentialed requests by default', async () => {
    setAuthSession();

    await authFetch('/api/profile');

    expect(fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('adds the XSRF token only to unsafe methods', () => {
    const getHeaders = authHeaders({}, 'GET');
    const postHeaders = authHeaders({}, 'POST');

    expect(getHeaders.has('X-XSRF-TOKEN')).toBe(false);
    expect(postHeaders.get('X-XSRF-TOKEN')).toBe('csrf value');
  });

  it('does not overwrite caller-provided CSRF or credentials', async () => {
    await authFetch('/api/events', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'X-XSRF-TOKEN': 'caller-token',
      },
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);

    expect(init?.credentials).toBe('same-origin');
    expect(headers.get('X-XSRF-TOKEN')).toBe('caller-token');
  });
});
