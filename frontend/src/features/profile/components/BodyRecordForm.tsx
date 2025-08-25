import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '@components/ui/NavigationBar';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import './Profile.css';

const BodyRecordForm: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    measureDate: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFatPercentage: '',
    muscleMass: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1])).sub; } catch { return null; }
  };

  const onSubmit = async () => {
    if (!form.weight.trim()) {
      alert('체중을 입력해주세요.');
      return;
    }
    const userId = getUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        measureDate: form.measureDate,
        weight: parseFloat(form.weight)
      };
      if (form.bodyFatPercentage) payload.bodyFatPercentage = parseFloat(form.bodyFatPercentage);
      if (form.muscleMass) payload.muscleMass = parseFloat(form.muscleMass);
      if (form.notes) payload.notes = form.notes;

      const response = await apiClient.post(`/api/body-records/${userId}`, payload);
      
      if (response.data.success) {
        alert('신체 기록이 저장되었습니다.');
        navigate('/analytics/body');
      } else {
        throw new Error(response.data.message || '저장 실패');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('신체 기록 저장 실패:', errorMessage);
      alert(`저장 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate(-1)} className="back-button">←</button>
        <h1>신체 기록 추가</h1>
      </div>
      <div className="profile-content">
        <div className="basic-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">날짜</span>
              <input type="date" name="measureDate" value={form.measureDate} onChange={onChange} />
            </div>
            <div className="info-item">
              <span className="info-label">체중(kg) *</span>
              <input type="number" name="weight" value={form.weight} onChange={onChange} step="0.1" />
            </div>
            <div className="info-item">
              <span className="info-label">체지방률(%)</span>
              <input type="number" name="bodyFatPercentage" value={form.bodyFatPercentage} onChange={onChange} step="0.1" />
            </div>
            <div className="info-item">
              <span className="info-label">근육량(kg)</span>
              <input type="number" name="muscleMass" value={form.muscleMass} onChange={onChange} step="0.1" />
            </div>
            <div className="info-item" style={{ gridColumn: '1 / span 2' }}>
              <span className="info-label">메모</span>
              <textarea name="notes" value={form.notes} onChange={onChange} rows={3} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="action-button analytics-button" onClick={onSubmit} disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
      <NavigationBar />
    </div>
  );
};

export default BodyRecordForm; 