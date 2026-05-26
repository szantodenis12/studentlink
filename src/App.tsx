import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth, UserProfile } from "./hooks/useAuth";
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

import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  GraduationCap, 
  Clock, 
  Award,
  Users,
  Calendar,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  UserCheck,
  BookOpen,
  ListTodo,
  ShieldCheck,
  User as UserIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./services/firebase";
import { Course, Assignment, Submission } from "./services/academicService";
import { Meeting } from "./services/communityService";
import { cn } from "./lib/utils";

// Dashboard Component
const Dashboard = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'modules' | 'tasks' | 'classmates' | 'index' | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // 1. All courses
    const unsubCourses = onSnapshot(collection(db, "courses"), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    });

    // 2. All profiles/users
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // 3. All meetings
    const unsubMeetings = onSnapshot(collection(db, "meetings"), (snap) => {
      setMeetings(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dateTime: data.dateTime?.toDate()
        } as any;
      }));
    });

    // 4. All assignments
    const unsubAssignments = onSnapshot(collection(db, "assignments"), (snap) => {
      setAssignments(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate()
        } as any;
      }));
    });

    // 5. This student's submissions
    const qSub = query(collection(db, "submissions"), where("studentId", "==", profile.uid));
    const unsubSubmissions = onSnapshot(qSub, (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
    });

    return () => {
      unsubCourses();
      unsubUsers();
      unsubMeetings();
      unsubAssignments();
      unsubSubmissions();
    };
  }, [profile?.uid]);

  // Enrolled Courses derived
  const enrolledCourseIds = profile?.academicData?.enrolledCourses || [];
  const enrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const activeCoursesCount = enrolledCourses.length;

  // Classmates: share at least one course and role is student
  const classmates = users.filter(u => {
    if (u.uid === profile?.uid || u.role !== 'student') return false;
    const otherEnrolled = u.academicData?.enrolledCourses || [];
    return otherEnrolled.some(courseId => enrolledCourseIds.includes(courseId));
  });

  // Critical Tasks derived
  const enrolledCourseAssignments = assignments.filter(a => enrolledCourseIds.includes(a.courseId));
  const submittedAssignmentIds = submissions.map(s => s.assignmentId);
  const pendingAssignments = enrolledCourseAssignments.filter(a => !submittedAssignmentIds.includes(a.id));

  const upcomingMeetings = meetings.filter(m => {
    const isParticipant = m.participants?.includes(profile?.uid || "");
    const isFuture = m.dateTime ? new Date(m.dateTime).getTime() > Date.now() : false;
    return isParticipant && isFuture;
  });

  const criticalTasksCount = pendingAssignments.length + upcomingMeetings.length;

  // Academic Index dynamic calculations
  const gradedSubs = submissions.filter(s => s.status === 'graded' && typeof s.grade === 'number');
  const profileGrades = profile?.academicData?.grades || {};
  const profileGradeValues = Object.values(profileGrades);

  let averageGrade = 0;
  if (gradedSubs.length > 0) {
    averageGrade = gradedSubs.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubs.length;
  } else if (profileGradeValues.length > 0) {
    averageGrade = profileGradeValues.reduce((sum, val) => sum + val, 0) / profileGradeValues.length;
  } else {
    averageGrade = 10.0; // Baseline default
  }

  const totalAssignmentsCount = enrolledCourseAssignments.length;
  const completedAssignmentsCount = submissions.length;
  const completionRate = totalAssignmentsCount > 0 
    ? completedAssignmentsCount / totalAssignmentsCount 
    : 1.0;

  const meetingsJoined = meetings.filter(m => m.participants?.includes(profile?.uid || "")).length;
  const attendanceScore = Math.min(10.0, 9.0 + (meetingsJoined * 0.25));

  const compositeIndex = (averageGrade * 0.5) + (completionRate * 10 * 0.3) + (attendanceScore * 0.2);
  const formattedIndex = compositeIndex.toFixed(2);

  // Dynamic Percentile
  const studentIndices = users
    .filter(u => u.role === 'student')
    .map(u => {
      const uGrades = u.academicData?.grades || {};
      const uGradeValues = Object.values(uGrades);
      const uAvgGrade = uGradeValues.length > 0 
        ? uGradeValues.reduce((a, b) => a + b, 0) / uGradeValues.length 
        : 10.0;
      
      const uEnrolled = u.academicData?.enrolledCourses || [];
      const uTotalAssigns = assignments.filter(a => uEnrolled.includes(a.courseId)).length;
      const uCompletion = uTotalAssigns > 0 ? 0.8 : 1.0; 

      const uMeetingsJoined = meetings.filter(m => m.participants?.includes(u.uid)).length;
      const uAttendance = Math.min(10.0, 9.0 + (uMeetingsJoined * 0.25));

      return (uAvgGrade * 0.5) + (uCompletion * 10 * 0.3) + (uAttendance * 0.2);
    });

  let percentile = 15; 
  if (studentIndices.length > 0) {
    const higherOrEqual = studentIndices.filter(ind => ind >= compositeIndex).length;
    percentile = Math.max(1, Math.round((higherOrEqual / studentIndices.length) * 100));
  }

  // Dynamic Prediction
  const upcomingAssignment = pendingAssignments
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  
  let predictionText = "We predict a strong success rate for your next academic evaluations.";
  if (upcomingAssignment) {
    const relatedCourse = enrolledCourses.find(c => c.id === upcomingAssignment.courseId);
    const courseTitle = relatedCourse ? relatedCourse.title : "upcoming";
    const successRate = Math.round(compositeIndex * 10);
    predictionText = `We calculate a ${successRate}% confidence success prediction for the upcoming "${upcomingAssignment.title}" assignment in "${courseTitle}".`;
  } else if (enrolledCourses.length > 0) {
    const randomCourse = enrolledCourses[0];
    predictionText = `We calculate a ${Math.round(compositeIndex * 10)}% confidence score for your active track in "${randomCourse.title}".`;
  }

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

          <div 
            className="flex flex-col items-center lg:items-end gap-6 glass p-8 rounded-[3rem] backdrop-blur-sm border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
            onClick={() => setActiveDetailTab(activeDetailTab === 'classmates' ? null : 'classmates')}
          >
            <div className="flex -space-x-4">
              {classmates.slice(0, 4).map((c) => (
                <div
                  key={c.uid}
                  className="w-14 h-14 rounded-2xl border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-white font-bold overflow-hidden shadow-2xl relative hover:scale-110 transition-transform"
                  title={c.fullName}
                >
                  <img
                    src={c.photoURL || `https://picsum.photos/seed/${c.uid}/128/128`}
                    alt={c.fullName}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                  />
                </div>
              ))}
              {classmates.length > 4 && (
                <div className="w-14 h-14 rounded-2xl border-4 border-slate-900 bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-2xl relative z-10">
                  +{classmates.length - 4}
                </div>
              )}
              {classmates.length === 0 && (
                <div className="w-14 h-14 rounded-2xl border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-indigo-400 text-xs font-bold shadow-2xl">
                  0
                </div>
              )}
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
            id: "modules" as const,
            label: "Active Modules",
            value: activeCoursesCount,
            icon: GraduationCap,
            color: "indigo",
            delay: 0.1,
          },
          {
            id: "tasks" as const,
            label: "Critical Tasks",
            value: criticalTasksCount,
            icon: Clock,
            color: "amber",
            delay: 0.2,
          },
          {
            id: "index" as const,
            label: "Academic Index",
            value: formattedIndex,
            icon: Award,
            color: "violet",
            delay: 0.3,
          },
        ].map((stat) => (
          <motion.button
            key={stat.id}
            variants={item}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveDetailTab(activeDetailTab === stat.id ? null : stat.id)}
            className={cn(
              "glass p-6 rounded-[2rem] relative group cursor-pointer text-left w-full border transition-all",
              activeDetailTab === stat.id 
                ? "border-indigo-500 bg-indigo-500/10 shadow-glow-indigo" 
                : "border-white/5 hover:border-indigo-500/25"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-glow-sm mb-4",
                activeDetailTab === stat.id
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 group-hover:bg-slate-800 group-hover:text-white"
              )}
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
              className={cn(
                "absolute bottom-10 right-10 w-1.5 h-1.5 rounded-full transition-all",
                activeDetailTab === stat.id 
                  ? "bg-indigo-400 animate-ping shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                  : "bg-indigo-500 shadow-glow-indigo"
              )}
            />
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeDetailTab && (
          <motion.div
            key={activeDetailTab}
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="glass rounded-[2.5rem] p-8 border border-indigo-500/20 shadow-glow-indigo/5 overflow-hidden"
          >
            {activeDetailTab === 'modules' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-xl font-black text-white tracking-tight uppercase">Active Enrolled Modules</h4>
                    <p className="text-xs text-indigo-200/60 font-medium">Your current universe of enrolled academic courses.</p>
                  </div>
                  <GraduationCap className="w-8 h-8 text-indigo-400 opacity-80" />
                </div>
                
                {enrolledCourses.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium">
                    You are not enrolled in any courses yet. Explore the{" "}
                    <Link to="/academic" className="text-indigo-400 hover:underline">Academic</Link> page.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enrolledCourses.map((c) => (
                      <Link
                        key={c.id}
                        to={`/academic/${c.id}`}
                        className="glass p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 transition-all group flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="font-black text-white uppercase tracking-tight text-sm group-hover:text-indigo-400 transition-colors">
                              {c.title}
                            </h5>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-xs text-slate-400 font-medium line-clamp-2">
                            {c.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Prof. {c.professorName}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-xl font-black text-white tracking-tight uppercase">Critical Tasks & Agenda</h4>
                    <p className="text-xs text-indigo-200/60 font-medium">Urgent assignments and registered study meetups.</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-400 opacity-80" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Col: Pending Assignments */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      Pending Homework ({pendingAssignments.length})
                    </h5>
                    
                    {pendingAssignments.length === 0 ? (
                      <div className="glass p-5 rounded-2xl text-center text-slate-400 text-xs font-medium border border-white/5">
                        No pending homework! You are completely up to date.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingAssignments.map(a => {
                          const course = enrolledCourses.find(c => c.id === a.courseId);
                          return (
                            <Link
                              key={a.id}
                              to={`/academic/${a.courseId}`}
                              className="glass p-4 rounded-xl border border-white/5 hover:border-amber-500/30 hover:bg-white/5 transition-all block"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <h6 className="font-bold text-white text-xs uppercase tracking-tight line-clamp-1">{a.title}</h6>
                                <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest shrink-0">
                                  Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}
                                </span>
                              </div>
                              <p className="text-[10px] text-indigo-200/60 mt-1 uppercase font-black tracking-wider line-clamp-1">
                                Course: {course?.title || 'Unknown'}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Right Col: Joined Meetings */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Your Upcoming Sessions ({upcomingMeetings.length})
                    </h5>
                    
                    {upcomingMeetings.length === 0 ? (
                      <div className="glass p-5 rounded-2xl text-center text-slate-400 text-xs font-medium border border-white/5">
                        No upcoming sessions scheduled. Create or join one in the{" "}
                        <Link to="/community" className="text-violet-400 hover:underline">Community</Link>.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingMeetings.map(m => (
                          <Link
                            key={m.id}
                            to="/community"
                            className="glass p-4 rounded-xl border border-white/5 hover:border-violet-500/30 hover:bg-white/5 transition-all block"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <h6 className="font-bold text-white text-xs uppercase tracking-tight line-clamp-1">{m.title}</h6>
                              <span className="text-[8px] font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 uppercase tracking-widest shrink-0">
                                {m.dateTime ? new Date(m.dateTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              <span>Type: {m.type}</span>
                              <span className="truncate max-w-[120px]">Loc: {m.location}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'classmates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-xl font-black text-white tracking-tight uppercase">Classmate Connections</h4>
                    <p className="text-xs text-indigo-200/60 font-medium">Students enrolled in your courses. Collaborative study triggers success.</p>
                  </div>
                  <Users className="w-8 h-8 text-indigo-400 opacity-80" />
                </div>
                
                {classmates.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium">
                    No classmates detected. Once other students enroll in the same courses, they will appear here!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {classmates.map(c => {
                      const otherEnrolled = c.academicData?.enrolledCourses || [];
                      const sharedCourseNames = enrolledCourses
                        .filter(course => otherEnrolled.includes(course.id))
                        .map(course => course.title);
                      
                      return (
                        <div
                          key={c.uid}
                          className="glass p-5 rounded-2xl border border-white/5 flex gap-4 hover:border-indigo-500/30 transition-all hover:bg-white/5 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden relative shrink-0">
                            <img
                              src={c.photoURL || `https://picsum.photos/seed/${c.uid}/128/128`}
                              alt={c.fullName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="font-bold text-white text-xs truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                              {c.fullName}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate uppercase font-medium">
                              {c.specialization || "Student"}
                            </p>
                            <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                              Shared Courses: {sharedCourseNames.length > 0 ? sharedCourseNames.slice(0, 2).join(', ') : 'None'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'index' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-xl font-black text-white tracking-tight uppercase">Academic Index Metrics</h4>
                    <p className="text-xs text-indigo-200/60 font-medium">Augmented performance indicators tracking your academic trajectory.</p>
                  </div>
                  <Award className="w-8 h-8 text-violet-400 opacity-80" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Grade Score card */}
                  <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Evaluation Score</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight font-display uppercase">
                      {averageGrade.toFixed(2)} <span className="text-xs text-slate-400">/ 10</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Averaged dynamically from all graded homework submissions and portfolio credentials.
                    </p>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${averageGrade * 10}%` }}
                        className="h-full bg-emerald-500" 
                      />
                    </div>
                  </div>
                  
                  {/* Completion rate card */}
                  <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Homework Completion</span>
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight font-display uppercase">
                      {Math.round(completionRate * 100)}%
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Rate of submitted tasks ({completedAssignmentsCount}) vs total course assignments ({totalAssignmentsCount}).
                    </p>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completionRate * 100}%` }}
                        className="h-full bg-indigo-500" 
                      />
                    </div>
                  </div>
                  
                  {/* Attendance card */}
                  <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cooperative Index</span>
                      <UserCheck className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight font-display uppercase">
                      {Math.round(attendanceScore * 10)}%
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Calculated from study node collaboration, workshop attendance, and forum participation.
                    </p>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${attendanceScore * 10}%` }}
                        className="h-full bg-violet-500" 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Index calculation explainer */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                  <div className="text-2xl font-black text-indigo-400 shrink-0 font-display">Formula</div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Composite Academic Index is computed in real-time by weighting **Evaluation Score (50%)**, **Homework Completion (30%)**, and **Cooperative Presence (20%)**. Keep your indicators high to top the community leaderboards!
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                  <span className="text-[var(--text-main)] font-black">{percentile}%</span> based on
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
                  {predictionText}
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
             <div className="p-8 glass bg-[var(--bg-app)]/60 rounded-[3rem] shadow-xl">
              <p className="text-4xl font-black text-indigo-600 mb-1 dark:text-indigo-400">
                {courses.length}
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Active Units
              </p>
            </div>
            <div className="p-8 glass bg-[var(--bg-app)]/60 rounded-[3rem] shadow-xl">
              <p className="text-4xl font-black text-violet-600 mb-1 dark:text-violet-400">
                {meetings.length}
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Study Nodes
              </p>
            </div>
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
