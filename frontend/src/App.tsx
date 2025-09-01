import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import MemberForm from '@features/authentication/components/MemberForm';
const Dashboard = lazy(() => import('./features/dashboard/components/Dashboard'));
const ChatPage = lazy(() => import('@features/chat/components/ChatPage'));
const MotionCoach = lazy(() => import('@features/workout/components/MotionCoach'));
const SignupForm = lazy(() => import('@features/authentication/components/SignupForm'));
const OAuth2Callback = lazy(() => import('@features/authentication/components/OAuth2Callback'));
const UserList = lazy(() => import('@features/chat/components/UserList'));
const ChatDashboard = lazy(() => import('@features/chat/components/ChatDashboard'));
const ChatStats = lazy(() => import('@features/chat/components/ChatStats'));
const ChatRoom = lazy(() => import('@features/chat/components/ChatRoom'));
const MessageInput = lazy(() => import('@features/chat/components/MessageInput'));
const ChatButton = lazy(() => import('@features/chat/components/ChatButton'));
import Modal from '@components/ui/Modal';
const PoseDetector = lazy(() => import('@features/pose-detection/components/PoseDetector'));
import AuthGuard from '@features/authentication/components/AuthGuard';
import { UserProvider } from '@context/UserContext';
import WorkoutProvider from '@context/WorkoutContext';

// 새로운 페이지 컴포넌트들
const OnboardingExperience = lazy(() => import('@features/onboarding/components/OnboardingExperience'));
const OnboardingGoal = lazy(() => import('@features/onboarding/components/OnboardingGoal'));
const OnboardingBasicInfo = lazy(() => import('@features/onboarding/components/OnboardingBasicInfo'));
// import OnboardingBodyInfo from './components/onboarding/OnboardingBodyInfo';
const OnboardingComplete = lazy(() => import('@features/onboarding/components/OnboardingComplete'));
const WorkoutDetail = lazy(() => import('@features/workout/components/WorkoutDetail'));
const BodyData = lazy(() => import('@features/analytics/components/BodyData'));
const WorkoutStats = lazy(() => import('@features/analytics/components/WorkoutStats'));
const Profile = lazy(() => import('@features/profile/components/Profile'));
const Settings = lazy(() => import('@features/settings/components/Settings'));
const Calendar = lazy(() => import('@features/calendar/components/Calendar'));
const ExerciseTest = lazy(() => import('@features/workout/components/ExerciseTest'));
const SpeechSynthesisTest = lazy(() => import('@features/dev-test/components/SpeechSynthesisTest')); // 음성 합성 테스트 페이지 임포트
const OAuthEnvironmentTest = lazy(() => import('@features/dev-test/components/OAuthEnvironmentTest')); // OAuth 환경 테스트 페이지 임포트
const MediaPipeTest = lazy(() => import('@features/dev-test/components/MediaPipeTest')); // MediaPipe 테스트 페이지 임포트
const ExerciseInformation = lazy(() => import('@features/workout/components/ExerciseInformation'));
const Analytics = lazy(() => import('@features/analytics/components/WorkoutStats'));
const RecordsRoom = lazy(() => import('@features/profile/components/RecordsRoom'));
const BodyRecordForm = lazy(() => import('@features/profile/components/BodyRecordForm'));
const ProfileEdit = lazy(() => import('@features/profile/components/ProfileEdit'));
import ScrollToTop from '@components/ui/ScrollToTop';
const NotificationCenter = lazy(() => import('@features/notifications/components/NotificationCenter'));
const WorkoutProgramSelector = lazy(() => import('@features/workout/components/WorkoutProgramSelector'));
const IntegratedWorkoutSession = lazy(() => import('@features/workout/components/IntegratedWorkoutSession'));

const Loading = <div>Loading...</div>;

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
      <Suspense fallback={Loading}>
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
            <WorkoutProvider>
              <MotionCoach />
            </WorkoutProvider>
          </AuthGuard>
        } />
        <Route path="/users" element={
          <AuthGuard requireAuth={true}>
            <UserList users={[]} currentUser={null} onSelectUser={() => {}} unreadCounts={new Map()} />
          </AuthGuard>
        } />
        <Route path="/chat-dashboard" element={
          <AuthGuard requireAuth={true}>
            <ChatDashboard />
          </AuthGuard>
        } />
        <Route path="/chat-stats" element={
          <AuthGuard requireAuth={true}>
            <ChatStats onlineUsers={0} totalMessages={0} />
          </AuthGuard>
        } />
        <Route path="/chat-room" element={
          <AuthGuard requireAuth={true}>
            <ChatRoom currentUser={null} messages={[]} onSendMessage={() => {}} onBack={() => {}} />
          </AuthGuard>
        } />
        <Route path="/message-input" element={
          <AuthGuard requireAuth={true}>
            <MessageInput value="" onChange={() => {}} onSend={() => {}} onKeyPress={() => {}} placeholder="" />
          </AuthGuard>
        } />
        <Route path="/chat-button" element={
          <AuthGuard requireAuth={true}>
            <ChatButton />
          </AuthGuard>
        } />
        <Route path="/modal" element={
          <AuthGuard requireAuth={true}>
            <Modal isOpen={false} onClose={() => {}} title="" message="" />
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
        <Route path="/profile/edit" element={
          <AuthGuard requireAuth={true}>
            <ProfileEdit />
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
        {/* 통합 워크아웃 시스템 라우트 */}
        <Route path="/workout/selector" element={
          <AuthGuard requireAuth={true}>
            <WorkoutProgramSelector />
          </AuthGuard>
        } />
        <Route path="/workout/integrated" element={
          <AuthGuard requireAuth={true}>
            <WorkoutProvider>
              <IntegratedWorkoutSession />
            </WorkoutProvider>
          </AuthGuard>
        } />
        {/* 개발용 테스트 페이지 */}
        <Route path="/exercise-test" element={<ExerciseTest />} />
        <Route path="/speech-test" element={<AuthGuard requireAuth={true}><SpeechSynthesisTest /></AuthGuard>} />
        <Route path="/oauth-test" element={<OAuthEnvironmentTest />} />
        <Route path="/mediapipe-test" element={<AuthGuard requireAuth={true}><MediaPipeTest /></AuthGuard>} />
        {/* 기본 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
