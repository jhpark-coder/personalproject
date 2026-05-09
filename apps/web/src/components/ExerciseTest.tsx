import React, { useState } from 'react';
import { Activity, Database, Dumbbell, Loader2, PlugZap } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Page, PageHeader, PageHeaderContent, PageMain } from './ui/page';

interface ExerciseData {
  id: number;
  name: string;
  category?: number | null;
  muscles?: number[];
  equipment?: number[];
  description?: string;
  recommendationData?: {
    baseScore: number;
    bodyCondition: Record<string, number>;
    goalSuitability: Record<string, number>;
  } | null;
}

interface MuscleData {
  id: number;
  name: string;
}

interface EquipmentData {
  id: number;
  name: string;
}

interface ApiEntity {
  id?: number;
  name?: string;
}

interface ApiExercise extends ApiEntity {
  category?: number | null;
  muscles?: number[];
  equipment?: number[];
  description?: string;
  recommendationData?: ExerciseData['recommendationData'];
}

const ExerciseTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [muscles, setMuscles] = useState<MuscleData[]>([]);
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [recommendations, setRecommendations] = useState<ExerciseData[]>([]);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const setResultMessage = (nextMessage: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(nextMessage);
    setMessageType(type);
  };

  const testApiConnection = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/test`);
      const data = await response.json();

      if (data.success) {
        setResultMessage(`${data.message} (근육 수: ${data.muscleCount})`, 'success');
      } else {
        setResultMessage(data.message || 'API 연결 테스트 실패', 'error');
      }
    } catch (error) {
      setResultMessage(`API 연결 실패: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMuscles = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/muscles`);
      const data = await response.json();

      if (data.success && data.data?.results) {
        const muscleResults = Array.isArray(data.data.results) ? (data.data.results as ApiEntity[]) : [];
        const safeMuscles = muscleResults.map((muscle) => ({
          id: muscle.id || 0,
          name: muscle.name || 'Unknown Muscle',
        }));

        setMuscles(safeMuscles);
        setResultMessage(`근육 정보 로드 완료 (${safeMuscles.length}개)`, 'success');
      } else {
        setResultMessage(`근육 정보 로드 실패: ${data.message || '데이터 구조 오류'}`, 'error');
      }
    } catch (error) {
      setResultMessage(`근육 정보 로드 실패: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/equipment`);
      const data = await response.json();

      if (data.success && data.data?.results) {
        const equipmentResults = Array.isArray(data.data.results) ? (data.data.results as ApiEntity[]) : [];
        const safeEquipment = equipmentResults.map((eq) => ({
          id: eq.id || 0,
          name: eq.name || 'Unknown Equipment',
        }));

        setEquipment(safeEquipment);
        setResultMessage(`장비 정보 로드 완료 (${safeEquipment.length}개)`, 'success');
      } else {
        setResultMessage(`장비 정보 로드 실패: ${data.message || '데이터 구조 오류'}`, 'error');
      }
    } catch (error) {
      setResultMessage(`장비 정보 로드 실패: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/all`);
      const data = await response.json();

      if (data.success && data.data?.results) {
        const exerciseResults = Array.isArray(data.data.results) ? (data.data.results as ApiExercise[]) : [];
        const safeExercises = exerciseResults.slice(0, 10).map((exercise) => ({
          id: exercise.id || 0,
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || null,
          muscles: exercise.muscles || [],
          equipment: exercise.equipment || [],
          description: exercise.description || '',
        }));

        setExercises(safeExercises);
        setResultMessage(`운동 목록 로드 완료 (총 ${data.data.count || exerciseResults.length}개 중 10개 표시)`, 'success');
      } else {
        setResultMessage(`운동 목록 로드 실패: ${data.message || '데이터 구조 오류'}`, 'error');
      }
    } catch (error) {
      setResultMessage(`운동 목록 로드 실패: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async () => {
    if (!selectedMuscle && !selectedEquipment) {
      setResultMessage('근육이나 장비를 선택해주세요.', 'error');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedMuscle) params.append('muscleId', selectedMuscle);
      if (selectedEquipment) params.append('equipmentId', selectedEquipment);

      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/exercises/recommend?${params}`);
      const data = await response.json();

      if (data.success && data.data?.results) {
        const recommendationResults = Array.isArray(data.data.results) ? (data.data.results as ApiExercise[]) : [];
        const safeRecommendations = recommendationResults.map((exercise) => ({
          id: exercise.id || 0,
          name: exercise.name || 'Unknown Exercise',
          category: exercise.category || null,
          muscles: exercise.muscles || [],
          equipment: exercise.equipment || [],
          description: exercise.description || '',
          recommendationData: exercise.recommendationData || null,
        }));

        setRecommendations(safeRecommendations);
        setResultMessage(`운동 추천 완료 (${safeRecommendations.length}개 추천)`, 'success');
      } else {
        setResultMessage(`운동 추천 실패: ${data.message || '데이터 구조 오류'}`, 'error');
      }
    } catch (error) {
      setResultMessage(`운동 추천 실패: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const messageClassName =
    messageType === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : messageType === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <div>
            <h1 className="text-xl font-bold text-slate-950">운동 API 테스트</h1>
            <p className="text-sm text-muted-foreground">운동 데이터, 장비, 근육, 추천 API 응답을 확인합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="space-y-4">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="size-5 text-primary" />
              API 연결 테스트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={testApiConnection} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              API 연결 테스트
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5 text-primary" />
              기본 데이터 로드
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadMuscles} disabled={loading}>근육 정보 로드</Button>
            <Button type="button" variant="outline" onClick={loadEquipment} disabled={loading}>장비 정보 로드</Button>
            <Button type="button" variant="outline" onClick={loadExercises} disabled={loading}>운동 목록 로드</Button>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              운동 추천 테스트
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              근육 선택
              <select
                value={selectedMuscle}
                onChange={(e) => setSelectedMuscle(e.target.value)}
                disabled={muscles.length === 0}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">근육을 선택하세요</option>
                {muscles.map((muscle) => (
                  <option key={muscle.id} value={muscle.id}>
                    {muscle.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              장비 선택
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                disabled={equipment.length === 0}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">장비를 선택하세요</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}
                  </option>
                ))}
              </select>
            </label>

            <Button type="button" className="self-end" onClick={getRecommendations} disabled={loading || (!selectedMuscle && !selectedEquipment)}>
              <Dumbbell className="size-4" />
              운동 추천
            </Button>
          </CardContent>
        </Card>

        {message && <div className={`rounded-lg border p-4 text-sm font-medium ${messageClassName}`}>{message}</div>}

        {exercises.length > 0 && (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>운동 목록 (처음 10개)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <strong className="text-slate-950">{exercise.name}</strong>
                  <div className="mt-2 text-sm text-muted-foreground">ID: {exercise.id}</div>
                  {exercise.category && <div className="text-sm text-muted-foreground">카테고리: {exercise.category}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {recommendations.length > 0 && (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>추천 운동</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {recommendations.map((exercise) => (
                <div key={exercise.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <strong className="text-slate-950">{exercise.name}</strong>
                  <div className="mt-2 text-sm text-muted-foreground">ID: {exercise.id}</div>
                  {exercise.category && <div className="text-sm text-muted-foreground">카테고리: {exercise.category}</div>}
                  {exercise.recommendationData && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      기본 점수: {typeof exercise.recommendationData.baseScore === 'number' ? exercise.recommendationData.baseScore : 'N/A'}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </PageMain>
    </Page>
  );
};

export default ExerciseTest;
