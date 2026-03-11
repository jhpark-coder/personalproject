import React, { useEffect, useMemo, useState } from 'react';

interface ChecklistItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
}

const getTodayKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultItems: ChecklistItem[] = [
  { id: 'strength', title: '상체 루틴 A', subtitle: '20분', icon: '🏋️‍♂️' },
  { id: 'cardio', title: '가벼운 유산소', subtitle: '15분', icon: '🏃‍♂️' },
  { id: 'stretch', title: '전신 스트레칭', subtitle: '10분', icon: '🧘‍♂️' },
];

const TodayChecklist: React.FC<{ onStart?: () => void }> = ({ onStart }) => {
  const todayKey = useMemo(getTodayKey, []);
  const storageKey = `todayChecklist:${todayKey}`;
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(JSON.parse(raw));
    } catch {
      // Ignore invalid or unavailable localStorage content.
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const allDone = defaultItems.every(it => completed[it.id]);

  return (
    <div className="card today-card">
      <div className="card-header">
        <h3 className="card-title">오늘의 체크리스트</h3>
        <button className="arrow-button" onClick={onStart}>→</button>
      </div>

      <ul className="today-list">
        {defaultItems.map(item => (
          <li key={item.id} className={`today-item ${completed[item.id] ? 'done' : ''}`} onClick={() => toggle(item.id)}>
            <span className="today-icon">{item.icon}</span>
            <div className="today-text">
              <div className="today-title">{item.title}</div>
              {item.subtitle && <div className="today-sub">{item.subtitle}</div>}
            </div>
            <input type="checkbox" checked={!!completed[item.id]} readOnly />
          </li>
        ))}
      </ul>

      {allDone && <div className="today-all-done">모든 운동을 완료했습니다!</div>}
    </div>
  );
};

export default TodayChecklist; 
