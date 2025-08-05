import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NavigationBar from '../NavigationBar';

const BodyData: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('weekly');

  const muscleData = [
    { date: '25-05-12', value: 27.0 },
    { date: '05-19', value: 27.2 },
    { date: '05-26', value: 27.5 }
  ];

  const fatData = [
    { date: '25-05-12', value: 17.0 },
    { date: '05-19', value: 16.8 },
    { date: '05-26', value: 16.3 }
  ];

  return (
    <div className="body-data-container">
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">신체 데이터</div>
          <button className="add-button">추가</button>
        </div>
      </div>

      <div className="body-data-content">
        {/* 골격근량 섹션 */}
        <div className="data-section">
          <div className="section-header">
            <div className="section-icon">💪</div>
            <div className="section-info">
              <h3>골격근량</h3>
              <span className="current-value">27.5kg</span>
            </div>
          </div>
          
          <div className="change-info">
            지난 데이터 대비 +0.5kg
          </div>
          
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              일별
            </button>
            <button 
              className={`tab-button ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              주별
            </button>
            <button 
              className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              월별
            </button>
          </div>
          
          <div className="min-max-info">
            최소 | 27kg 최대 | 27.5kg
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={muscleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[27.0, 27.5]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#007AFF" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 체지방률 섹션 */}
        <div className="data-section">
          <div className="section-header">
            <div className="section-icon">📊</div>
            <div className="section-info">
              <h3>체지방률</h3>
              <span className="current-value">16.3%</span>
            </div>
          </div>
          
          <div className="change-info">
            지난 데이터 대비 -0.7%
          </div>
          
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              일별
            </button>
            <button 
              className={`tab-button ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              주별
            </button>
            <button 
              className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              월별
            </button>
          </div>
          
          <div className="min-max-info">
            최소 | 16.3% 최대 | 17%
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[16.0, 17.0]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#AF52DE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default BodyData; 