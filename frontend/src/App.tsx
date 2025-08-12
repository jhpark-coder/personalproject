import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import ChatPage from './components/ChatPage';
import MotionCoach from './components/MotionCoach';
import SignupForm from './components/SignupForm';
import OAuth2Callback from './components/OAuth2Callback';
import UserList from './components/UserList';
import MemberForm from './components/MemberForm';
const ChatDashboard = lazy(() => import('./components/ChatDashboard'));
import ChatStats from './components/ChatStats';
import ChatRoom from './components/ChatRoom';
import MessageInput from './components/MessageInput';
import ChatButton from './components/ChatButton';
import Modal from './components/Modal';
import PoseDetector from './components/pose-detection/PoseDetector';
import AuthGuard from './components/AuthGuard';
import { UserProvider } from './context/UserContext';

// 새로운 페이지 컴포넌트들
import OnboardingExperience from './components/onboarding/OnboardingExperience';
import OnboardingGoal from './components/onboarding/OnboardingGoal';
import OnboardingBasicInfo from './components/onboarding/OnboardingBasicInfo';
// import OnboardingBodyInfo from './components/onboarding/OnboardingBodyInfo';
import OnboardingComplete from './components/onboarding/OnboardingComplete';
import WorkoutDetail from './components/workout/WorkoutDetail';
import BodyData from './components/analytics/BodyData';
import WorkoutStats from './components/analytics/WorkoutStats';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import Calendar from './components/Calendar';
import ExerciseTest from './components/ExerciseTest';
import ExerciseInformation from './components/workout/ExerciseInformation';
import Analytics from './components/analytics/WorkoutStats';
import RecordsRoom from './components/profile/RecordsRoom';
import BodyRecordForm from './components/profile/BodyRecordForm';
import ScrollToTop from './components/ScrollToTop';
import NotificationCenter from './components/NotificationCenter';

function AppRoutes() {
  const location = useLocation();
  const publicRoutePrefixes = [
    '/login',
    '/signup',
    '/auth/callback',
    '/onboarding/experience',
    '/onboarding/goal',
    '/onboarding/basic-info',
    '/onboarding/complete'
  ];
  const isPublicRoute = publicRoutePrefixes.some((prefix) => location.pathname.startsWith(prefix));

  return (
    <div className={`container ${isPublicRoute ? 'no-sidebar' : ''}`}>
      <Routes>
        {/* 공개 페이지들 (인증 불필요) */}
        <Route path="/login" element={<MemberForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/auth/callback" element={<OAuth2Callback />} />
        {/* 온보딩 페이지들 (인증 불필요) */}
        <Route path="/onboarding/experience" element={<OnboardingExperience />} />
        <Route path="/onboarding/goal" element={<OnboardingGoal />} />
        <Route path="/onboarding/basic-info" element={<OnboardingBasicInfo />} />
        {/* <Route path="/onboarding/body-info" element={<OnboardingBodyInfo />} /> */}
        <Route path="/onboarding/complete" element={<OnboardingComplete />} />
        {/* 인증이 필요한 페이지들 */}
        <Route path="/" element={
          <AuthGuard requireAuth={true}>
            <Dashboard />
          </AuthGuard>
        } />
        <Route path="/chat" element={
          <AuthGuard requireAuth={true}>
            <ChatPage onClose={() => window.history.back()} isModal={false} />
          </AuthGuard>
        } />
        <Route path="/motion" element={
          <AuthGuard requireAuth={true}>
            <MotionCoach />
          </AuthGuard>
        } />
        <Route path="/users" element={
          <AuthGuard requireAuth={true}>
            <UserList />
          </AuthGuard>
        } />
        <Route path="/chat-dashboard" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<div>Loading Chat Dashboard...</div>}>
              <ChatDashboard />
            </Suspense>
          </AuthGuard>
        } />
        <Route path="/chat-stats" element={
          <AuthGuard requireAuth={true}>
            <ChatStats />
          </AuthGuard>
        } />
        <Route path="/chat-room" element={
          <AuthGuard requireAuth={true}>
            <ChatRoom />
          </AuthGuard>
        } />
        <Route path="/message-input" element={
          <AuthGuard requireAuth={true}>
            <MessageInput />
          </AuthGuard>
        } />
        <Route path="/chat-button" element={
          <AuthGuard requireAuth={true}>
            <ChatButton />
          </AuthGuard>
        } />
        <Route path="/modal" element={
          <AuthGuard requireAuth={true}>
            <Modal />
          </AuthGuard>
        } />
        <Route path="/pose-detector" element={
          <AuthGuard requireAuth={true}>
            <PoseDetector />
          </AuthGuard>
        } />
        {/* 새로운 페이지들 (인증 필요) */}
        <Route path="/programs" element={
          <AuthGuard requireAuth={true}>
            <ExerciseInformation />
          </AuthGuard>
        } />
        <Route path="/programs/:id" element={
          <AuthGuard requireAuth={true}>
            <WorkoutDetail />
          </AuthGuard>
        } />
        <Route path="/analytics/body" element={
          <AuthGuard requireAuth={true}>
            <BodyData />
          </AuthGuard>
        } />
        <Route path="/analytics/stats" element={
          <AuthGuard requireAuth={true}>
            <Analytics />
          </AuthGuard>
        } />
        <Route path="/profile" element={
          <AuthGuard requireAuth={true}>
            <Profile />
          </AuthGuard>
        } />
        <Route path="/settings" element={
          <AuthGuard requireAuth={true}>
            <Settings />
          </AuthGuard>
        } />
        <Route path="/calendar" element={
          <AuthGuard requireAuth={true}>
            <Calendar />
          </AuthGuard>
        } />
        <Route path="/records-room" element={
          <AuthGuard requireAuth={true}>
            <RecordsRoom />
          </AuthGuard>
        } />
        <Route path="/body-records/new" element={
          <AuthGuard requireAuth={true}>
            <BodyRecordForm />
          </AuthGuard>
        } />
        <Route path="/notifications" element={
          <AuthGuard requireAuth={true}>
            <NotificationCenter />
          </AuthGuard>
        } />
        {/* 운동 API 테스트 페이지 (개발용) */}
        <Route path="/exercise-test" element={<ExerciseTest />} />
        {/* 기본 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <Router>
        <ScrollToTop />
        <div className="app-wrapper">
          <AppRoutes />
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;
