import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Check, Dumbbell, StretchHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

interface ChecklistItem {
  id: string;
  title: string;
  subtitle: string;
  icon: 'strength' | 'cardio' | 'stretch';
}

const getTodayKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultItems: ChecklistItem[] = [
  { id: 'strength', title: '상체 루틴 A', subtitle: '20분', icon: 'strength' },
  { id: 'cardio', title: '가벼운 유산소', subtitle: '15분', icon: 'cardio' },
  { id: 'stretch', title: '전신 스트레칭', subtitle: '10분', icon: 'stretch' },
];

const itemIcons = {
  strength: Dumbbell,
  cardio: Activity,
  stretch: StretchHorizontal,
} as const;

const TodayChecklist: React.FC<{ onStart?: () => void }> = ({ onStart }) => {
  const todayKey = useMemo(getTodayKey, []);
  const storageKey = `todayChecklist:${todayKey}`;
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(JSON.parse(raw));
    } catch {
      // Keep rendering even when localStorage is unavailable.
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Keep the visible state responsive even when storage is unavailable.
      }
      return next;
    });
  };

  const completedCount = defaultItems.filter(it => completed[it.id]).length;
  const allDone = completedCount === defaultItems.length;

  return (
    <Card className="border-white/80 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5">
        <div>
          <CardTitle className="text-base font-black text-slate-950">오늘의 체크리스트</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount}/{defaultItems.length}개 완료
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={onStart} aria-label="운동 시작하기">
          <ArrowRight size={18} />
        </Button>
      </CardHeader>

      <CardContent className="grid gap-2 p-5 pt-0">
        {defaultItems.map(item => {
          const Icon = itemIcons[item.icon];
          const done = !!completed[item.id];

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex min-h-16 w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition-colors',
                done ? 'border-emerald-200 bg-emerald-50' : 'border-border hover:bg-muted',
              )}
              onClick={() => toggle(item.id)}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-md',
                  done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700',
                )}
                aria-hidden="true"
              >
                {done ? <Check size={18} /> : <Icon size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{item.title}</span>
                <span className="block text-xs font-semibold text-muted-foreground">{item.subtitle}</span>
              </span>
              <span
                className={cn(
                  'size-5 rounded-full border',
                  done ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300',
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}

        {allDone && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            오늘 계획한 운동을 모두 완료했습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayChecklist;
