import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AuthGuard from '../../components/AuthGuard';
import Modal from '../../components/Modal';
import LoginPage from '../../features/auth/pages/LoginPage';
import OAuthCallbackPage from '../../features/auth/pages/OAuthCallbackPage';
import SignupPage from '../../features/auth/pages/SignupPage';
import BodyAnalyticsPage from '../../features/analytics/pages/BodyAnalyticsPage';
import WorkoutStatsPage from '../../features/analytics/pages/WorkoutStatsPage';
import CalendarPage from '../../features/calendar/pages/CalendarPage';
import ChatButtonPage from '../../features/chat/pages/ChatButtonPage';
import ChatPage from '../../features/chat/pages/ChatPage';
import ChatRoomPage from '../../features/chat/pages/ChatRoomPage';
import ChatStatsPage from '../../features/chat/pages/ChatStatsPage';
import DashboardPage from '../../features/dashboard/pages/DashboardPage';
import MotionCoachPage from '../../features/motion/pages/MotionCoachPage';
import PoseDetectorPage from '../../features/motion/pages/PoseDetectorPage';
import NotificationCenterPage from '../../features/notifications/pages/NotificationCenterPage';
import OnboardingBasicInfoPage from '../../features/onboarding/pages/OnboardingBasicInfoPage';
import OnboardingCompletePage from '../../features/onboarding/pages/OnboardingCompletePage';
import OnboardingExperiencePage from '../../features/onboarding/pages/OnboardingExperiencePage';
import OnboardingGoalPage from '../../features/onboarding/pages/OnboardingGoalPage';
import BodyRecordFormPage from '../../features/profile/pages/BodyRecordFormPage';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import RecordsRoomPage from '../../features/profile/pages/RecordsRoomPage';
import SettingsPage from '../../features/settings/pages/SettingsPage';
import ExerciseTestPage from '../../features/support/pages/ExerciseTestPage';
import MotionSpeechHarnessPage from '../../features/support/pages/MotionSpeechHarnessPage';
import UserListPage from '../../features/chat/pages/UserListPage';
import ExerciseInformationPage from '../../features/workout/pages/ExerciseInformationPage';
import WorkoutDetailPage from '../../features/workout/pages/WorkoutDetailPage';

const ChatDashboardPage = lazy(() => import('../../features/chat/pages/ChatDashboardPage'));
const MessageInputPage = lazy(() => import('../../features/chat/pages/MessageInputPage'));

const publicRoutePrefixes = [
  '/login',
  '/signup',
  '/auth/callback',
  '/onboarding/experience',
  '/onboarding/goal',
  '/onboarding/basic-info',
  '/onboarding/complete',
  '/support/motion-speech',
];

export default function AppRoutes() {
  const location = useLocation();
  const isPublicRoute = publicRoutePrefixes.some((prefix) => location.pathname.startsWith(prefix));

  return (
    <div className={`container ${isPublicRoute ? 'no-sidebar' : ''}`}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/onboarding/experience" element={<OnboardingExperiencePage />} />
        <Route path="/onboarding/goal" element={<OnboardingGoalPage />} />
        <Route path="/onboarding/basic-info" element={<OnboardingBasicInfoPage />} />
        <Route path="/onboarding/complete" element={<OnboardingCompletePage />} />

        <Route path="/" element={<AuthGuard requireAuth={true}><DashboardPage /></AuthGuard>} />
        <Route path="/chat" element={<AuthGuard requireAuth={true}><ChatPage /></AuthGuard>} />
        <Route path="/motion" element={<AuthGuard requireAuth={true}><MotionCoachPage /></AuthGuard>} />
        <Route path="/users" element={<AuthGuard requireAuth={true}><UserListPage /></AuthGuard>} />
        <Route
          path="/chat-dashboard"
          element={
            <AuthGuard requireAuth={true}>
              <Suspense fallback={<div>Loading Chat Dashboard...</div>}>
                <ChatDashboardPage />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route path="/chat-stats" element={<AuthGuard requireAuth={true}><ChatStatsPage /></AuthGuard>} />
        <Route path="/chat-room" element={<AuthGuard requireAuth={true}><ChatRoomPage /></AuthGuard>} />
        <Route
          path="/message-input"
          element={
            <AuthGuard requireAuth={true}>
              <Suspense fallback={<div>Loading Message Input...</div>}>
                <MessageInputPage />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route path="/chat-button" element={<AuthGuard requireAuth={true}><ChatButtonPage /></AuthGuard>} />
        <Route path="/modal" element={<AuthGuard requireAuth={true}><Modal /></AuthGuard>} />
        <Route path="/pose-detector" element={<AuthGuard requireAuth={true}><PoseDetectorPage /></AuthGuard>} />
        <Route path="/programs" element={<AuthGuard requireAuth={true}><ExerciseInformationPage /></AuthGuard>} />
        <Route path="/programs/:id" element={<AuthGuard requireAuth={true}><WorkoutDetailPage /></AuthGuard>} />
        <Route path="/analytics/body" element={<AuthGuard requireAuth={true}><BodyAnalyticsPage /></AuthGuard>} />
        <Route path="/analytics/stats" element={<AuthGuard requireAuth={true}><WorkoutStatsPage /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard requireAuth={true}><ProfilePage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard requireAuth={true}><SettingsPage /></AuthGuard>} />
        <Route path="/calendar" element={<AuthGuard requireAuth={true}><CalendarPage /></AuthGuard>} />
        <Route path="/records-room" element={<AuthGuard requireAuth={true}><RecordsRoomPage /></AuthGuard>} />
        <Route path="/body-records/new" element={<AuthGuard requireAuth={true}><BodyRecordFormPage /></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard requireAuth={true}><NotificationCenterPage /></AuthGuard>} />
        <Route path="/exercise-test" element={<ExerciseTestPage />} />
        <Route path="/support/motion-speech" element={<MotionSpeechHarnessPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
