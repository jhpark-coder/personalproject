import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Loader2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import { authFetch } from '../../shared/lib/http';
import { hasAuthSession } from '../../shared/lib/storage';
import { formatPhoneNumberE164 } from '../../shared/lib/phoneNumber';
import Modal from '../Modal';
import { logger } from '../../shared/lib/logger';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';
import { Progress } from '../ui/progress';

interface BasicInfo {
  height: string;
  weight: string;
  age: string;
  gender: string;
  phoneNumber: string;
}

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

const OnboardingBasicInfo: React.FC = () => {
  const [formData, setFormData] = useState<BasicInfo>({
    height: '',
    weight: '',
    age: '',
    gender: '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<Partial<BasicInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const [showSmsCodeInput, setShowSmsCodeInput] = useState(false);
  const [isSmsVerified, setIsSmsVerified] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [canExtend, setCanExtend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '', type: 'info' });
  const showModal = (title: string, message: string, type: ModalState['type'] = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  const calculateAgeFromBirthDate = (birthDate: string): string => {
    if (!birthDate || birthDate.length !== 8) return '';

    try {
      const year = parseInt(birthDate.substring(0, 4));
      const month = parseInt(birthDate.substring(4, 6));
      const day = parseInt(birthDate.substring(6, 8));
      const birth = new Date(year, month - 1, day);
      const today = new Date();

      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
      }

      return age.toString();
    } catch (error) {
      logger.error('나이 계산 오류:', error);
      return '';
    }
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

  const handleSmsSend = async () => {
    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) {
      setErrors((prev) => ({ ...prev, phoneNumber: phoneError }));
      return;
    }

    setIsSmsLoading(true);

    try {
      const formattedPhone = formatPhoneNumberE164(formData.phoneNumber);
      const response = await fetch(`${API_ENDPOINTS.COMMUNICATION_SERVER_URL}/sms/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSmsCodeInput(true);
        startTimer();
        showModal('SMS 인증', 'SMS 인증 코드가 발송되었습니다.', 'success');
      } else {
        showModal('SMS 인증', data.message || 'SMS 발송에 실패했습니다.', 'error');
      }
    } catch (error) {
      logger.error('SMS 발송 실패:', error);
      showModal('SMS 인증', 'SMS 발송에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleSmsVerify = async () => {
    if (!smsCode.trim()) {
      showModal('SMS 인증', '인증번호를 입력해주세요.', 'error');
      return;
    }

    setIsSmsLoading(true);

    try {
      const formattedPhone = formatPhoneNumberE164(formData.phoneNumber);
      const response = await fetch(`${API_ENDPOINTS.COMMUNICATION_SERVER_URL}/sms/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          code: smsCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSmsVerified(true);
        setShowSmsCodeInput(false);
        clearTimer();
        showModal('SMS 인증', '전화번호 인증이 완료되었습니다!', 'success');
      } else {
        showModal('SMS 인증', data.message || '인증 코드가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      logger.error('SMS 인증 실패:', error);
      showModal('SMS 인증', '인증에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleExtendTime = async () => {
    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) {
      setErrors((prev) => ({ ...prev, phoneNumber: phoneError }));
      return;
    }

    setIsSmsLoading(true);

    try {
      const formattedPhone = formatPhoneNumberE164(formData.phoneNumber);
      const response = await fetch(`${API_ENDPOINTS.COMMUNICATION_SERVER_URL}/sms/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await response.json();

      if (data.success) {
        startTimer();
        showModal('SMS 인증', 'SMS 인증 코드가 재발송되었습니다.', 'success');
      } else {
        showModal('SMS 인증', data.message || 'SMS 재발송에 실패했습니다.', 'error');
      }
    } catch (error) {
      logger.error('SMS 재발송 실패:', error);
      showModal('SMS 인증', 'SMS 재발송에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSmsLoading(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!hasAuthSession()) {
          setIsLoading(false);
          return;
        }

        logger.debug('프로필 API 호출:', API_ENDPOINTS.PROFILE);
        const response = await authFetch(API_ENDPOINTS.PROFILE, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            const loadedUser = data.user;
            let age = loadedUser.age || '';
            if (!age && loadedUser.birthDate) {
              age = calculateAgeFromBirthDate(loadedUser.birthDate);
            }

            setFormData({
              height: loadedUser.height || '',
              weight: loadedUser.weight || '',
              age,
              gender: loadedUser.gender || '',
              phoneNumber: loadedUser.phoneNumber || '',
            });

            if (loadedUser.phoneNumber) {
              setIsSmsVerified(true);
            }
          }
        } else {
          logger.debug('프로필 요청 실패:', response.status, response.statusText);
        }
      } catch (error) {
        logger.error('사용자 데이터 로딩 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUserData();
  }, []);

  const validateForm = (): Partial<BasicInfo> => {
    const newErrors: Partial<BasicInfo> = {};

    if (!formData.height) newErrors.height = '키를 입력해주세요';
    if (!formData.weight) newErrors.weight = '몸무게를 입력해주세요';
    if (!formData.age) newErrors.age = '나이를 입력해주세요';
    if (!formData.gender) newErrors.gender = '성별을 선택해주세요';
    if (!formData.phoneNumber) newErrors.phoneNumber = '연락처를 입력해주세요';

    if (formData.height && (Number.isNaN(Number(formData.height)) || Number(formData.height) < 100 || Number(formData.height) > 250)) {
      newErrors.height = '올바른 키를 입력해주세요 (100-250cm)';
    }
    if (formData.weight && (Number.isNaN(Number(formData.weight)) || Number(formData.weight) < 30 || Number(formData.weight) > 200)) {
      newErrors.weight = '올바른 몸무게를 입력해주세요 (30-200kg)';
    }
    if (formData.age && (Number.isNaN(Number(formData.age)) || Number(formData.age) < 13 || Number(formData.age) > 100)) {
      newErrors.age = '올바른 나이를 입력해주세요 (13-100세)';
    }
    if (!isSmsVerified) {
      newErrors.phoneNumber = '전화번호 인증이 필요합니다';
    }

    return newErrors;
  };

  const handleInputChange = (field: keyof BasicInfo, value: string) => {
    if (field === 'phoneNumber' && value !== formData.phoneNumber) {
      setIsSmsVerified(false);
      setShowSmsCodeInput(false);
      setSmsCode('');
      clearTimer();
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = async () => {
    const formErrors = validateForm();
    setErrors(formErrors);

    if (Object.keys(formErrors).length !== 0 || !hasAuthSession()) return;

    try {
      const response = await authFetch(API_ENDPOINTS.UPDATE_BASIC_INFO, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate('/onboarding/complete');
      } else {
        logger.error('기본 정보 저장 실패');
      }
    } catch (error) {
      logger.error('기본 정보 저장 중 오류:', error);
    }
  };

  const inputClassName = (hasError?: boolean) =>
    hasError ? 'border-red-300 focus-visible:ring-red-500' : undefined;

  if (isLoading) {
    return (
      <Page className="bg-gradient-to-b from-slate-50 to-white">
        <PageMain className="flex min-h-dvh items-center justify-center">
          <Card className="w-full max-w-md border-white/80 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-sm font-semibold">사용자 정보를 불러오는 중입니다.</p>
            </CardContent>
          </Card>
        </PageMain>
      </Page>
    );
  }

  return (
    <Page className="bg-gradient-to-b from-slate-50 to-white">
      <PageHeader>
        <PageHeaderContent className="flex-col items-stretch gap-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-950">기본 정보</h1>
              <p className="text-sm text-muted-foreground">더 정확한 운동 추천을 위해 필요한 정보를 입력합니다.</p>
            </div>
          </div>
          <Progress value={75} />
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="max-w-3xl space-y-4">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>기본 정보를 입력해주세요</CardTitle>
            <CardDescription>키, 체중, 나이, 성별과 인증된 연락처를 저장합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                키 (cm) *
                <Input
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder="예: 170"
                  min="100"
                  max="250"
                  className={inputClassName(Boolean(errors.height))}
                />
                {errors.height && <span className="text-xs font-medium text-red-600">{errors.height}</span>}
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                몸무게 (kg) *
                <Input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="예: 65"
                  min="30"
                  max="200"
                  className={inputClassName(Boolean(errors.weight))}
                />
                {errors.weight && <span className="text-xs font-medium text-red-600">{errors.weight}</span>}
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                나이 *
                <Input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="예: 25"
                  min="13"
                  max="100"
                  className={inputClassName(Boolean(errors.age))}
                />
                {errors.age && <span className="text-xs font-medium text-red-600">{errors.age}</span>}
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                성별 *
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.gender ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                >
                  <option value="">선택하세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                  <option value="other">기타</option>
                </select>
                {errors.gender && <span className="text-xs font-medium text-red-600">{errors.gender}</span>}
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">전화번호 인증</h2>
                  <p className="text-sm text-muted-foreground">인증된 연락처는 운동 알림과 계정 확인에 사용됩니다.</p>
                </div>
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                연락처 *
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="예: 010-1234-5678"
                    disabled={isSmsVerified}
                    className={inputClassName(Boolean(errors.phoneNumber))}
                  />
                  <Button
                    type="button"
                    variant={isSmsVerified ? 'secondary' : 'default'}
                    onClick={handleSmsSend}
                    disabled={isSmsVerified || isSmsLoading || !formData.phoneNumber}
                    className="sm:w-32"
                  >
                    {isSmsLoading && <Loader2 className="size-4 animate-spin" />}
                    {isSmsVerified ? '인증완료' : isSmsLoading ? '전송중' : 'SMS 인증'}
                  </Button>
                </div>
                {errors.phoneNumber && <span className="text-xs font-medium text-red-600">{errors.phoneNumber}</span>}
                {isSmsVerified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    전화번호 인증이 완료되었습니다.
                  </span>
                )}
              </label>

              {showSmsCodeInput && !isSmsVerified && (
                <div className="space-y-3 rounded-lg border border-white bg-white p-3 shadow-sm">
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    SMS 인증 코드
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="SMS 인증 코드 6자리"
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
            </div>
          </CardContent>
        </Card>
      </PageMain>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-end">
          <Button type="button" size="lg" onClick={handleNext} disabled={!isSmsVerified} className="w-full sm:w-40">
            다음
          </Button>
        </div>
      </div>

      <Modal isOpen={modal.isOpen} onClose={closeModal} title={modal.title} message={modal.message} type={modal.type} />
    </Page>
  );
};

export default OnboardingBasicInfo;
