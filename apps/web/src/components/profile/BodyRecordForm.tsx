import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../NavigationBar';
import { useUser } from '../../context/UserContext';
import { authFetch } from '../../shared/lib/http';
import { logger } from '../../shared/lib/logger';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Page, PageHeader, PageHeaderContent, PageMain } from '../ui/page';

interface BodyRecordPayload {
  measureDate: string;
  weight: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  notes?: string;
}

const BodyRecordForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [form, setForm] = useState({
    measureDate: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFatPercentage: '',
    muscleMass: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async () => {
    if (!form.weight.trim()) {
      alert('체중을 입력해주세요.');
      return;
    }
    const userId = user?.id;
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: BodyRecordPayload = {
        measureDate: form.measureDate,
        weight: parseFloat(form.weight),
      };
      if (form.bodyFatPercentage) payload.bodyFatPercentage = parseFloat(form.bodyFatPercentage);
      if (form.muscleMass) payload.muscleMass = parseFloat(form.muscleMass);
      if (form.notes) payload.notes = form.notes;

      const res = await authFetch(`/api/body-records/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('저장 실패');
      alert('신체 기록이 저장되었습니다.');
      navigate('/analytics/body');
    } catch (e) {
      logger.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent>
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-950">신체 기록 추가</h1>
            <p className="text-sm text-muted-foreground">체중, 체지방률, 근육량을 기록합니다.</p>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="max-w-3xl">
        <Card className="border-white/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>측정 정보</CardTitle>
            <CardDescription>체중은 필수 입력 항목입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                날짜
                <Input type="date" name="measureDate" value={form.measureDate} onChange={onChange} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                체중(kg) *
                <Input type="number" name="weight" value={form.weight} onChange={onChange} step="0.1" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                체지방률(%)
                <Input type="number" name="bodyFatPercentage" value={form.bodyFatPercentage} onChange={onChange} step="0.1" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                근육량(kg)
                <Input type="number" name="muscleMass" value={form.muscleMass} onChange={onChange} step="0.1" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              메모
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows={4}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="flex justify-end">
              <Button type="button" onClick={onSubmit} disabled={submitting}>
                <Save className="size-4" />
                {submitting ? '저장 중' : '저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageMain>

      <NavigationBar />
    </Page>
  );
};

export default BodyRecordForm;
