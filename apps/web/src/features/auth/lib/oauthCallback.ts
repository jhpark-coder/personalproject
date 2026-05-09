export interface OAuthCallbackParams {
  calendarOnly: string | null;
  email: string | null;
  error: string | null;
  isNewUser: string | null;
  name: string | null;
  provider: string | null;
  success: string | null;
  token: string | null;
}

export type OAuthCallbackAction =
  | { kind: 'error'; message: string }
  | { kind: 'calendar' }
  | { kind: 'onboarding' }
  | { kind: 'home' };

const toParams = (params: URLSearchParams): OAuthCallbackParams => ({
  calendarOnly: params.get('calendarOnly'),
  email: params.get('email'),
  error: params.get('error'),
  isNewUser: params.get('isNewUser'),
  name: params.get('name'),
  provider: params.get('provider'),
  success: params.get('success'),
  token: params.get('token'),
});

export const parseOAuthCallbackParams = (href: string): OAuthCallbackParams => {
  const currentUrl = new URL(href);
  const searchParams = new URLSearchParams(currentUrl.search);

  if (Array.from(searchParams.keys()).length > 0) {
    return toParams(searchParams);
  }

  const hash = currentUrl.hash;
  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) {
    return toParams(new URLSearchParams(hash.slice(queryIndex + 1)));
  }

  return toParams(new URLSearchParams());
};

export const resolveOAuthCallbackAction = (
  params: Pick<OAuthCallbackParams, 'calendarOnly' | 'error' | 'isNewUser' | 'success' | 'token'>,
): OAuthCallbackAction => {
  if (params.error) {
    return { kind: 'error', message: '소셜 로그인에 실패했습니다. 다시 시도해주세요.' };
  }

  if (params.success !== 'true') {
    return { kind: 'error', message: '인증 정보가 올바르지 않습니다. 다시 시도해주세요.' };
  }

  if (params.calendarOnly === 'true') {
    return { kind: 'calendar' };
  }

  if (params.isNewUser === 'true') {
    return { kind: 'onboarding' };
  }

  return { kind: 'home' };
};
