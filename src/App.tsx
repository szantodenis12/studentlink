import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { SearchProvider } from "./context/SearchContext";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import AcademicPage from "./pages/AcademicPage";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import CommunityPage from "./pages/CommunityPage";
import MentorshipPage from "./pages/MentorshipPage";
import ProfilePage from "./pages/ProfilePage";
import OnboardingPage from "./pages/OnboardingPage";
import AdminPage from "./pages/AdminPage";
import { Toaster } from "sonner";

import { motion } from "motion/react";
import { Sparkles, GraduationCap, Clock, Award } from "lucide-react";

// Dashboard Component
const Dashboard = () => {
  const { profile } = useAuth();

  const activeCourses = profile?.academicData?.enrolledCourses?.length || 0;

  const grades = profile?.academicData?.grades || {};
  const gradeValues = Object.values(grades);
  const average =
    gradeValues.length > 0
      ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(2)
      : "0.00";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto"
    >
      <motion.div
        variants={item}
        className="relative group overflow-hidden rounded-[2.5rem] p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-black dark:from-black dark:via-slate-950 dark:to-indigo-950 shadow-[0_40px_100px_rgba(79,70,229,0.3)] dark:shadow-none" />
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-110 -rotate-12 group-hover:rotate-0">
          <Sparkles className="w-40 h-40 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="text-center lg:text-left space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 border border-white/5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />{" "}
              System Active
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-[1.1] font-display uppercase">
              Hello, <br />
              <span className="text-indigo-400">
                {profile?.fullName?.split(" ")[0]}
              </span>
            </h2>
            <p className="text-indigo-100/60 font-medium text-xl max-w-xl border-l-4 border-indigo-500/30 pl-6">
              Your StudentLink platform connection is active. All academic resources
              are prepared and ready for exploration.
            </p>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-6 glass p-8 rounded-[3rem] backdrop-blur-sm border border-white/5">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-2xl border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-white font-bold overflow-hidden shadow-2xl relative group-hover:scale-110 transition-transform"
                >
                  <img
                    src={`https://picsum.photos/seed/student${i}/128/128`}
                    alt=""
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                  />
                </div>
              ))}
              <div className="w-14 h-14 rounded-2xl border-4 border-slate-900 bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-2xl relative z-10">
                +142
              </div>
            </div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">
              Online Classmates
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "Active Modules",
            value: activeCourses,
            icon: GraduationCap,
            color: "indigo",
            delay: 0.1,
          },
          {
            label: "Critical Tasks",
            value: 0,
            icon: Clock,
            color: "amber",
            delay: 0.2,
          },
          {
            label: "Academic Index",
            value: average,
            icon: Award,
            color: "violet",
            delay: 0.3,
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -5, scale: 1.01 }}
            className="glass p-6 rounded-[2rem] relative group cursor-default"
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-slate-800 group-hover:text-white transition-all shadow-glow-sm`}
            >
              <stat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 pl-1">
              {stat.label}
            </h3>
            <div className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter font-display">
              {stat.value}
            </div>
            <div
              className={`absolute bottom-10 right-10 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-glow-indigo`}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="glass p-8 rounded-[2.5rem]">
          <h3 className="text-2xl font-black text-[var(--text-main)] mb-10 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-2xl dark:shadow-none shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            Smart Analysis
          </h3>
          <div className="space-y-8">
            <div className="p-6 glass bg-[var(--bg-app)]/60 rounded-[1.8rem] border border-[var(--glass-border)] flex gap-6 hover:shadow-xl transition-all group">
              <div className="w-3 h-3 rounded-full bg-violet-500 mt-2 shrink-0 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              <div>
                <p className="text-[11px] font-black text-violet-600 uppercase tracking-widest mb-2">
                  Percentile Performance
                </p>
                <p className="text-lg font-medium text-[var(--text-muted)] leading-relaxed">
                  You are in the elite segment of{" "}
                  <span className="text-[var(--text-main)] font-black">15%</span> based on
                  recent activity.
                </p>
              </div>
            </div>
            <div className="p-8 glass bg-[var(--bg-app)]/60 rounded-[2.5rem] border border-[var(--glass-border)] flex gap-6 hover:shadow-xl transition-all group">
              <div className="w-3 h-3 rounded-full bg-indigo-500 mt-2 shrink-0 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
              <div>
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2">
                  Evaluation Prediction
                </p>
                <p className="text-lg font-medium text-[var(--text-muted)] leading-relaxed">
                  We calculate a{" "}
                  <span className="text-[var(--text-main)] font-black">High</span> complexity
                  grade for the upcoming Math test.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] h-full flex flex-col justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 to-transparent pointer-events-none" />
          <h3 className="text-2xl font-black text-[var(--text-main)] mb-2 uppercase tracking-tighter relative z-10">
            StudentLink Network
          </h3>
          <p className="text-[var(--text-muted)] font-medium mb-10 text-lg max-w-sm mx-auto relative z-10">
            Collaborate, learn, and accelerate growth alongside the community.
          </p>
          <div className="grid grid-cols-2 gap-6 relative z-10">
             <button className="p-8 glass bg-[var(--bg-app)]/60 hover:bg-slate-800 dark:hover:bg-indigo-900/40 rounded-[3rem] transition-all group/btn shadow-xl">
              <p className="text-4xl font-black text-indigo-600 mb-1 dark:text-indigo-400 group-hover/btn:text-white transition-colors">
                1.2k
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover/btn:text-indigo-400 transition-colors">
                Active Units
              </p>
            </button>
            <button className="p-8 glass bg-[var(--bg-app)]/60 hover:bg-slate-800 dark:hover:bg-violet-900/40 rounded-[3rem] transition-all group/btn shadow-xl">
              <p className="text-4xl font-black text-violet-600 mb-1 dark:text-violet-400 group-hover/btn:text-white transition-colors">
                45+
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover/btn:text-violet-400 transition-colors">
                Study Nodes
              </p>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = window.location.pathname;

  if (loading)
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;

  // If profile is not setup and user is NOT on onboarding page, redirect to onboarding
  if (profile && !profile.profileSetup && location !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If profile IS setup and user IS on onboarding page, redirect to home
  if (profile && profile.profileSetup && location === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SearchProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academic"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AcademicPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academic/:courseId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CourseDetailsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/community"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CommunityPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mentorship"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MentorshipPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProfilePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdminPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SearchProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
