import React, { useState } from 'react';
import { EXERCISE_OPTIONS, type ExerciseType } from '../../features/motion/lib/exerciseAnalysis';
import MotionCoach from '../MotionCoach';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

const PoseDetector: React.FC = () => {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');

  return (
    <Page className="bg-slate-50">
      <PageHeader>
        <PageHeaderContent className="justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-950">자세 감지</h1>
            <p className="text-sm text-muted-foreground">운동 종류를 선택하고 카메라 기반 자세 분석을 시작합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="max-w-6xl space-y-4">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>운동 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value as ExerciseType)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
            >
              {EXERCISE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <MotionCoach exerciseType={selectedExercise} />
      </PageMain>
    </Page>
  );
};

export default PoseDetector;
