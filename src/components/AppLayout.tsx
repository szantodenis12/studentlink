import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  User, 
  LayoutDashboard, 
  Settings,
  Bell,
  LogOut,
  ShieldCheck,
  Search,
  ChevronRight,
  Zap,
  Trash2,
  CheckCircle2,
  Clock,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { useSearch } from "../context/SearchContext";
import { auth, db } from "../services/firebase";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { updateBookingStatus } from "../services/mentorshipService";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useEffect, useState, useRef } from "react";
import { getNotifications, markAsRead, markAllAsRead, Notification, deleteNotification, createNotification } from "../services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import logo from "../assets/logo.png";

interface LayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: LayoutProps) {
  const { profile, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [courses, setCourses] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time Firestore subscriptions for global search
  useEffect(() => {
    if (!user) return;

    const unsubCourses = onSnapshot(collection(db, "courses"), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qMentors = query(collection(db, "users"), where("role", "==", "professor"));
    const unsubMentors = onSnapshot(qMentors, (snap) => {
      setMentors(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    });

    const unsubMeetings = onSnapshot(collection(db, "meetings"), (snap) => {
      setMeetings(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dateTime: data.dateTime?.toDate()
        };
      }));
    });

    return () => {
      unsubCourses();
      unsubMentors();
      unsubMeetings();
    };
  }, [user]);

