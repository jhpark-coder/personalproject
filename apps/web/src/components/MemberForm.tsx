import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import { useUser } from '../context/UserContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  clearOnboardingFlags,
  consumeJustSignedUp,
  setAuthSession,
  setAuthToken,
  setCurrentProvider,
  setStoredUser,
} from '../shared/lib/storage';
import { logger } from '../shared/lib/logger';

const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const { setUserFromLogin } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('로그인 시도:', { email });

    if (!email || !password) {
      showModal('로그인 실패', '이메일과 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('로그인 실패', '올바른 이메일 형식을 입력해주세요.', 'error');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.token) {
          setAuthToken(data.token);
        } else {
          setAuthSession();
        }

        if (data.user) {
          setStoredUser(data.user);
          setUserFromLogin(data.user, data.token ?? '');
        }

        setCurrentProvider('local');

        const justSignedUp = consumeJustSignedUp();
        if (justSignedUp) {
          clearOnboardingFlags();
          setCurrentProvider('local');
          navigate('/onboarding/experience');
          return;
        }

        navigate('/');
      } else {
        showModal('로그인 실패', data.message || '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      logger.error('로그인 실패:', error);
      showModal('로그인 실패', '로그인에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const handleSocialLogin = (provider: string) => {
    logger.debug(`${provider} 로그인 시도`);
    window.location.href = API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider);
  };

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef6f3_100%)] px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <Badge variant="success" className="mb-5 gap-2 border-emerald-200 bg-white/70 px-3 py-1 text-emerald-700 shadow-sm">
              <Sparkles size={14} aria-hidden="true" />
              개인 운동 코치
            </Badge>
            <h1 className="text-4xl font-black leading-tight text-slate-950">
              운동 기록, 자세 분석, 일정 관리를 하나의 흐름으로.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              FitMate는 오늘의 루틴부터 주간 운동량, 캘린더 연동까지 사용자가 바로 행동할 수 있게 정리합니다.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                ['180분', '이번 주 운동'],
                ['75%', '목표 진행률'],
                ['3개', '핵심 루틴'],
              ].map(([value, label]) => (
                <Card key={label} className="border-white/70 bg-white/75 shadow-soft backdrop-blur">
                  <CardContent className="p-4">
                    <div className="text-2xl font-black text-slate-950">{value}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-[440px] border-white/80 bg-white/90 shadow-soft backdrop-blur">
          <CardHeader className="space-y-5 p-6 pb-3">
            <div className="flex items-start gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-blue-500/20" aria-hidden="true">
                <Activity size={25} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary">FitMate</p>
                <CardTitle className="mt-1 text-2xl font-black leading-tight text-slate-950">
                  다시 시작할 준비
                </CardTitle>
                <CardDescription className="mt-2 leading-6">
                  로그인하면 오늘 할 운동과 최근 기록을 바로 이어서 볼 수 있습니다.
                </CardDescription>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2" aria-label="FitMate 주요 장점">
              <Badge variant="secondary" className="justify-center gap-2 rounded-md py-2 text-slate-700">
                <ShieldCheck size={15} aria-hidden="true" />
                안전한 세션
              </Badge>
              <Badge variant="secondary" className="justify-center gap-2 rounded-md py-2 text-slate-700">
                <Sparkles size={15} aria-hidden="true" />
                맞춤 루틴
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-6 pt-3">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  이메일
                </label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  maxLength={50}
                  autoCapitalize="off"
                  aria-label="이메일주소"
                  value={email}
                  onChange={handleEmailChange}
                  autoComplete="email"
                  placeholder="member@fitmate.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  비밀번호
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    maxLength={41}
                    autoCapitalize="none"
                    aria-label="비밀번호"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    placeholder="비밀번호를 입력하세요"
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-slate-500"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full font-bold">
                로그인
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-semibold text-muted-foreground">
                  소셜 계정으로 계속하기
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              {[
                { provider: 'google', label: 'Google', mark: 'G', className: 'text-blue-700' },
                { provider: 'naver', label: 'Naver', mark: 'N', className: 'text-emerald-700' },
                { provider: 'kakao', label: 'Kakao', mark: 'K', className: 'text-yellow-700' },
              ].map((item) => (
                <Button
                  key={item.provider}
                  type="button"
                  variant="outline"
                  className="h-11 justify-start bg-white"
                  onClick={() => handleSocialLogin(item.provider)}
                >
                  <span className={`flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-black ${item.className}`}>
                    {item.mark}
                  </span>
                  {item.label}로 계속하기
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
              <button type="button" className="font-semibold text-muted-foreground hover:text-primary">
                비밀번호 찾기
              </button>
              <span className="text-border">|</span>
              <button type="button" className="font-semibold text-muted-foreground hover:text-primary">
                아이디 찾기
              </button>
              <span className="text-border">|</span>
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default MemberForm;
