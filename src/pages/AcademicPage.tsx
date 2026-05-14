import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCourses,
  createCourse,
  enrollInCourse,
  Course,
} from "../services/academicService";
import { useAuth } from "../hooks/useAuth";
import {
  Plus,
  Book,
  FileText,
  User,
  ChevronRight,
  GraduationCap,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export default function AcademicPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  useEffect(() => {
    const unsub = getCourses(setCourses);
    return () => unsub();
  }, []);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    setIsEnrolling(courseId);
    try {
      await enrollInCourse(user.uid, courseId);
      toast.success("Te-ai înscris cu succes la curs!");
    } catch (err) {
      toast.error("Eroare la înscriere.");
    } finally {
      setIsEnrolling(null);
    }
  };

  const isEnrolled = (courseId: string) => {
    return profile?.academicData?.enrolledCourses?.includes(courseId);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await createCourse({
        title: newCourse.title,
        description: newCourse.description,
        professorId: profile.uid,
        professorName: profile.fullName,
        materials: [],
      });
      setIsCreating(false);
      setNewCourse({ title: "", description: "" });
      toast.success("Curs creat cu succes!");
    } catch (err) {
      toast.error("Eroare la crearea cursului.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12 max-w-7xl mx-auto"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 glass p-12 rounded-[3.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform">
          <GraduationCap className="w-64 h-64 text-indigo-600" />
        </div>

        <div className="text-center lg:text-left space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-glow-sm" />{" "}
            Knowledge Graph
          </div>
          <h2 className="text-5xl font-black text-[var(--text-main)] tracking-tighter font-display uppercase">
            StudentLink Academic AI
          </h2>
          <p className="text-[var(--text-muted)] font-medium text-xl max-w-xl border-l-2 border-indigo-500/20 pl-6">
            Sincronizează-te cu universul tău de cursuri și resurse digitale
            augmentate.
          </p>
        </div>

        {profile?.role === "professor" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-4 px-10 py-5 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-700 text-white rounded-[2rem] font-black shadow-2xl transition-all uppercase tracking-[0.2em] text-xs relative z-10"
          >
            <Plus className="w-6 h-6 text-indigo-400" />
            <span>CREEAZĂ CAPITOL</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="glass p-12 rounded-[4rem] shadow-glow-indigo/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12">
              <Book className="w-48 h-48 text-indigo-600" />
            </div>

            <div className="flex items-center gap-5 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-2xl dark:shadow-none shadow-indigo-100">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase">
                Inițiere Capitol Academic
              </h3>
            </div>

            <form
              onSubmit={handleCreateCourse}
              className="space-y-8 relative z-10"
            >
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] ml-6">
                  Titlu Curs
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-8 py-5 bg-[var(--bg-app)]/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-sm uppercase tracking-tight transition-all text-[var(--text-main)]"
                  placeholder="ex: Sisteme Cloud & Inteligență Artificială"
                  value={newCourse.title}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] ml-6">
                  Descriere
                </label>
                <textarea
                  required
                  className="w-full px-8 py-5 bg-[var(--bg-app)]/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-medium h-40 resize-none transition-all shadow-inner text-[var(--text-main)]"
                  placeholder="Definește scopul și rezultatele învățării..."
                  value={newCourse.description}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-10 py-5 text-[var(--text-muted)] font-black uppercase tracking-[0.3em] text-[10px] hover:text-indigo-600 transition-all"
                >
                  Abandonează
                </button>
                <button
                  type="submit"
                  className="px-12 py-5 bg-slate-800 dark:bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.3em] text-[10px]"
                >
                  Creează Cursul
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -12 }}
            className="glass rounded-[4rem] p-10 group flex flex-col h-full hover:shadow-glow-indigo transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Book className="w-48 h-48 text-indigo-600" />
            </div>

            <div className="w-20 h-20 glass rounded-[2.5rem] flex items-center justify-center text-[var(--text-muted)] mb-10 group-hover:bg-indigo-600 group-hover:text-white transition-all relative">
              <BookOpen className="w-10 h-10" />
              {profile?.role === "student" && isEnrolled(course.id) && (
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2.5 rounded-2xl border-4 border-[var(--bg-app)] shadow-2xl shadow-emerald-500/20">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="space-y-5 mb-10 flex-1 relative z-10">
              <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase">
                {course.title}
              </h3>
              <p className="text-[var(--text-muted)] font-medium leading-relaxed line-clamp-3 border-l-2 border-indigo-500/20 pl-4">
                {course.description}
              </p>
            </div>

            <div className="space-y-8 relative z-10">
              {profile?.role === "student" && !isEnrolled(course.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnroll(course.id);
                  }}
                  disabled={isEnrolling === course.id}
                  className="w-full py-6 glass bg-indigo-50/50 dark:bg-indigo-900/40 hover:bg-slate-800 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border border-indigo-100 dark:border-indigo-900/40 shadow-2xl"
                >
                  {isEnrolling === course.id
                    ? "Se procesează..."
                    : "ÎNSCRIERE CURS"}
                  <Plus className="w-5 h-5 text-indigo-400 dark:text-white" />
                </button>
              )}

              <div className="flex items-center justify-between pt-8 border-t border-[var(--glass-border)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[var(--text-muted)] overflow-hidden shadow-2xl glass">
                    <img
                      src={`https://picsum.photos/seed/${course.professorId}/128/128`}
                      alt=""
                      className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                      Profesor Coordonator
                    </p>
                    <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-tight truncate max-w-[140px]">
                      {course.professorName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/academic/${course.id}`)}
                  className="flex items-center gap-2 group/btn"
                >
                  <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover/btn:bg-slate-800 dark:group-hover/btn:bg-indigo-600 group-hover/btn:text-white transition-all shadow-sm">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {courses.length === 0 && !isCreating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-32 glass rounded-[4rem] border-dashed border-2 border-[var(--glass-border)] bg-[var(--bg-app)]/10"
        >
          <Book className="w-20 h-20 text-[var(--text-muted)] opacity-20 mx-auto mb-8 animate-float" />
          <h3 className="text-2xl font-black text-[var(--text-muted)] uppercase tracking-[0.4em] leading-tight opacity-40">
            Sistemul StudentLink așteaptă impulsul tău...
          </h3>
          <p className="text-[var(--text-muted)] font-medium mt-2">
            Creează prima resursă sau revino pentru noi date.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
