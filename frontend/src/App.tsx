import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import MemberForm from './components/MemberForm';
import SignupForm from './components/SignupForm';
import OAuth2Callback from './components/OAuth2Callback';
import ChatButton from './components/ChatButton';
import ChatPage from './components/ChatPage';
import ChatDashboard from './components/ChatDashboard';
import MotionCoach from './components/MotionCoach';
import Dashboard from './components/Dashboard';
import PoseDetector from './components/pose-detection/PoseDetector';

// 디버깅용 컴포넌트
const DebugRouter = () => {
  const location = useLocation();
  
  console.log('현재 경로:', location.pathname);
  console.log('현재 URL:', window.location.href);
  console.log('URL 파라미터:', location.search);
  
  return null;
};

function App() {
  return (
    <Router>
      <DebugRouter />
      <Routes>
        <Route path="/login" element={<MemberForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/auth/:provider/callback" element={<OAuth2Callback />} />
        <Route path="/auth/callback" element={<OAuth2Callback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<ChatPage userId={1} onClose={() => window.history.back()} isModal={false} />} />
        <Route path="/admin/chat" element={<ChatDashboard />} />
        <Route path="/motion-coach" element={<MotionCoach />} />
        <Route path="/pose-detection" element={<PoseDetector />} />
        <Route path="/" element={<MemberForm />} />
      </Routes>
      {/* 임시로 모든 페이지에 챗봇 버튼 표시 */}
      <ChatButton userId={1} />
    </Router>
  );
}

export default App;
