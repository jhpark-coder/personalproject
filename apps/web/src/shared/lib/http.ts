const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

const mergeAuthHeaders = (headersInit?: HeadersInit, method = 'GET') => {
  const headers = new Headers(headersInit);

  if (unsafeMethods.has(method.toUpperCase()) && !headers.has(CSRF_HEADER_NAME)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  return headers;
};

export const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const method = init.method ?? 'GET';
  return fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: mergeAuthHeaders(init.headers, method),
  });
};

export const authHeaders = (headers: HeadersInit = {}, method = 'GET') =>
  mergeAuthHeaders(headers, method);
