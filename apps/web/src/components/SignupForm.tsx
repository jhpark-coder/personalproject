import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Eye, EyeOff, Loader2, Lock, Mail, MessageSquareText, Phone, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import {
  clearOnboardingFlags,
  markJustSignedUp,
  setCurrentProvider,
} from '../shared/lib/storage';
import { formatPhoneNumberE164 } from '../shared/lib/phoneNumber';
import { logger } from '../shared/lib/logger';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Page, PageMain } from './ui/page';
import { cn } from '../lib/utils';

interface FormErrors {
  email?: string;
  password?: string;
  nickname?: string;
  name?: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  verificationCode?: string;
  agreements?: string;
}

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
    name: '',
    birthDate: '',
    gender: '',
    phoneNumber: '',
    verificationCode: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSmsVerified, setIsSmsVerified] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [showSmsCodeInput, setShowSmsCodeInput] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [canExtend, setCanExtend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showModal = (title: string, message: string, type: ModalState['type'] = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email) return '이메일을 입력해주세요';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '올바른 이메일 형식을 입력해주세요';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return '비밀번호를 입력해주세요';
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return '비밀번호는 영문과 숫자를 포함해야 합니다';
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) return '이름을 입력해주세요';
    if (name.length < 2) return '이름은 2자 이상이어야 합니다';
    return undefined;
  };

  const validateBirthDate = (birthDate: string): string | undefined => {
    if (!birthDate) return '생년월일을 입력해주세요';
    if (birthDate.length !== 8) return '생년월일은 8자리로 입력해주세요';
    if (!/^\d{8}$/.test(birthDate)) return '생년월일은 숫자로만 입력해주세요';

    const year = parseInt(birthDate.substring(0, 4));
    const month = parseInt(birthDate.substring(4, 6));
    const day = parseInt(birthDate.substring(6, 8));

    if (year < 1900 || year > new Date().getFullYear()) return '올바른 년도를 입력해주세요';
    if (month < 1 || month > 12) return '올바른 월을 입력해주세요';
    if (day < 1 || day > 31) return '올바른 일을 입력해주세요';
    return undefined;
  };

  const validatePhoneNumber = (phoneNumber: string): string | undefined => {
    if (!phoneNumber) return '휴대전화번호를 입력해주세요';
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return '올바른 휴대전화번호 형식을 입력해주세요 (예: 010-1234-5678)';
    }
    return undefined;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
    setTimeLeft(0);
  };

  const startTimer = (duration: number = 300) => {
    clearTimer();
    setTimeLeft(duration);
    setIsTimerRunning(true);
    setCanExtend(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          setCanExtend(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}분${remainingSeconds.toString().padStart(2, '0')}초`;
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const handleTwilioOtpRequest = async (isRetry = false) => {
    if (!formData.phoneNumber.trim()) {
      showModal('입력 오류', '전화번호를 입력해주세요.', 'error');
      return;
    }

    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) {
      setErrors((prev) => ({ ...prev, phoneNumber: phoneError }));
      showModal('입력 오류', phoneError, 'error');
      return;
    }

    setIsSmsLoading(true);
    try {
      const phoneNumber = formatPhoneNumberE164(formData.phoneNumber);

      const response = await fetch(`${API_ENDPOINTS.COMMUNICATION_SERVER_URL}/sms/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`OTP 요청 실패 (${response.status}) ${text.slice(0, 200)}`);
      }

      const result = contentType.includes('application/json')
        ? await response.json()
        : { success: false, message: '서버가 JSON 이외의 응답을 반환했습니다.' };

      if (result.success) {
        setShowSmsCodeInput(true);
        startTimer();
        showModal(
          isRetry ? 'OTP 재발송 완료' : 'OTP 전송 완료',
          isRetry ? '인증 코드가 재발송되었습니다.' : '인증 코드가 발송되었습니다.',
          'success',
        );
      } else {
        showModal('전송 실패', result.message || '인증 코드 발송에 실패했습니다.', 'error');
      }
    } catch (error: unknown) {
      logger.error('Twilio OTP 요청 실패:', error);
      showModal(
        '전송 실패',
        error instanceof Error ? error.message : '인증 코드 발송 중 오류가 발생했습니다.',
        'error',
      );
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleExtendTime = async () => {
    await handleTwilioOtpRequest(true);
  };

  const handleSmsSend = async () => {
    if (!smsConsent) {
      showModal('동의 필요', 'SMS 인증 및 알림 수신 동의가 필요합니다.', 'error');
      return;
    }
    await handleTwilioOtpRequest();
  };

  const handleTwilioOtpVerify = async () => {
    if (!smsCode.trim()) {
      showModal('입력 오류', '인증 코드를 입력해주세요.', 'error');
      return;
    }

    setIsSmsLoading(true);
    try {
      const phoneNumber = formatPhoneNumberE164(formData.phoneNumber);

      const response = await fetch(`${API_ENDPOINTS.COMMUNICATION_SERVER_URL}/sms/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: smsCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSmsVerified(true);
        setShowSmsCodeInput(false);
        setSmsCode('');
        clearTimer();
        showModal('인증 성공', '전화번호 인증이 완료되었습니다.', 'success');
      } else {
        showModal('인증 실패', result.message || '인증 코드가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      logger.error('Twilio OTP 확인 실패:', error);
      showModal('인증 실패', '인증 코드 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleSmsVerify = async () => {
    await handleTwilioOtpVerify();
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;

    const birthDateError = validateBirthDate(formData.birthDate);
    if (birthDateError) newErrors.birthDate = birthDateError;

    const phoneNumberError = validatePhoneNumber(formData.phoneNumber);
    if (phoneNumberError) newErrors.phoneNumber = phoneNumberError;
    if (!isSmsVerified) newErrors.phoneNumber = '전화번호 인증이 필요합니다.';

    if (!termsAgreed || !smsConsent) {
      newErrors.agreements = '이용약관, 개인정보 처리방침, SMS 인증 동의가 필요합니다.';
    }

    return newErrors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'phoneNumber') {
      setIsSmsVerified(false);
      setShowSmsCodeInput(false);
      setSmsCode('');
      clearTimer();
    }

    if (errors[field as keyof FormErrors]) {
      const newErrors = { ...errors };
      delete newErrors[field as keyof FormErrors];
      setErrors(newErrors);
    }
  };

  const handleBlur = (field: string) => {
    const fieldValue = formData[field as keyof typeof formData];
    let fieldError: string | undefined;

    switch (field) {
      case 'email':
        fieldError = validateEmail(fieldValue);
        break;
      case 'password':
        fieldError = validatePassword(fieldValue);
        break;
      case 'name':
        fieldError = validateName(fieldValue);
        break;
      case 'birthDate':
        fieldError = validateBirthDate(fieldValue);
        break;
      case 'phoneNumber':
        fieldError = validatePhoneNumber(fieldValue);
        break;
      default:
        fieldError = undefined;
    }

    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const handleGenderChange = (gender: string) => {
    setFormData((prev) => ({
      ...prev,
      gender,
    }));
  };

  const handleSignup = async () => {
    const formErrors = validateForm();
    setErrors(formErrors);

    if (Object.keys(formErrors).length !== 0) {
      logger.debug('유효성 검사 실패:', formErrors);
      showModal('입력 오류', '입력 정보를 확인해주세요.', 'error');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname,
          name: formData.name,
          birthDate: formData.birthDate,
          gender: formData.gender,
          phoneNumber: formData.phoneNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showModal('회원가입 완료', '회원가입이 완료되었습니다!', 'success');

        clearOnboardingFlags();
        markJustSignedUp();
        setCurrentProvider('local');

        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        showModal('회원가입 실패', data.message || '회원가입에 실패했습니다.', 'error');
      }
    } catch (error) {
      logger.error('회원가입 실패:', error);
      showModal('회원가입 실패', '회원가입에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSignup();
  };

  const getFieldError = (field: string): string | undefined => {
    return errors[field as keyof FormErrors];
  };

  const inputClassName = (field: keyof FormErrors) =>
    getFieldError(field) ? 'border-red-300 focus-visible:ring-red-500' : undefined;

  const renderError = (field: keyof FormErrors) =>
    getFieldError(field) ? <div className="text-xs font-medium text-red-600">{getFieldError(field)}</div> : null;

  return (
    <Page className="bg-gradient-to-b from-slate-50 to-white pb-8">
      <PageMain className="max-w-3xl">
        <Card className="border-white/80 bg-white shadow-lg">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl">회원가입</CardTitle>
                <CardDescription className="mt-2">계정 정보와 SMS 인증을 완료하면 FitMate를 사용할 수 있습니다.</CardDescription>
              </div>
              <Button type="button" variant="outline" asChild>
                <Link to="/login">로그인으로 돌아가기</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  이메일주소 *
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={cn('pl-9', inputClassName('email'))}
                      placeholder="name@example.com"
                      autoComplete="email"
                    />
                  </div>
                  {renderError('email')}
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  비밀번호 *
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={cn('pl-9 pr-10', inputClassName('password'))}
                      placeholder="영문+숫자 8자 이상"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {renderError('password')}
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  닉네임
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      id="nickname"
                      name="nickname"
                      value={formData.nickname}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      onBlur={() => handleBlur('nickname')}
                      className="pl-9"
                      placeholder="닉네임"
                    />
                  </div>
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  이름 *
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                      className={cn('pl-9', inputClassName('name'))}
                      placeholder="실명"
                    />
                  </div>
                  {renderError('name')}
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  생년월일 *
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      id="birthDate"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      onBlur={() => handleBlur('birthDate')}
                      className={cn('pl-9', inputClassName('birthDate'))}
                      placeholder="YYYYMMDD"
                      maxLength={8}
                    />
                  </div>
                  {renderError('birthDate')}
                </label>

                <div className="grid gap-1.5 text-sm font-medium text-slate-700">
                  성별
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'male', label: '남자' },
                      { value: 'female', label: '여자' },
                      { value: 'none', label: '선택안함' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.gender === option.value ? 'default' : 'outline'}
                        onClick={() => handleGenderChange(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                신분증 상의 이름, 생년월일, 성별과 일치하지 않으면 실명인증이 불가합니다.
              </div>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">전화번호 인증</h2>
                    <p className="text-sm text-muted-foreground">회원가입 본인 확인을 위해 Twilio 문자 인증을 사용합니다.</p>
                  </div>
                </div>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  휴대전화번호 *
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        onBlur={() => handleBlur('phoneNumber')}
                        className={cn('pl-9', inputClassName('phoneNumber'))}
                        placeholder="010-1234-5678"
                        disabled={isSmsVerified}
                      />
                    </div>
                    <Button type="button" onClick={handleSmsSend} disabled={isSmsVerified || isSmsLoading} className="sm:w-32">
                      {isSmsLoading && <Loader2 className="size-4 animate-spin" />}
                      {isSmsVerified ? '인증완료' : isSmsLoading ? '전송중' : '문자 인증'}
                    </Button>
                  </div>
                  {renderError('phoneNumber')}
                  {isSmsVerified && (
                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      전화번호 인증이 완료되었습니다.
                    </div>
                  )}
                </label>

                {showSmsCodeInput && !isSmsVerified && (
                  <div className="space-y-3 rounded-lg border border-white bg-white p-3 shadow-sm">
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                      SMS 인증 코드
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="text"
                          id="smsCode"
                          name="smsCode"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value)}
                          placeholder="인증 코드 6자리"
                          maxLength={6}
                          disabled={isSmsLoading}
                        />
                        <Button type="button" onClick={handleSmsVerify} disabled={isSmsLoading || !smsCode.trim()} className="sm:w-28">
                          {isSmsLoading && <Loader2 className="size-4 animate-spin" />}
                          {isSmsLoading ? '인증중' : '인증하기'}
                        </Button>
                      </div>
                    </label>

                    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Clock className="size-4 text-muted-foreground" />
                        {isTimerRunning ? formatTime(timeLeft) : '시간 만료'}
                      </div>
                      {canExtend && (
                        <Button type="button" size="sm" variant="outline" onClick={handleExtendTime} disabled={isSmsLoading}>
                          시간연장
                        </Button>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                      <MessageSquareText className="mt-0.5 size-4 shrink-0" />
                      인증번호를 발송했습니다. 인증 문자가 오지 않으면 시간연장을 눌러주세요.
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(event) => setTermsAgreed(event.target.checked)}
                    className="mt-1 size-4 rounded border-slate-300"
                  />
                  <span>
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline">
                      이용약관
                    </Link>
                    {' '}및{' '}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline">
                      개인정보 처리방침
                    </Link>
                    에 동의합니다.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(event) => setSmsConsent(event.target.checked)}
                    className="mt-1 size-4 rounded border-slate-300"
                  />
                  <span>회원가입 본인 확인과 서비스 알림을 위한 SMS 수신에 동의합니다.</span>
                </label>
                {renderError('agreements')}
              </section>

              <Button type="submit" size="lg" className="w-full" disabled={!isSmsVerified || !termsAgreed || !smsConsent}>
                회원가입
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageMain>

      <Modal isOpen={modal.isOpen} onClose={closeModal} title={modal.title} message={modal.message} type={modal.type} />
    </Page>
  );
};

export default SignupForm;
