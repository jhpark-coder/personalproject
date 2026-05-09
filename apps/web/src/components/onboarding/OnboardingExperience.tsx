import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Flame, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';
import { cn } from '../../lib/utils';

const experienceOptions = [
  {
    id: 'beginner',
    title: '초보자',
    description: '운동을 처음 시작하거나 다시 시작하는 단계입니다.',
    icon: ShieldCheck,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'intermediate',
    title: '중급자',
    description: '규칙적으로 운동한 경험이 있고 기본 동작에 익숙합니다.',
    icon: Dumbbell,
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'advanced',
    title: '고급자',
    description: '강도 높은 루틴과 기록 관리를 원합니다.',
    icon: Flame,
    tone: 'bg-orange-50 text-orange-700',
  },
];

const OnboardingExperience: React.FC = () => {
  const [selectedExperience, setSelectedExperience] = useState<string>('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (selectedExperience) {
      localStorage.setItem('userExperience', selectedExperience);
      navigate('/onboarding/goal');
    }
  };

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="flex-col items-stretch gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/login')} aria-label="로그인으로 돌아가기">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-950">운동 경험</h1>
              <p className="mt-1 text-sm text-muted-foreground">1 / 4 단계</p>
            </div>
          </div>
          <Progress value={25} />
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid max-w-3xl gap-5 py-8">
        <div>
          <h2 className="text-2xl font-black leading-tight text-slate-950">운동 경험이 어느 정도인가요?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">경험에 맞는 운동 루틴을 추천해드립니다.</p>
        </div>

        <div className="grid gap-3">
          {experienceOptions.map((experience) => {
            const Icon = experience.icon;
            const selected = selectedExperience === experience.id;
            return (
              <button
                key={experience.id}
                type="button"
                className={cn(
                  'w-full rounded-lg border bg-white p-4 text-left transition-colors',
                  selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:bg-muted',
                )}
                onClick={() => setSelectedExperience(experience.id)}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${experience.tone}`} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-slate-950">{experience.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{experience.description}</span>
                  </span>
                  {selected && <span className="size-3 rounded-full bg-primary" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="sticky bottom-4 border-white/80 bg-white/95 shadow-soft backdrop-blur">
          <CardContent className="p-3">
            <Button className="h-11 w-full" onClick={handleNext} disabled={!selectedExperience}>
              다음
            </Button>
          </CardContent>
        </Card>
      </PageMain>
    </Page>
  );
};

export default OnboardingExperience;
