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
import GlobalTutorChat from '@/components/academy/tutor/GlobalTutorChat';
import { CelebrationHost } from '@/components/Celebration';
import AcronymTooltips from '@/components/AcronymTooltips';
import AppShell from '@/components/shell/AppShell';
import { TutorProvider } from '@/components/shell/TutorContext';
import { ThemeProvider } from '@/components/ThemeProvider';
// Eager: the first-paint / common entry pages. Everything heavy or secondary is
// lazy-loaded below so it doesn't bloat the initial bundle (the Three.js-backed
// Visual Lab and lab workspace especially). Lazy routes render inside the
// <Suspense> wrapper around <Routes>.
import Academy from './pages/Academy';
import AcademyTrack from './pages/AcademyTrack';
import CisspRoadmap from './pages/CisspRoadmap';
import Practice from './pages/Practice';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import Pricing from './pages/Pricing';

// Lazy (code-split): heavy (Three.js) or secondary routes.
const Home = React.lazy(() => import('./pages/Home'));
const Module = React.lazy(() => import('./pages/Module'));
const Lab = React.lazy(() => import('./pages/Lab'));
const Admin = React.lazy(() => import('./pages/admin/Admin'));
const Roadmap = React.lazy(() => import('./pages/Roadmap'));
const Challenge = React.lazy(() => import('./pages/Challenge'));
const Tracks = React.lazy(() => import('./pages/Tracks'));
const LearningPath = React.lazy(() => import('./pages/LearningPath'));
const RegistryEditor = React.lazy(() => import('./pages/RegistryEditor'));
const AcademyPlay = React.lazy(() => import('./pages/AcademyPlay'));
const AcademyLesson = React.lazy(() => import('./pages/AcademyLesson'));
const PathsIndex = React.lazy(() => import('./pages/academy/Paths').then((m) => ({ default: m.PathsIndex })));
const PathDetail = React.lazy(() => import('./pages/academy/Paths').then((m) => ({ default: m.PathDetail })));
const CoursesIndex = React.lazy(() => import('./pages/academy/Courses').then((m) => ({ default: m.CoursesIndex })));
const CourseDetail = React.lazy(() => import('./pages/academy/Courses').then((m) => ({ default: m.CourseDetail })));
const ModuleDetail = React.lazy(() => import('./pages/academy/Courses').then((m) => ({ default: m.ModuleDetail })));
const LessonView = React.lazy(() => import('./pages/academy/LessonView'));
const Badges = React.lazy(() => import('./pages/academy/Badges'));
const PracticeExam = React.lazy(() => import('./pages/academy/PracticeExam'));
const SecplusPracticeExam = React.lazy(() => import('./pages/academy/SecplusPracticeExam'));
const CertPracticeExam = React.lazy(() => import('./pages/academy/CertPracticeExam'));
const LabWorkspace = React.lazy(() => import('./pages/LabWorkspace'));
const LabLauncher = React.lazy(() => import('./pages/LabLauncher'));
const LabProgress = React.lazy(() => import('./pages/LabProgress'));

// Dev-only design system preview; not bundled into production builds.
const DesignSystem = import.meta.env.DEV ? React.lazy(() => import('./pages/DesignSystem')) : null;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-ink-3 border-t-ink-1 rounded-full animate-spin"></div>
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

  // Render the main app. Suspense covers the lazy (code-split) routes with a
  // centered spinner while a route chunk loads.
  return (
    <React.Suspense
      fallback={(
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-ink-3 border-t-ink-1 rounded-full animate-spin"></div>
        </div>
      )}
    >
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
      {/* Admin: Spencer-only, password-gated, direct URL only — never in the nav. */}
      <Route path="/admin" element={<Admin />} />
        <Route path="/tracks" element={<Tracks />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/learning-path" element={<LearningPath />} />
        <Route path="/registry" element={<RegistryEditor />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>

      {/* Public front door: the marketing landing. Signed-in visitors go straight to /app. */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Focus mode: lessons, quizzes, assessments, review and labs run full-screen, no navigation. */}
      <Route path="/labs" element={<LabLauncher />} />
      <Route path="/labs/progress" element={<LabProgress />} />
      <Route path="/labs/:labId" element={<LabWorkspace />} />
      <Route path="/academy/exam" element={<PracticeExam />} />
      <Route path="/academy/security-plus/exam" element={<SecplusPracticeExam />} />
      <Route path="/academy/cert/:certId/exam" element={<CertPracticeExam />} />
      <Route path="/academy/review" element={<AcademyPlay kind="review" />} />
      <Route path="/academy/:trackId/lesson/:deckId" element={<AcademyLesson />} />
      <Route path="/academy/:trackId/deck/:deckId" element={<AcademyPlay kind="deck" />} />
      <Route path="/academy/:trackId/boss/:tierId" element={<AcademyPlay kind="boss" />} />
      {DesignSystem && (
        <Route path="/design" element={<DesignSystem />} />
      )}
    </Routes>
    </React.Suspense>
  );
};


function App({ RouterComponent = Router, routerProps = {}, initialAuth }) {

  return (
    <ThemeProvider>
    <AuthProvider initialAuth={initialAuth}>
      <QueryClientProvider client={queryClientInstance}>
        <RouterComponent {...routerProps}>
          <ScrollToTop />
          <div className="relative isolate min-h-screen bg-background text-ink-1">
            <TutorProvider>
              {/* Last line of defence: a crash below here shows a message, not a blank page. */}
              <ErrorBoundary label="Page">
                <AuthenticatedApp />
              </ErrorBoundary>
              <ErrorBoundary label="Tutor">
                <GlobalTutorChat />
              </ErrorBoundary>
              <CelebrationHost />
              <ErrorBoundary label="Acronyms">
                <AcronymTooltips />
              </ErrorBoundary>
            </TutorProvider>
          </div>
        </RouterComponent>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App