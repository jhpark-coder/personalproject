import { describe, expect, it } from 'vitest';

import {
  parseOAuthCallbackParams,
  resolveOAuthCallbackAction,
} from './oauthCallback';

describe('oauthCallback', () => {
  it('parses callback params from the normal search string', () => {
    const params = parseOAuthCallbackParams(
      'https://fitmate.example.com/oauth2/callback?success=true&provider=google',
    );

    expect(params.success).toBe('true');
    expect(params.token).toBeNull();
    expect(params.provider).toBe('google');
  });

  it('parses callback params from a hash router url', () => {
    const params = parseOAuthCallbackParams(
      'https://fitmate.example.com/#/oauth2/callback?success=true&calendarOnly=true',
    );

    expect(params.token).toBeNull();
    expect(params.calendarOnly).toBe('true');
  });

  it('routes calendar-only callbacks before new-user onboarding', () => {
    const action = resolveOAuthCallbackAction({
      success: 'true',
      token: 'token',
      error: null,
      isNewUser: 'true',
      calendarOnly: 'true',
    });

    expect(action.kind).toBe('calendar');
  });

  it('routes brand-new users to onboarding', () => {
    const action = resolveOAuthCallbackAction({
      success: 'true',
      token: 'token',
      error: null,
      isNewUser: 'true',
      calendarOnly: null,
    });

    expect(action.kind).toBe('onboarding');
  });

  it('accepts cookie-backed callbacks when token is missing', () => {
    const action = resolveOAuthCallbackAction({
      success: 'true',
      token: null,
      error: null,
      isNewUser: null,
      calendarOnly: null,
    });

    expect(action.kind).toBe('home');
  });
});
