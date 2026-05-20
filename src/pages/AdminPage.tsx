import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { ShieldAlert, Trash2, User, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function AdminPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPosts = onSnapshot(collection(db, "posts"), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    setLoading(false);
    return () => { unsubUsers(); unsubPosts(); };
  }, [profile]);

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, "posts", id));
      toast.success("Post moderated/deleted successfully.");
    } catch (err) {
      toast.error("Error deleting post.");
    }
  };

  if (profile?.role !== "admin") return <div className="p-12 text-center text-red-500 font-bold">Access Denied.</div>;

  return (
    <div className="space-y-8">
      <div className="bg-indigo-900 p-8 rounded-3xl text-white shadow-xl flex items-center gap-6">
         <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-10 h-10" />
         </div>
         <div>
            <h2 className="text-3xl font-bold">Administration Panel</h2>
            <p className="text-indigo-200 font-medium">Content moderation and user management</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Users list */}
         <div className="glass p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 uppercase tracking-widest text-xs">Registered Users ({users.length})</h3>
            <div className="space-y-3">
               {users.map(u => (
                 <div key={u.id} className="flex items-center justify-between p-3 bg-[var(--bg-app)]/50 rounded-xl border border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                       <div>
                          <p className="text-sm font-bold text-slate-800">{u.fullName}</p>
                          <p className="text-[10px] text-indigo-600 font-bold uppercase">{u.role}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Posts moderation */}
         <div className="glass p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 uppercase tracking-widest text-xs">Post Moderation ({posts.length})</h3>
            <div className="space-y-4">
               {posts.map(p => (
                 <div key={p.id} className="p-4 bg-[var(--bg-app)]/50 rounded-xl border border-[var(--glass-border)] space-y-3">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">{p.authorName}</span>
                       </div>
                       <button 
                         onClick={() => handleDeletePost(p.id)}
                         className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">"{p.content}"</p>
                 </div>
               ))}
               {posts.length === 0 && <p className="text-center py-6 text-slate-400 font-bold text-xs uppercase">No posts to moderate</p>}
            </div>
         </div>
      </div>
    </div>
  );
}
