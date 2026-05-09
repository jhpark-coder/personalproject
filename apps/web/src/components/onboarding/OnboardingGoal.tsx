import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, HeartPulse, LineChart, Scale, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';
import { cn } from '../../lib/utils';

const goalOptions = [
  { id: 'strength', title: '근력 키우기', description: '더 강한 몸을 만들고 싶어요.', icon: Dumbbell, tone: 'bg-red-50 text-red-700' },
  { id: 'body', title: '탄탄한 몸 만들기', description: '균형 잡힌 체형을 만들고 싶어요.', icon: HeartPulse, tone: 'bg-blue-50 text-blue-700' },
  { id: 'diet', title: '다이어트 성공하기', description: '체중과 체지방을 관리하고 싶어요.', icon: Scale, tone: 'bg-violet-50 text-violet-700' },
  { id: 'fitness', title: '신체 능력 향상', description: '다양한 운동을 꾸준히 해보고 싶어요.', icon: LineChart, tone: 'bg-emerald-50 text-emerald-700' },
  { id: 'stamina', title: '체력 키우기', description: '지치지 않는 체력을 만들고 싶어요.', icon: Zap, tone: 'bg-orange-50 text-orange-700' },
];

const OnboardingGoal: React.FC = () => {
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (selectedGoal) {
      localStorage.setItem('userGoal', selectedGoal);
      navigate('/onboarding/basic-info');
    }
  };

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="flex-col items-stretch gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-950">운동 목표</h1>
              <p className="mt-1 text-sm text-muted-foreground">2 / 4 단계</p>
            </div>
          </div>
          <Progress value={50} />
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="grid max-w-3xl gap-5 py-8">
        <div>
          <h2 className="text-2xl font-black leading-tight text-slate-950">어떤 목표를 이루고 싶나요?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">목표는 언제든지 다시 바꿀 수 있습니다.</p>
        </div>

        <div className="grid gap-3">
          {goalOptions.map((goal) => {
            const Icon = goal.icon;
            const selected = selectedGoal === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                className={cn(
                  'w-full rounded-lg border bg-white p-4 text-left transition-colors',
                  selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:bg-muted',
                )}
                onClick={() => setSelectedGoal(goal.id)}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${goal.tone}`} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-slate-950">{goal.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{goal.description}</span>
                  </span>
                  {selected && <span className="size-3 rounded-full bg-primary" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="sticky bottom-4 border-white/80 bg-white/95 shadow-soft backdrop-blur">
          <CardContent className="p-3">
            <Button className="h-11 w-full" onClick={handleNext} disabled={!selectedGoal}>
              다음
            </Button>
          </CardContent>
        </Card>
      </PageMain>
    </Page>
  );
};

export default OnboardingGoal;