  // Click outside search dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchDropdown(true);
  };

  // Grouped search matches
  const queryNormalized = searchQuery.toLowerCase().trim();
  
  const matchedCourses = queryNormalized 
    ? courses.filter(c => 
        (c.title || "").toLowerCase().includes(queryNormalized) ||
        (c.description || "").toLowerCase().includes(queryNormalized) ||
        (c.professorName || "").toLowerCase().includes(queryNormalized) ||
        (c.skills || []).some((s: string) => (s || "").toLowerCase().includes(queryNormalized))
      )
    : [];

  const matchedMentors = queryNormalized 
    ? mentors.filter(m => 
        (m.fullName || "").toLowerCase().includes(queryNormalized) ||
        (m.bio || "").toLowerCase().includes(queryNormalized) ||
        (m.mentorshipSubjects || []).some((s: string) => (s || "").toLowerCase().includes(queryNormalized))
      )
    : [];

  const matchedMeetings = queryNormalized 
    ? meetings.filter(meet => 
        (meet.title || "").toLowerCase().includes(queryNormalized) ||
        (meet.description || "").toLowerCase().includes(queryNormalized) ||
        (meet.location || "").toLowerCase().includes(queryNormalized)
      )
    : [];

  const hasAnyMatches = matchedCourses.length > 0 || matchedMentors.length > 0 || matchedMeetings.length > 0;

  useEffect(() => {
    if (user) {
      const unsub = getNotifications(user.uid, setNotifications);
      return () => unsub();
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead(notifications);
    } catch (err) {
      toast.error("Error marking notifications as read.");
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
    } catch (err) {
      toast.error("Error deleting notification.");
    }
  };

  const handleAcceptBooking = async (e: React.MouseEvent, bookingId: string, notificationId: string) => {
    e.stopPropagation();
    try {
      const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
      if (!bookingDoc.exists()) {
        toast.error("Booking request not found.");
        return;
      }
      const bookingData = bookingDoc.data();
      
      await updateBookingStatus(bookingId, "confirmed");
      await deleteNotification(notificationId);
      
      await createNotification({
        userId: bookingData.studentId,
        title: "Mentorship Request Accepted",
        content: `Professor ${profile?.fullName} has accepted your mentorship request in ${bookingData.subject}! Go to Mentorship section to schedule your online meeting.`,
        type: 'booking_response',
        link: '/mentorship'
      });
      toast.success("Mentorship request accepted!");
    } catch (err) {
      toast.error("Error accepting mentorship request.");
    }
  };

  const handleDeclineBooking = async (e: React.MouseEvent, bookingId: string, notificationId: string) => {
    e.stopPropagation();
    try {
      const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
      if (!bookingDoc.exists()) {
        toast.error("Booking request not found.");
        return;
      }
      const bookingData = bookingDoc.data();
      
      await updateBookingStatus(bookingId, "rejected");
      await deleteNotification(notificationId);
      
      await createNotification({
        userId: bookingData.studentId,
        title: "Mentorship Request Declined",
        content: `Professor ${profile?.fullName} has declined your mentorship request in ${bookingData.subject}.`,
        type: 'booking_response',
        link: '/mentorship'
      });
      toast.success("Mentorship request declined.");
    } catch (err) {
      toast.error("Error declining mentorship request.");
    }
  };

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Academic", path: "/academic", icon: BookOpen },
    { name: "Community", path: "/community", icon: Users, studentOnly: true },
    { name: "Mentorship", path: "/mentorship", icon: GraduationCap },
    { name: "Profile", path: "/profile", icon: User },
  ];

  if (profile?.role === "admin") {
    menuItems.push({ name: "Admin", path: "/admin", icon: ShieldCheck });
  }

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex h-screen bg-[var(--bg-app)] font-sans text-[var(--text-main)] overflow-hidden transition-colors duration-300">
      {/* Global AI Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-violet-500/5 blur-[100px] rounded-full animate-pulse" />
      </div>

      {/* Premium Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 glass border-r border-[var(--glass-border)] flex flex-col shrink-0 relative z-40 transition-all duration-300"
      >
        <div className="p-6 pb-4">
          <Link to="/" className="flex items-center gap-3 group px-2">
            <img 
              src={logo} 
              alt="StudentLink Logo" 
              className="h-10 w-auto object-contain transition-all group-hover:scale-105" 
            />
          </Link>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System</p>
          {menuItems.map((item) => {
            if (item.studentOnly && profile?.role === "professor") return null;

            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSearchQuery("")}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-2xl dark:shadow-none font-bold" 
                    : "text-slate-500 hover:bg-[var(--bg-app)]/50 hover:text-indigo-600"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-none"
                  />
                )}
                <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110 relative z-10", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
                <span className="text-[13px] font-bold tracking-tight relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-5 mt-auto">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-indigo-700 rounded-[1.5rem] p-5 text-white relative overflow-hidden group shadow-2xl dark:shadow-none"
                >
                   <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-2xl group-hover:scale-150 transition-transform"></div>
              <div className="relative z-10">
                 <div className="flex items-center gap-2 text-indigo-200 font-black text-[9px] uppercase tracking-widest mb-2">
                    <Zap className="w-3 h-3 text-amber-400" /> Career Plus AI
                 </div>
                 <p className="text-white text-xs font-bold leading-relaxed mb-4">Find the ideal job using our algorithm.</p>
                 <Link to="/profile" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    START <ChevronRight className="w-3 h-3" />
                  </Link>
              </div>
           </motion.div>

           <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group"
               >
                 <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[13px] font-bold tracking-tight">Sign Out</span>
               </button>
           </div>
        </div>
      </motion.aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent overflow-auto relative custom-scrollbar">
        {/* Top Header Navigation */}
        <header className="h-16 glass border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-8 flex-1">
            <h1 className="text-2xl font-black text-[var(--text-main)] font-display tracking-tight hidden lg:block">
              {menuItems.find(i => i.path === location.pathname)?.name || "Page"}
            </h1>
            
             <div ref={dropdownRef} className="relative max-w-sm w-full group">
                <input 
                   ref={inputRef}
                   type="text" 
                   value={searchQuery}
                   onChange={handleSearchChange}
                   onFocus={() => setShowSearchDropdown(true)}
                   placeholder="Search in StudentLink..."
                   className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-[1.25rem] focus:bg-[var(--bg-app)] focus:border-indigo-500/20 focus:shadow-xl transition-all outline-none text-sm font-bold shadow-inner"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4 group-focus-within:text-indigo-600 transition-colors" />

               {searchQuery.trim() !== "" && showSearchDropdown && (
                 <div className="absolute top-full left-0 mt-3 w-full sm:w-[32rem] bg-[var(--bg-sidebar)] border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 z-50 max-h-[28rem] overflow-y-auto custom-scrollbar">
                   {!hasAnyMatches ? (
                     <div className="text-center py-8 text-[var(--text-muted)] font-medium">
                       Niciun rezultat găsit pentru <span className="text-indigo-600 dark:text-indigo-400 font-black">"{searchQuery}"</span>
                     </div>
                   ) : (
                     <div className="space-y-6">
                       {/* Cursuri */}
                       {matchedCourses.length > 0 && (
                         <div className="space-y-3">
                           <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] border-b border-[var(--glass-border)] pb-1.5">
                             <BookOpen className="w-3.5 h-3.5" />
                             Cursuri ({matchedCourses.length})
                           </div>
                           <div className="space-y-2">
                             {matchedCourses.map((c) => (
                               <button
                                 key={c.id}
                                 onClick={() => {
                                   setShowSearchDropdown(false);
                                   setSearchQuery("");
                                   navigate(`/academic/${c.id}`);
                                 }}
                                 className="w-full text-left p-4 hover:bg-indigo-500/10 rounded-2xl transition-all border border-transparent hover:border-indigo-500/20 flex flex-col gap-1 cursor-pointer"
                               >
                                 <div className="font-black text-xs text-[var(--text-main)] uppercase tracking-tight line-clamp-1">
                                   {c.title}
                                 </div>
                                 <div className="text-[10px] text-[var(--text-muted)] font-medium line-clamp-1">
                                   Prof. {c.professorName}
                                 </div>
                               </button>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* Mentori */}
                       {matchedMentors.length > 0 && (
                         <div className="space-y-3">
                           <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-[0.3em] border-b border-[var(--glass-border)] pb-1.5">
                             <GraduationCap className="w-3.5 h-3.5" />
                             Mentori ({matchedMentors.length})
                           </div>
                           <div className="space-y-2">
                             {matchedMentors.map((m) => (
                               <button
                                 key={m.uid}
                                 onClick={() => {
                                   setShowSearchDropdown(false);
                                   setSearchQuery("");
                                   navigate(`/mentorship`);
                                 }}
                                 className="w-full text-left p-4 hover:bg-amber-500/10 rounded-2xl transition-all border border-transparent hover:border-amber-500/20 flex flex-col gap-1 cursor-pointer"
                               >
                                 <div className="font-black text-xs text-[var(--text-main)] uppercase tracking-tight line-clamp-1">
                                   {m.fullName}
                                 </div>
                                 <div className="text-[10px] text-[var(--text-muted)] font-medium line-clamp-1">
                                   {m.specialization || "Professor"} • {m.mentorshipSubjects?.join(", ") || "Diverse discipline"}
                                 </div>
                               </button>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* Sesiuni de Studiu */}
                       {matchedMeetings.length > 0 && (
                         <div className="space-y-3">
                           <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-[0.3em] border-b border-[var(--glass-border)] pb-1.5">
                             <Users className="w-3.5 h-3.5" />
                             Sesiuni de Studiu ({matchedMeetings.length})
                           </div>
                           <div className="space-y-2">
                             {matchedMeetings.map((meet) => (
                               <button
                                 key={meet.id}
                                 onClick={() => {
                                   setShowSearchDropdown(false);
                                   setSearchQuery("");
                                   navigate(`/community`);
                                 }}
                                 className="w-full text-left p-4 hover:bg-violet-500/10 rounded-2xl transition-all border border-transparent hover:border-violet-500/20 flex flex-col gap-1 cursor-pointer"
                               >
                                 <div className="font-black text-xs text-[var(--text-main)] uppercase tracking-tight line-clamp-1">
                                   {meet.title}
                                 </div>
                                 <div className="text-[10px] text-[var(--text-muted)] font-medium line-clamp-1">
                                   Locație: {meet.location} • Tip: {meet.type}
                                 </div>
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={(e) => toggleTheme(e)}
                 className="p-3.5 rounded-2xl glass text-[var(--text-muted)] hover:text-indigo-600 transition-all shadow-sm"
               >
                 {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
               </motion.button>

              <div className="flex items-center gap-2 relative">
                <div className="relative">
                   <button 
                     onClick={() => setShowNotifications(!showNotifications)}
                     className={cn(
                       "p-3.5 rounded-2xl relative transition-all group overflow-hidden active:scale-90",
                       showNotifications ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-200" : "text-[var(--text-muted)] hover:text-indigo-600 hover:bg-[var(--glass-bg)] hover:shadow-xl"
                     )}
                   >
                     <Bell className="w-5 h-5 relative z-10" />
                     {unreadCount > 0 && (
                       <span className="absolute top-2 right-2 flex h-4 w-4 z-20">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-[var(--bg-app)] text-[8px] font-bold items-center justify-center text-white">
                           {unreadCount > 9 ? '9+' : unreadCount}
                         </span>
                       </span>
                     )}
                   </button>

                   <AnimatePresence>
                     {showNotifications && (
                       <>
                         <div 
                           className="fixed inset-0 z-40" 
                           onClick={() => setShowNotifications(false)}
                         />
                         <motion.div
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.95 }}
                           className="absolute top-16 right-0 w-[400px] glass bg-[var(--bg-sidebar)] rounded-[2.5rem] border border-[var(--glass-border)] shadow-[var(--card-shadow)] z-50 overflow-hidden"
                         >
                           <div className="p-8 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--bg-app)]/50">
                             <div>
                                <h3 className="font-display font-black text-[var(--text-main)] tracking-tight uppercase text-sm">Notifications</h3>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">System Active • {unreadCount} new</p>
                             </div>
                             {unreadCount > 0 && (
                               <button 
                                onClick={handleMarkAllRead}
                                className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white uppercase tracking-widest bg-[var(--bg-app)] hover:bg-indigo-600 px-4 py-2 rounded-xl border border-[var(--glass-border)] transition-all active:scale-95"
                               >
                                 Clear all
                               </button>
                             )}
                           </div>

                           <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                             {notifications.length > 0 ? (
                               notifications.map((n) => (
                                 <div 
                                   key={n.id}
                                   onClick={() => {
                                     if (!n.read) markAsRead(n.id);
                                     if (n.link) {
                                       setShowNotifications(false);
                                       navigate(n.link);
                                     }
                                   }}
                                   className={cn(
                                     "p-6 hover:bg-[var(--bg-app)] transition-all cursor-pointer flex gap-5 group relative border-b border-[var(--glass-border)] last:border-0",
                                     !n.read && "bg-indigo-50/20"
                                   )}
                                 >
                                   <div className={cn(
                                     "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                                     n.type === 'assignment' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                     n.type === 'grade' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                     n.type === 'message' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                     n.type === 'booking_request' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                     n.type === 'booking_response' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                     "bg-indigo-50 text-indigo-600 border-indigo-100"
                                   )}>
                                     {n.type === 'assignment' ? <CheckCircle2 className="w-6 h-6" /> :
                                      n.type === 'grade' ? <Zap className="w-6 h-6" /> :
                                      n.type === 'message' ? <Users className="w-6 h-6" /> :
                                      n.type === 'booking_request' || n.type === 'booking_response' ? <GraduationCap className="w-6 h-6" /> :
                                      <Bell className="w-6 h-6" />}
                                   </div>

                                   <div className="flex-1 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-black text-[var(--text-main)] text-xs uppercase tracking-tight leading-none">{n.title}</h4>
                                        {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-glow-indigo" />}
                                      </div>
                                      <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">{n.content}</p>
                                      <div className="flex items-center gap-2 pt-1">
                                        <Clock className="w-3 h-3 text-slate-300" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                          {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                        </span>
                                      </div>
                                      {n.type === 'booking_request' && n.bookingId && profile?.role === 'professor' && (
                                        <div className="flex items-center gap-3 pt-3">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleAcceptBooking(e, n.bookingId!, n.id); }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeclineBooking(e, n.bookingId!, n.id); }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-rose-500/20 cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" /> Decline
                                          </button>
                                        </div>
                                      )}
                                   </div>

                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteNotification(e, n.id); }}
                                     className="absolute right-4 bottom-4 p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               ))
                             ) : (
                                <div className="p-16 text-center">
                                   <div className="w-20 h-20 glass bg-[var(--bg-app)]/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)] border border-[var(--glass-border)] group">
                                      <Bell className="w-10 h-10 group-hover:rotate-12 transition-transform" />
                                   </div>
                                   <h4 className="text-[var(--text-muted)] font-black uppercase text-sm tracking-[0.2em]">Quiet</h4>
                                   <p className="text-[var(--text-muted)] text-xs mt-2 font-medium">You are up to date with all system data streams.</p>
                                </div>
                             )}
                           </div>

                           {notifications.length > 0 && (
                             <div className="p-5 bg-slate-50/50 border-t border-slate-100 text-center">
                                <button className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-indigo-600 transition-all">View all system history</button>
                             </div>
                           )}
                         </motion.div>
                       </>
                     )}
                   </AnimatePresence>
                </div>

                <div className="relative dropdown-parent">
                    <Link 
                      to="/profile"
                      className="p-3.5 text-[var(--text-muted)] hover:text-indigo-600 hover:bg-[var(--glass-bg)] hover:shadow-xl rounded-2xl transition-all active:scale-90 flex items-center justify-center"
                    >
                      <Settings className="w-5 h-5" />
                    </Link>
                </div>
              </div>

            <div className="h-10 w-px bg-[var(--glass-border)] mx-1"></div>
            
            <Link 
               to="/profile"
               className="flex items-center gap-4 glass bg-[var(--bg-app)]/50 p-1.5 pr-4 rounded-2xl border border-[var(--glass-border)] shadow-sm group hover:border-indigo-200 transition-all cursor-pointer"
             >
               <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border-2 border-[var(--glass-border)] overflow-hidden shadow-sm shrink-0">
                 {profile?.photoURL ? (
                   <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-black text-sm">
                     {profile?.fullName?.charAt(0)}
                   </div>
                 )}
               </div>
               <div className="text-left hidden sm:block">
                 <p className="text-sm font-extrabold text-[var(--text-main)] group-hover:text-indigo-700 transition-colors">{profile?.fullName}</p>
                 <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", profile?.role === 'professor' ? 'bg-indigo-500' : 'bg-green-500')}></div>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest leading-none">
                      {profile?.role === 'student' ? 'Student' : profile?.role === 'professor' ? 'Professor' : 'Admin'}
                    </p>
                 </div>
               </div>
             </Link>
          </div>
        </header>

        <section className="p-6 max-w-[1600px] mx-auto w-full">
          {children}
        </section>
      </main>
    </div>
  );
}
