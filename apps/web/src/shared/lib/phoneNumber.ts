export const KOREAN_MOBILE_REGEX = /^01[0-9]-\d{3,4}-\d{4}$/;

export const formatPhoneNumberE164 = (phoneNumber: string): string => {
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  if (phoneNumber.trim().startsWith('+82')) {
    return `+82${digitsOnly.replace(/^82/, '')}`;
  }

  if (digitsOnly.startsWith('010') && digitsOnly.length >= 10) {
    return `+82${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith('0')) {
    return `+82${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith('82')) {
    return `+${digitsOnly}`;
  }

  return phoneNumber;
};
