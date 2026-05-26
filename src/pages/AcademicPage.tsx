import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
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
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useSearch } from "../context/SearchContext";

export default function AcademicPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", skillsText: "" });
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
  const [isUnenrolling, setIsUnenrolling] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseData, setEditCourseData] = useState({ title: "", description: "", skillsText: "" });

  useEffect(() => {
    const unsub = getCourses(setCourses);
    return () => unsub();
  }, []);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    setIsEnrolling(courseId);
    try {
      await enrollInCourse(user.uid, courseId);
      toast.success("Successfully enrolled in the course!");
    } catch (err) {
      toast.error("Error during enrollment.");
    } finally {
      setIsEnrolling(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!user) return;
    setIsUnenrolling(courseId);
    try {
      await unenrollFromCourse(user.uid, courseId);
      toast.success("Successfully left the course!");
    } catch (err) {
      toast.error("Error leaving the course.");
    } finally {
      setIsUnenrolling(null);
    }
  };

  const isEnrolled = (courseId: string) => {
    return profile?.academicData?.enrolledCourses?.includes(courseId);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const parsedSkills = newCourse.skillsText
      ? newCourse.skillsText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      await createCourse({
        title: newCourse.title,
        description: newCourse.description,
        professorId: profile.uid,
        professorName: profile.fullName,
        materials: [],
        skills: parsedSkills,
      } as any);
      setIsCreating(false);
      setNewCourse({ title: "", description: "", skillsText: "" });
      toast.success("Course created successfully!");
    } catch (err) {
      toast.error("Error creating course.");
    }
  };

  const startEditing = (course: Course) => {
    setEditingCourse(course);
    setEditCourseData({
      title: course.title,
      description: course.description,
      skillsText: course.skills ? course.skills.join(", ") : "",
    });
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const parsedSkills = editCourseData.skillsText
      ? editCourseData.skillsText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      await updateCourse(editingCourse.id, {
        title: editCourseData.title,
        description: editCourseData.description,
        skills: parsedSkills,
      });
      setEditingCourse(null);
      toast.success("Course updated successfully!");
    } catch (err) {
      toast.error("Error updating course.");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to delete this course? This action is irreversible.")) return;
    try {
      await deleteCourse(courseId);
      toast.success("Course deleted successfully!");
    } catch (err) {
      toast.error("Error deleting course.");
    }
  };

  // Filter courses reactively using role and global searchQuery
  const filteredCourses = courses.filter((course) => {
    // 1. Role-based filtering: Professors only see their own courses
    if (profile?.role === "professor") {
      if (course.professorId !== profile.uid) {
        return false;
      }
    }

    // 2. Search query filtering
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      (course.title || "").toLowerCase().includes(query) ||
      (course.description || "").toLowerCase().includes(query) ||
      (course.professorName || "").toLowerCase().includes(query) ||
      (course.skills || []).some((skill) => (skill || "").toLowerCase().includes(query))
    );
  });

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
            Sync with your universe of courses and augmented digital resources.
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
            <span>CREATE COURSE</span>
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
                Initiate Academic Course
              </h3>
            </div>

            <form
              onSubmit={handleCreateCourse}
              className="space-y-8 relative z-10"
            >
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] ml-6">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-8 py-5 bg-[var(--bg-app)]/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-sm uppercase tracking-tight transition-all text-[var(--text-main)]"
                  placeholder="e.g., Cloud Systems & Artificial Intelligence"
                  value={newCourse.title}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] ml-6">
                  Description
                </label>
                <textarea
                  required
                  className="w-full px-8 py-5 bg-[var(--bg-app)]/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-medium h-40 resize-none transition-all shadow-inner text-[var(--text-main)]"
                  placeholder="Define the purpose and learning outcomes..."
                  value={newCourse.description}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] ml-6">
                  Skill-uri Dobândite / Acquired Skills (separate prin virgulă)
                </label>
                <input
                  type="text"
                  className="w-full px-8 py-5 bg-[var(--bg-app)]/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-sm uppercase tracking-tight transition-all text-[var(--text-main)]"
                  placeholder="e.g., Baze de date, SQL, Firebase, React, Backend"
                  value={newCourse.skillsText}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, skillsText: e.target.value })
                  }
                />
                {newCourse.skillsText && (
                  <div className="flex flex-wrap gap-2 mt-3 ml-6">
                    {newCourse.skillsText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100/50 shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-10 py-5 text-[var(--text-muted)] font-black uppercase tracking-[0.3em] text-[10px] hover:text-indigo-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-12 py-5 bg-slate-800 dark:bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.3em] text-[10px]"
                >
                  Create Course
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredCourses.map((course, idx) => (
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
                    ? "Processing..."
                    : "ENROLL IN COURSE"}
                  <Plus className="w-5 h-5 text-indigo-400 dark:text-white" />
                </button>
              )}

              {profile?.role === "student" && isEnrolled(course.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnenroll(course.id);
                  }}
                  disabled={isUnenrolling === course.id}
                  className="w-full py-6 glass bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border border-rose-100 dark:border-rose-900/40 shadow-2xl"
                >
                  {isUnenrolling === course.id
                    ? "Leaving..."
                    : "LEAVE COURSE"}
                  <X className="w-5 h-5" />
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
                      Coordinating Professor
                    </p>
                    <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-tight truncate max-w-[100px]">
                      {course.professorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profile?.role === "professor" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(course);
                        }}
                        className="w-10 h-10 glass rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm cursor-pointer"
                        title="Edit Course"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        className="w-10 h-10 glass rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate(`/academic/${course.id}`)}
                    className="flex items-center gap-2 group/btn cursor-pointer"
                  >
                    <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover/btn:bg-slate-800 dark:group-hover/btn:bg-indigo-600 group-hover/btn:text-white transition-all shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCourses.length === 0 && !isCreating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-32 glass rounded-[4rem] border-dashed border-2 border-[var(--glass-border)] bg-[var(--bg-app)]/10"
        >
          <Book className="w-20 h-20 text-[var(--text-muted)] opacity-20 mx-auto mb-8 animate-float" />
          <h3 className="text-2xl font-black text-[var(--text-muted)] uppercase tracking-[0.4em] leading-tight opacity-40">
            The StudentLink system is waiting for your impulse...
          </h3>
          <p className="text-[var(--text-muted)] font-medium mt-2">
            Create the first resource or check back later for new data.
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white text-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-200 max-w-2xl w-full relative overflow-hidden"
            >
              <button
                onClick={() => setEditingCourse(null)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-650 flex items-center justify-center text-white shadow-lg">
                  <Edit2 className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter uppercase text-slate-900">
                  Edit Academic Course
                </h3>
              </div>

              <form onSubmit={handleUpdateCourse} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-bold text-sm text-slate-900 transition-all"
                    placeholder="e.g., Cloud Systems & Artificial Intelligence"
                    value={editCourseData.title}
                    onChange={(e) =>
                      setEditCourseData({ ...editCourseData, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
                    Description
                  </label>
                  <textarea
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-medium h-36 resize-none transition-all text-slate-900"
                    placeholder="Define the purpose and learning outcomes..."
                    value={editCourseData.description}
                    onChange={(e) =>
                      setEditCourseData({ ...editCourseData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
                    Skill-uri Dobândite / Acquired Skills (separate prin virgulă)
                  </label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-bold text-sm text-slate-900 transition-all"
                    placeholder="e.g., Baze de date, SQL, Firebase, React, Backend"
                    value={editCourseData.skillsText}
                    onChange={(e) =>
                      setEditCourseData({ ...editCourseData, skillsText: e.target.value })
                    }
                  />
                  {editCourseData.skillsText && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-2">
                      {editCourseData.skillsText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm"
                          >
                            {skill}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(null)}
                    className="px-8 py-4 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-indigo-600 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-10 py-4 bg-indigo-650 text-white font-bold rounded-[1.5rem] shadow-lg hover:bg-indigo-750 transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px] cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
