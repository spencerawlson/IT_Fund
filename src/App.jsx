import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import LiquidBackground from '@/components/academy/LiquidBackground';
import GlobalTutorChat from '@/components/academy/tutor/GlobalTutorChat';
import AppShell from '@/components/shell/AppShell';
import { TutorProvider } from '@/components/shell/TutorContext';
// Add page imports here
import Home from './pages/Home';
import Module from './pages/Module';
import Lab from './pages/Lab';
import Roadmap from './pages/Roadmap';
import Challenge from './pages/Challenge';
import Tracks from './pages/Tracks';
import LearningPath from './pages/LearningPath';
import RegistryEditor from './pages/RegistryEditor';
import Academy from './pages/Academy';
import AcademyTrack from './pages/AcademyTrack';
import AcademyPlay from './pages/AcademyPlay';
import CisspRoadmap from './pages/CisspRoadmap';
import AcademyLesson from './pages/AcademyLesson';
import { PathsIndex, PathDetail } from './pages/academy/Paths';
import { CoursesIndex, CourseDetail, ModuleDetail } from './pages/academy/Courses';
import LessonView from './pages/academy/LessonView';
import Badges from './pages/academy/Badges';
import PracticeExam from './pages/academy/PracticeExam';
import SecplusPracticeExam from './pages/academy/SecplusPracticeExam';
import Practice from './pages/Practice';
import LabWorkspace from './pages/LabWorkspace';
import LabLauncher from './pages/LabLauncher';
import LabProgress from './pages/LabProgress';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';

// Dev-only design system preview; not bundled into production builds.
const DesignSystem = import.meta.env.DEV ? React.lazy(() => import('./pages/DesignSystem')) : null;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Pages inside the app shell: one sidebar (desktop) / tab bar (mobile) navigation. */}
      <Route element={<AppShell />}>
        <Route path="/app" element={<Academy />} />
        <Route path="/academy" element={<Navigate to="/app" replace />} />
        <Route path="/academy/roadmap" element={<CisspRoadmap />} />
        <Route path="/academy/paths" element={<PathsIndex />} />
        <Route path="/academy/paths/:slug" element={<PathDetail />} />
        <Route path="/academy/courses" element={<CoursesIndex />} />
        <Route path="/academy/courses/:courseSlug" element={<CourseDetail />} />
        <Route path="/academy/courses/:courseSlug/:moduleSlug" element={<ModuleDetail />} />
        <Route path="/academy/lessons/:lessonId" element={<LessonView />} />
        <Route path="/academy/badges" element={<Badges />} />
        <Route path="/academy/:trackId" element={<AcademyTrack />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/library" element={<Home />} />
        <Route path="/module/:moduleId" element={<Module />} />
        <Route path="/lab" element={<Lab />} />
        <Route path="/tracks" element={<Tracks />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/learning-path" element={<LearningPath />} />
        <Route path="/registry" element={<RegistryEditor />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>

      {/* Public front door: the marketing landing. Signed-in visitors go straight to /app. */}
      <Route path="/" element={<Landing />} />

      {/* Focus mode: lessons, quizzes, assessments, review and labs run full-screen, no navigation. */}
      <Route path="/labs" element={<LabLauncher />} />
      <Route path="/labs/progress" element={<LabProgress />} />
      <Route path="/labs/:labId" element={<LabWorkspace />} />
      <Route path="/academy/exam" element={<PracticeExam />} />
      <Route path="/academy/security-plus/exam" element={<SecplusPracticeExam />} />
      <Route path="/academy/review" element={<AcademyPlay kind="review" />} />
      <Route path="/academy/:trackId/lesson/:deckId" element={<AcademyLesson />} />
      <Route path="/academy/:trackId/deck/:deckId" element={<AcademyPlay kind="deck" />} />
      <Route path="/academy/:trackId/boss/:tierId" element={<AcademyPlay kind="boss" />} />
      {DesignSystem && (
        <Route path="/design" element={<React.Suspense fallback={null}><DesignSystem /></React.Suspense>} />
      )}
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          {/* isolate: keeps the -z-10 background above the body but below every page. */}
          <div className="relative isolate min-h-screen text-white">
            <LiquidBackground />
            <TutorProvider>
              {/* Last line of defence: a crash below here shows a message, not a blank page. */}
              <ErrorBoundary label="Page">
                <AuthenticatedApp />
              </ErrorBoundary>
              <ErrorBoundary label="Tutor">
                <GlobalTutorChat />
              </ErrorBoundary>
            </TutorProvider>
          </div>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App