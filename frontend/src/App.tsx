import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import MemberForm from './components/MemberForm';
import SignupForm from './components/SignupForm';
import OAuth2Callback from './components/OAuth2Callback';
import OAuth2Success from './components/OAuth2Success';
import OAuth2Failure from './components/OAuth2Failure';
import ChatButton from './components/ChatButton';
import ChatPage from './components/ChatPage';
import ChatDashboard from './components/ChatDashboard';
import MotionCoach from './components/MotionCoach';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<MemberForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/auth/:provider/callback" element={<OAuth2Callback />} />
        <Route path="/auth/success" element={<OAuth2Success />} />
        <Route path="/auth/failure" element={<OAuth2Failure />} />
        <Route path="/chat" element={<ChatPage userId={1} onClose={() => window.history.back()} isModal={false} />} />
        <Route path="/admin/chat" element={<ChatDashboard />} />
        <Route path="/motion-coach" element={<MotionCoach />} />
        <Route path="/" element={<MemberForm />} />
      </Routes>
      {/* 임시로 모든 페이지에 챗봇 버튼 표시 */}
      <ChatButton userId={1} />
    </Router>
  );
}

export default App;
