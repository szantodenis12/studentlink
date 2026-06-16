import React, { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { 
  ShieldAlert, 
  Trash2, 
  User, 
  CheckCircle, 
  GraduationCap, 
  BookOpen, 
  MessageSquare, 
  Users 
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function AdminPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPosts = onSnapshot(collection(db, "posts"), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCourses = onSnapshot(collection(db, "courses"), (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    setLoading(false);
    return () => { 
      unsubUsers(); 
      unsubPosts(); 
      unsubCourses(); 
    };
  }, [profile]);

  const handleDeletePost = async (id: string) => {
    if (window.confirm("Are you sure you want to delete/moderate this post?")) {
      try {
        await deleteDoc(doc(db, "posts", id));
        toast.success("Post moderated and deleted successfully.");
      } catch (err) {
        toast.error("Error deleting post.");
      }
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === profile?.uid) {
      toast.error("You cannot delete your own administrator account.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action is irreversible.`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast.success(`User "${userName}" deleted successfully.`);
      } catch (err) {
        toast.error("Error deleting user.");
      }
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (window.confirm(`Are you sure you want to delete course "${courseTitle}" and all its materials?`)) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        toast.success(`Course "${courseTitle}" deleted successfully.`);
      } catch (err) {
        toast.error("Error deleting course.");
      }
    }
  };

  if (profile?.role !== "admin") {
    return <div className="p-12 text-center text-red-500 font-black tracking-widest uppercase">Access Denied.</div>;
  }

  // Calculate platform metrics
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalProfessors = users.filter(u => u.role === "professor").length;
  const totalCourses = courses.length;
  const totalPosts = posts.length;

  const stats = [
    { label: "Students", value: totalStudents, icon: GraduationCap, color: "from-blue-500/10 to-indigo-500/10", textColor: "text-indigo-400" },
    { label: "Professors", value: totalProfessors, icon: BookOpen, color: "from-emerald-500/10 to-teal-500/10", textColor: "text-emerald-400" },
    { label: "Active Courses", value: totalCourses, icon: Users, color: "from-violet-500/10 to-fuchsia-500/10", textColor: "text-violet-400" },
    { label: "Community Posts", value: totalPosts, icon: MessageSquare, color: "from-amber-500/10 to-orange-500/10", textColor: "text-amber-400" }
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform">
          <ShieldAlert className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-indigo-400 shadow-glow">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight font-display">Administration Hub</h2>
            <p className="text-indigo-200/60 font-semibold text-sm mt-1">Platform moderation, data management and global system parameters.</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={stat.label}
            className={`glass p-6 rounded-[2.2rem] border border-white/5 bg-gradient-to-br ${stat.color} flex items-center justify-between shadow-sm`}
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-[var(--text-main)] tracking-tight">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl glass flex items-center justify-center ${stat.textColor}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Moderation Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Users list */}
        <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col h-[580px]">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">User Management</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Moderate or delete registered user profiles.</p>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white/[0.02] dark:bg-black/[0.15] rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                    {u.fullName?.charAt(0) || <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[var(--text-main)] truncate uppercase tracking-tight">{u.fullName}</p>
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{u.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {u.id !== profile?.uid && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.fullName)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {u.id === profile?.uid && (
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-wider">You</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Moderation */}
        <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col h-[580px]">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Course Moderation</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Review and moderate active academic modules.</p>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {courses.map(c => (
              <div key={c.id} className="p-4 bg-white/[0.02] dark:bg-black/[0.15] rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-tight truncate">{c.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-medium">Instructor: {c.professorName}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteCourse(c.id, c.title)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Delete Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{c.description}</p>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-center py-20 text-slate-400 font-bold text-xs uppercase tracking-widest opacity-60">No courses available</p>
            )}
          </div>
        </div>

        {/* Posts moderation */}
        <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col h-[580px]">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Post Moderation</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Moderate and delete community feed messages.</p>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {posts.map(p => (
              <div key={p.id} className="p-4 bg-white/[0.02] dark:bg-black/[0.15] rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight truncate">{p.authorName}</span>
                  </div>
                  <button 
                    onClick={() => handleDeletePost(p.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">"{p.content}"</p>
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-center py-20 text-slate-400 font-bold text-xs uppercase tracking-widest opacity-60">No posts to moderate</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
