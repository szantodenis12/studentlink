import React, { useState, useEffect } from "react";
import { getMentors, bookSession, Booking } from "../services/mentorshipService";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { Search, Star, Calendar, DollarSign, GraduationCap, ChevronRight, Filter } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

export default function MentorshipPage() {
  const { profile } = useAuth();
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async (subject?: string) => {
    setLoading(true);
    try {
      const data = await getMentors(subject);
      setMentors(data);
    } catch (err) {
      toast.error("Eroare la încărcarea mentorilor.");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (mentor: UserProfile) => {
    if (!profile) return;
    
    try {
      await bookSession({
        mentorId: mentor.uid,
        mentorName: mentor.fullName,
        studentId: profile.uid,
        studentName: profile.fullName,
        subject: mentor.mentorshipSubjects?.[0] || "General",
        dateTime: new Date(Date.now() + 86400000), // Next day
        price: mentor.mentorshipPrice || 50
      });
      toast.success(`Cerere trimisă către ${mentor.fullName}!`);
    } catch (err) {
      toast.error("Eroare la rezervare.");
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 glass p-10 rounded-[3.5rem] shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 border-indigo-100">
             <Star className="w-3 h-3 fill-current" /> Expert Network
          </div>
          <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase font-display">Consultanță Academică Expertă</h2>
          <p className="text-sm font-medium text-[var(--text-muted)]">Găsește experți pentru succesul tău academic și profesional.</p>
        </div>
        
        <div className="relative w-full lg:w-[32rem] group">
          <input
            type="text"
            placeholder="Materia vizată... (ex: Matematică, Design, AI)"
            className="w-full pl-16 pr-24 py-6 glass rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none shadow-glow transition-all font-black text-sm uppercase tracking-tight placeholder:text-[var(--text-muted)] placeholder:tracking-normal group-hover:scale-[1.02]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMentors(search)}
          />
          <Search className="w-6 h-6 text-indigo-400 absolute left-6 top-5 group-focus-within:text-indigo-600 transition-colors" />
          <button 
            onClick={() => loadMentors(search)}
            className="absolute right-3 top-3 px-8 py-3 bg-slate-800 text-white rounded-[1.5rem] hover:bg-indigo-600 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Filtrare
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3].map(i => (
            <div key={i} className="h-96 glass rounded-[3.5rem] animate-pulse bg-[var(--bg-app)]/20 border border-[var(--glass-border)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {mentors.map((mentor) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={mentor.uid}
              className="glass rounded-[4rem] p-10 hover:shadow-glow-indigo transition-all group flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 group-hover:rotate-0 transition-transform">
                <GraduationCap className="w-48 h-48 text-indigo-600" />
              </div>

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="w-24 h-24 rounded-[2.5rem] glass border-4 border-white overflow-hidden shadow-2xl group-hover:scale-110 transition-transform relative">
                   {mentor.photoURL ? (
                     <img src={mentor.photoURL} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-indigo-700 font-black bg-indigo-50 text-3xl">
                       {mentor.fullName.charAt(0)}
                     </div>
                   )}
                </div>
                <div className="flex flex-col items-end gap-3">
                   <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold glass px-4 py-2 rounded-2xl text-[10px] uppercase tracking-widest border-indigo-100 shadow-sm">
                     <Star className="w-3.5 h-3.5 fill-current" />
                     {mentor.rating || "5.0"}
                   </div>
                   <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activ
                   </div>
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{mentor.fullName}</h3>
                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed border-l-2 border-indigo-100 pl-4 mb-6 line-clamp-3">
                  {mentor.bio || "Consultant academic expert, specializat în optimizarea proceselor de învățare și dezvoltare personală."}
                </p>
                
                <div className="flex flex-wrap gap-2 pt-4">
                  {(mentor.mentorshipSubjects || ["General"]).map(s => (
                    <span key={s} className="px-4 py-2 glass text-[var(--text-main)] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-10 border-t border-white/50 flex items-center justify-between relative z-10">
                <div>
                   <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Rată / Sesiune</p>
                   <p className="text-2xl font-black text-indigo-600 tracking-tighter">{mentor.mentorshipPrice || 50} <span className="text-xs uppercase ml-1">Credits</span></p>
                </div>
                <button
                  onClick={() => handleBook(mentor)}
                  className="px-10 py-5 bg-slate-800 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3"
                >
                  Rezervă <ChevronRight className="w-5 h-5 text-indigo-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {mentors.length === 0 && !loading && (
        <div className="text-center py-32 glass rounded-[4rem] border-2 border-dashed border-[var(--glass-border)] bg-[var(--bg-app)]/10">
           <GraduationCap className="w-20 h-20 text-[var(--text-muted)] opacity-20 mx-auto mb-6 animate-float" />
           <h3 className="text-2xl font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40">Niciun Mentor Disponibil</h3>
           <p className="text-[var(--text-muted)] max-w-md mx-auto mt-2 font-medium">Rețeaua noastră este în continuă extindere. Revino pentru noii mentori academici.</p>
        </div>
      )}
    </div>
  );
}
