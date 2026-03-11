import { describe, expect, it } from 'vitest';

import { formatPhoneNumberE164 } from './phoneNumber';

describe('phoneNumber', () => {
  it('converts dashed korean mobile numbers to E.164', () => {
    expect(formatPhoneNumberE164('010-1234-5678')).toBe('+821012345678');
  });

  it('keeps already formatted +82 numbers normalized without dashes', () => {
    expect(formatPhoneNumberE164('+82-10-1234-5678')).toBe('+821012345678');
  });

  it('converts raw domestic numbers with a leading zero', () => {
    expect(formatPhoneNumberE164('0111234567')).toBe('+82111234567');
  });

  it('keeps non-korean numbers unchanged', () => {
    expect(formatPhoneNumberE164('+15551234567')).toBe('+15551234567');
  });
});
