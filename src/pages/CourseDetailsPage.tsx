import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { 
  BookOpen, 
  FileText, 
  ChevronLeft, 
  Plus, 
  Send, 
  CheckCircle, 
  BrainCircuit, 
  Download,
  AlertCircle,
  Trophy,
  History,
  User,
  Sparkles,
  X,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { generateQuizFromMaterials } from "../services/geminiService";
import { 
  getAssignments, 
  getSubmissionsForAssignment, 
  getStudentSubmissionsForAssignment,
  submitAssignment, 
  gradeSubmission, 
  createAssignment,
  addCourseMaterial,
  Course, 
  Assignment, 
  Submission 
} from "../services/academicService";
import { uploadFile } from "../services/storageService";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments' | 'quiz'>('materials');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '' });
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null); // assignmentId
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({ grade: 10, feedback: '' });
  
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Quiz state
  const [quiz, setQuiz] = useState<any[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const unsubCourse = onSnapshot(doc(db, "courses", courseId), (snap) => {
      setCourse({ id: snap.id, ...snap.data() } as Course);
    });
    const unsubAssigns = getAssignments(courseId, setAssignments);

    return () => {
      unsubCourse();
      unsubAssigns();
    };
  }, [courseId]);

  const handleGenerateQuiz = async () => {
    if (!course) return;
    setIsGeneratingQuiz(true);
    try {
      const materialsText = course.materials.map(m => m.name).join(". ") + ". " + course.description;
      const data = await generateQuizFromMaterials(course.title, course.description, materialsText);
      setQuiz(data);
      setActiveTab('quiz');
      setCurrentQuizStep(0);
      setQuizScore(null);
      toast.success("Test generat de AI!");
    } catch (err) {
      toast.error("Eroare la generarea testului.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === quiz[currentQuizStep].correctIndex;
    if (isCorrect) {
      toast.success("Corect!");
    } else {
      toast.error("Incorect.");
    }

    if (currentQuizStep < quiz.length - 1) {
      setCurrentQuizStep(currentQuizStep + 1);
      setSelectedAnswer(null);
    } else {
      // Finalize quiz
      const finalScore = quiz.reduce((acc, q, i) => acc + (q.correctIndex === (i === currentQuizStep ? selectedAnswer : 0) ? 1 : 0), 0);
      setQuizScore(finalScore);
    }
  };

  useEffect(() => {
    if (viewingSubmissionsFor) {
      const unsub = getSubmissionsForAssignment(viewingSubmissionsFor, setSubmissions);
      return () => unsub();
    }
    
    // For students, fetch their own submission if they are not the professor
    if (profile?.role === 'student' && activeTab === 'assignments' && assignments.length > 0) {
      const unsubs = assignments.map(a => 
        getStudentSubmissionsForAssignment(a.id, profile.uid, (newSubs) => {
          setSubmissions(prev => {
            const filtered = prev.filter(s => s.assignmentId !== a.id);
            return [...filtered, ...newSubs];
          });
        })
      );
      return () => unsubs.forEach(u => u());
    }
  }, [viewingSubmissionsFor, profile, activeTab, assignments]);

  const handleAddAssignment = async () => {
    if (!courseId || !newAssignment.title || !newAssignment.dueDate) return;
    try {
      await createAssignment({
        courseId,
        title: newAssignment.title,
        description: newAssignment.description,
        dueDate: new Date(newAssignment.dueDate)
      });
      setIsAddingAssignment(false);
      setNewAssignment({ title: '', description: '', dueDate: '' });
      toast.success("Temă adăugată!");
    } catch (err) {
      toast.error("Eroare la adăugarea temei.");
    }
  };

  const handleUploadMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;

    setIsUploading(true);
    try {
      const path = `courses/${courseId}/materials/${Date.now()}_${file.name}`;
      const { downloadURL } = await uploadFile(file, path);
      
      await addCourseMaterial(courseId, {
        name: file.name,
        url: downloadURL,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE'
      });
      
      toast.success("Material încărcat cu succes!");
    } catch (err) {
      console.error(err);
      toast.error("Eroare la încărcarea materialului.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitWork = async (assignmentId: string) => {
    if (!profile || !courseId || !selectedFile) {
        toast.error("Te rugăm să selectezi un fișier.");
        return;
    }
    
    setIsUploading(true);
    try {
      const path = `assignments/${assignmentId}/submissions/${profile.uid}_${Date.now()}_${selectedFile.name}`;
      const { downloadURL } = await uploadFile(selectedFile, path);

      await submitAssignment({
        assignmentId,
        courseId,
        studentId: profile.uid,
        studentName: profile.fullName,
        fileUrl: downloadURL,
        fileName: selectedFile.name
      });
      
      setIsSubmitting(null);
      setSelectedFile(null);
      toast.success("Tema a fost trimisă!");
    } catch (err) {
      console.error(err);
      toast.error("Eroare la trimiterea temei.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;
    try {
      await gradeSubmission(gradingSubmission.id, gradeData.grade, gradeData.feedback);
      setGradingSubmission(null);
      setGradeData({ grade: 10, feedback: '' });
      toast.success("Nota a fost salvată!");
    } catch (err) {
      toast.error("Eroare la procesarea notei.");
    }
  };

  if (!course) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/academic" className="group flex items-center gap-2 px-4 py-2 glass rounded-2xl text-[var(--text-muted)] hover:text-indigo-600 font-bold transition-all">
           <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
           <span className="text-xs uppercase tracking-widest font-black">StudentLink Academic</span>
        </Link>
        <div className="h-1 w-1 rounded-full bg-[var(--glass-border)]" />
        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[200px]">
          {course.title}
        </span>
      </div>

      <div className="glass p-10 rounded-[3rem] shadow-glow border-indigo-50/50">
         <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-6">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 animate-pulse">
                  <Sparkles className="w-3 h-3" /> Digital Course
               </div>
               <h2 className="text-5xl font-black text-[var(--text-main)] tracking-tighter leading-[0.9] font-display uppercase">
                 {course.title}
               </h2>
               <p className="text-[var(--text-muted)] font-medium max-w-2xl leading-relaxed text-lg">
                 {course.description}
               </p>
            </div>
            
            <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center bg-[var(--bg-app)]/30 border-[var(--glass-border)] min-w-[180px]">
               <div className="w-16 h-16 bg-[var(--bg-app)] dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[var(--text-muted)] mb-4 shadow-xl shadow-slate-100 dark:shadow-none group">
                  <img src={`https://picsum.photos/seed/${course.professorId}/128/128`} alt="" className="w-full h-full object-cover rounded-2xl opacity-90 group-hover:scale-110 transition-transform" />
               </div>
               <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Coordonator</p>
               <p className="text-sm font-black text-[var(--text-main)] font-display uppercase tracking-tight">{course.professorName}</p>
            </div>
         </div>

         <div className="flex flex-wrap gap-3 mt-12 bg-[var(--bg-app)]/50 p-2 rounded-[2.5rem] w-fit border border-[var(--glass-border)] backdrop-blur-xl">
            {[
              { id: 'materials', label: 'Materiale', icon: FileText },
              { id: 'assignments', label: 'Teme active', icon: Plus },
              { id: 'quiz', label: 'Evaluare AI', icon: BrainCircuit }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                  activeTab === tab.id 
                    ? "bg-[var(--bg-sidebar)] dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xl shadow-indigo-100/50 scale-105 border border-[var(--glass-border)] dark:border-indigo-500" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]/50"
                )
              }
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "")} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="tab-outline" className="absolute inset-0 border-2 border-indigo-500/20 rounded-[1.8rem]" />
                )}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'materials' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
               {profile?.role === 'professor' && (
                 <div className="flex justify-between items-center glass p-6 rounded-[2rem] border border-[var(--glass-border)]">
                    <div>
                      <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight font-display uppercase">Bibliotecă Digitală</h3>
                      <p className="text-xs font-medium text-[var(--text-muted)]">Încarcă resursele necesare cursului.</p>
                    </div>
                    <label className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-all shadow-xl shadow-indigo-100">
                       <Plus className="w-5 h-5" /> 
                       {isUploading ? "Se procesează..." : "Adaugă Resursă"}
                       <input type="file" className="hidden" onChange={handleUploadMaterial} disabled={isUploading} />
                    </label>
                 </div>
               )}
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {course.materials.length === 0 ? (
                    <div className="col-span-2 py-20 text-center glass rounded-[3rem] border-dashed border-2 border-slate-200">
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                         <FileText className="w-10 h-10" />
                       </div>
                       <p className="text-[var(--text-main)] font-black text-lg uppercase tracking-widest opacity-60">Arhivă goală</p>
                       <p className="text-[var(--text-muted)] font-medium">Nu au fost încărcate materiale momentan.</p>
                    </div>
                  ) : (
                    course.materials.map((m, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="glass p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-indigo-200 hover:shadow-glow transition-all"
                      >
                         <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-[1.2rem] transition-all relative overflow-hidden">
                               <FileText className="w-6 h-6 relative z-10" />
                               <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-[var(--text-main)] group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{m.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-100/50">{m.type}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sursa: StudentLink Assets</span>
                               </div>
                            </div>
                         </div>
                         <a 
                           href={m.url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                         >
                            <Download className="w-5 h-5" />
                         </a>
                      </motion.div>
                    ))
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'assignments' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
               {profile?.role === 'professor' && (
                 <div className="flex justify-between items-center bg-white/40 p-6 rounded-[2rem] border border-white/60">
                    <div>
                      <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight font-display uppercase">Laborator Evaluări</h3>
                      <p className="text-xs font-medium text-[var(--text-muted)]">Planifică noile provocări pentru studenți.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingAssignment(true)}
                      className="bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl"
                    >
                      <Plus className="w-5 h-5" /> Creează Temă
                    </button>
                 </div>
               )}

               {/* Add Assignment Modal Placeholder (Simplified as inline form) */}
               {isAddingAssignment && (
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-8 space-y-4">
                    <h4 className="font-bold text-indigo-900">Adaugă Temă Nouă</h4>
                    <input 
                      type="text" 
                      placeholder="Titlu Temă" 
                      className="w-full p-3 bg-white rounded-xl border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                    />
                    <textarea 
                      placeholder="Descrierea cerințelor..." 
                      className="w-full p-3 bg-white rounded-xl border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                    />
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white rounded-xl border border-indigo-100 outline-none"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    />
                    <div className="flex justify-end gap-3">
                       <button onClick={() => setIsAddingAssignment(false)} className="px-4 py-2 text-slate-500 font-bold">Anulează</button>
                       <button onClick={handleAddAssignment} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Salvează</button>
                    </div>
                 </motion.div>
               )}

               {assignments.map(a => (
                 <motion.div 
                   key={a.id} 
                   layout
                   className="glass p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative group hover:border-indigo-200 transition-all"
                 >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                       <div className="space-y-1">
                          <h4 className="text-2xl font-black text-[var(--text-main)] tracking-tight font-display uppercase group-hover:text-indigo-600 transition-colors">{a.title}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <History className="w-3.5 h-3.5" /> Postat acum 2 zile
                          </p>
                       </div>
                       <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100">
                          <AlertCircle className="w-4 h-4" />
                          Limită: {format(a.dueDate, "d MMMM")}
                       </div>
                    </div>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed border-l-4 border-indigo-100 pl-6 border-dotted">
                      {a.description}
                    </p>
                    
                      <div className="flex justify-end pt-8 border-t border-slate-100/50 gap-4">
                        {profile?.role === 'student' ? (
                          <div className="w-full space-y-4">
                            {submissions.some(s => s.assignmentId === a.id) ? (
                              <div className="glass p-8 rounded-[2.5rem] border border-[var(--glass-border)] flex items-center justify-between bg-[var(--bg-app)]/40 shadow-glow-sm group hover:bg-[var(--bg-app)]/60 transition-all">
                                <div className="flex items-center gap-6">
                                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200/50 group-hover:scale-110 transition-transform">
                                    <CheckCircle className="w-8 h-8" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">Status: Transmisie Finalizată</p>
                                    <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight line-clamp-1">{submissions.find(s => s.assignmentId === a.id)?.fileName}</p>
                                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Înregistrat la {format(submissions.find(s => s.assignmentId === a.id)?.submittedAt?.toDate() || new Date(), "HH:mm, d MMM")}</p>
                                  </div>
                                </div>
                                
                                {submissions.find(s => s.assignmentId === a.id)?.status === 'graded' ? (
                                  <div className="text-right space-y-3">
                                    <div className="inline-flex items-center justify-center px-8 py-4 bg-slate-800 text-white rounded-[1.8rem] font-black shadow-2xl shadow-indigo-200 text-2xl group-hover:bg-indigo-600 transition-colors">
                                      <span className="text-[10px] text-indigo-400 mr-3 uppercase not-italic tracking-widest">Index:</span> {submissions.find(s => s.assignmentId === a.id)?.grade}
                                    </div>
                                    {submissions.find(s => s.assignmentId === a.id)?.feedback && (
                                    <div className="glass p-5 rounded-[1.8rem] border border-[var(--glass-border)] relative shadow-sm max-w-[200px]">
                                        <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-[8px] font-black text-white uppercase tracking-[0.2em] rounded-full">Evaluare AI</div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">"{submissions.find(s => s.assignmentId === a.id)?.feedback}"</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-2">
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-5 py-2 rounded-full uppercase tracking-[0.2em] border border-amber-100 animate-pulse shadow-sm">Analiză Neuronală</span>
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tighter">Așteaptă semnal feedback</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsSubmitting(a.id)}
                                className="w-full bg-indigo-600 text-white px-8 py-5 rounded-[1.8rem] text-[10px] font-black shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-slate-800 uppercase tracking-[0.2em] transition-all"
                              >
                                Lansează Proiectul <Send className="w-4 h-4" />
                              </motion.button>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => setViewingSubmissionsFor(a.id)}
                            className={cn(
                              "px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border shadow-lg shadow-slate-100/50",
                              viewingSubmissionsFor === a.id 
                                ? "bg-indigo-600 border-indigo-600 text-white" 
                                : "bg-[var(--bg-app)]/40 border-[var(--glass-border)] text-[var(--text-muted)] hover:text-indigo-600 hover:border-indigo-100"
                            )}
                          >
                            {viewingSubmissionsFor === a.id ? "Monitorizare activă" : "Vezi Portofolii"} <Users className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    {/* Student Submission Form */}
                    <AnimatePresence>
                      {isSubmitting === a.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-6 overflow-hidden">
                           <div className="p-8 glass rounded-[2.5rem] border border-indigo-100 bg-indigo-50/30 space-y-6">
                              <div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Transmisie Digitală</p>
                                <h5 className="text-xl font-black text-slate-800 tracking-tight uppercase">Încarcă Proiectul Tău</h5>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-[var(--glass-border)] rounded-[2rem] p-12 bg-[var(--bg-app)]/40 hover:border-indigo-500 hover:bg-[var(--bg-app)]/60 hover:shadow-2xl transition-all cursor-pointer group">
                                   <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-4 shadow-sm">
                                      <Download className="w-8 h-8" />
                                   </div>
                                   <span className="text-sm font-black text-[var(--text-main)] tracking-tight">
                                      {selectedFile ? selectedFile.name : "Apasă pentru selectarea fișierului"}
                                   </span>
                                   <p className="text-[10px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-widest">Doc, PDF, Archive (Max 50MB)</p>
                                   <input 
                                     type="file" 
                                     className="hidden" 
                                     onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                   />
                                </label>
                              </div>
                              <div className="flex justify-end gap-3">
                                 <button 
                                    onClick={() => { setIsSubmitting(null); setSelectedFile(null); }} 
                                    className="px-8 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all"
                                    disabled={isUploading}
                                 >
                                    Anulează
                                 </button>
                                 <button 
                                    onClick={() => handleSubmitWork(a.id)} 
                                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-2xl shadow-indigo-100 disabled:bg-slate-200 uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2"
                                    disabled={!selectedFile || isUploading}
                                 >
                                    {isUploading ? "Se sincronizează..." : "Transmite către Profesor"}
                                    {!isUploading && <Send className="w-3.5 h-3.5" />}
                                 </button>
                              </div>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Professor Submissions List */}
                    <AnimatePresence>
                      {viewingSubmissionsFor === a.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-8 overflow-hidden space-y-4">
                           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] px-2 mb-6 border-b border-indigo-50 pb-2">Centralizator Lucrări Primite ({submissions.filter(s => s.assignmentId === a.id).length})</p>
                           <div className="grid grid-cols-1 gap-4">
                             {submissions.filter(s => s.assignmentId === a.id).map(sub => (
                               <div key={sub.id} className="glass p-5 rounded-[1.8rem] border border-slate-100 flex items-center justify-between hover:bg-white transition-all shadow-sm">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-indigo-600 border border-slate-100 text-lg shadow-inner">
                                        {sub.studentName.charAt(0)}
                                     </div>
                                     <div>
                                        <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight leading-none mb-1">{sub.studentName}</p>
                                        <div className="flex items-center gap-3">
                                          <a href={sub.fileUrl} target="_blank" className="text-[9px] text-indigo-600 font-black uppercase tracking-widest hover:underline px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-md">Portofoliu ↗</a>
                                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{format(sub.submittedAt?.toDate() || new Date(), "d MMM HH:mm")}</span>
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                     {sub.status === 'graded' ? (
                                       <div className="flex items-center gap-3">
                                         <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">Validat</span>
                                         <div className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                                           {sub.grade}
                                         </div>
                                       </div>
                                     ) : (
                                       <button 
                                         onClick={() => setGradingSubmission(sub)}
                                         className="px-6 py-3 glass border-[var(--glass-border)] text-[var(--text-muted)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                                       >
                                         Evaluează
                                       </button>
                                     )}
                                  </div>
                               </div>
                             ))}
                           </div>
                           {submissions.filter(s => s.assignmentId === a.id).length === 0 && (
                             <div className="text-center py-12 glass rounded-3xl border-dashed border-2">
                               <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                               <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Așteptare studenți...</p>
                             </div>
                           )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </motion.div>
               ))}
               {assignments.length === 0 && (
                 <p className="text-center py-12 text-slate-400 font-bold">Nu există teme active.</p>
               )}
            </motion.div>
          )}

          {activeTab === 'quiz' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-10 rounded-[3rem] border border-[var(--glass-border)] shadow-glow-indigo bg-[var(--bg-app)]/20"
            >
               {quiz.length === 0 ? (
                 <div className="text-center py-16">
                    <div className="w-24 h-24 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-xl animate-float">
                      <BrainCircuit className="w-12 h-12" />
                    </div>
                    <h4 className="text-3xl font-black text-[var(--text-main)] tracking-tight font-display mb-4 uppercase">Sinteză Curs AI</h4>
                    <p className="text-[var(--text-muted)] max-w-sm mx-auto mt-2 mb-10 font-medium text-lg leading-relaxed">Sistemul AI va analiza materialele cursului pentru a genera o evaluare a cunoștințelor.</p>
                    <button 
                      onClick={handleGenerateQuiz}
                      disabled={isGeneratingQuiz}
                      className="bg-slate-800 text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-3 mx-auto shadow-2xl shadow-slate-200 hover:bg-slate-900 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-[10px]"
                    >
                      {isGeneratingQuiz ? 'Analiză Materiale...' : 'Generează Test Evaluare'}
                      {!isGeneratingQuiz && <Sparkles className="w-4 h-4 text-indigo-400" />}
                    </button>
                 </div>
               ) : quizScore !== null ? (
                 <div className="text-center py-12">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-indigo-100 relative"
                    >
                       <Trophy className="w-16 h-16" />
                       <div className="absolute -top-2 -right-2 bg-slate-800 text-[10px] font-black px-3 py-1 rounded-full uppercase">Scor Final</div>
                    </motion.div>
                    <h3 className="text-5xl font-black text-[var(--text-main)] tracking-tighter mb-4">{quizScore} / {quiz.length}</h3>
                    <p className="text-slate-500 max-w-md mx-auto font-medium text-lg mb-10 leading-relaxed border-l-4 border-indigo-100 pl-6">
                      {quizScore === quiz.length ? "Evoluție completă! Ai atins pragul maxim de înțelegere a resurselor." : quizScore >= quiz.length / 2 ? "Performanță solidă. Algoritmii confirmă o bază de cunoștințe stabilă." : "Sinteză insuficientă. Se recomandă revizuirea materialelor bibliografice."}
                    </p>
                    
                    <div className="mt-12 space-y-4 max-w-lg mx-auto text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 mb-4">Raport Detaliat</p>
                       {quiz.map((q: any, idx: number) => (
                          <div key={idx} className="glass p-5 rounded-[1.5rem] border border-slate-100 bg-white/40 hover:bg-white transition-all">
                             <p className="text-sm font-black text-[var(--text-main)] leading-tight mb-2 uppercase tracking-tight">{idx+1}. {q.question}</p>
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                               <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{q.options[q.correctIndex]}</p>
                             </div>
                          </div>
                       ))}
                    </div>

                    <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                       <button 
                         onClick={() => {setQuizScore(null); setCurrentQuizStep(0); setSelectedAnswer(null);}} 
                         className="px-10 py-5 bg-indigo-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-100"
                       >
                         <History className="w-4 h-4" /> Resetare Instanță
                       </button>
                       <button 
                         onClick={() => {setQuiz([]); setQuizScore(null);}} 
                         className="px-10 py-5 glass text-[var(--text-muted)] rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:text-[var(--text-main)] transition-all border border-[var(--glass-border)]"
                       >
                         Ieșire Evaluare
                       </button>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-10">
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Sesiune Activă</p>
                          <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pasul {currentQuizStep + 1} <span className="text-slate-300">/ {quiz.length}</span></h4>
                       </div>
                       <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentQuizStep + 1) / quiz.length) * 100}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                          />
                       </div>
                    </div>
                    
                    <h3 className="text-3xl font-black text-[var(--text-main)] leading-none uppercase tracking-tighter">{quiz[currentQuizStep].question}</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                       {quiz[currentQuizStep].options.map((opt: string, i: number) => (
                         <motion.button
                           key={i}
                           whileHover={{ scale: 1.01, x: 5 }}
                           whileTap={{ scale: 0.99 }}
                           onClick={() => setSelectedAnswer(i)}
                           className={cn(
                             "w-full text-left p-6 rounded-[1.8rem] border-2 transition-all font-black text-[11px] uppercase tracking-widest flex items-center justify-between group",
                             selectedAnswer === i 
                               ? "border-indigo-600 bg-white shadow-2xl shadow-indigo-100 text-indigo-700" 
                               : "border-slate-100 hover:border-indigo-200 text-slate-400 hover:text-slate-600 bg-white/40"
                           )}
                         >
                           <span>{opt}</span>
                           <div className={cn(
                             "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
                             selectedAnswer === i ? "border-indigo-600 bg-indigo-600" : "border-slate-200"
                           )}>
                             {selectedAnswer === i && <CheckCircle className="w-4 h-4 text-white" />}
                           </div>
                         </motion.button>
                       ))}
                    </div>

                    <button
                      onClick={handleAnswerSubmit}
                      disabled={selectedAnswer === null}
                      className="w-full py-6 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] shadow-2xl shadow-slate-100 hover:bg-slate-900 disabled:opacity-30 transition-all mt-8 active:scale-95 uppercase tracking-[0.3em]"
                    >
                      Validează Răspunsul
                    </button>
                 </div>
               )}
            </motion.div>
          )}
        </div>

        <div className="space-y-8">
           <div className="glass p-8 rounded-[3rem] border border-white/60 shadow-glow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-indigo-600/5 -rotate-12 group-hover:rotate-0 transition-transform">
                <Sparkles className="w-24 h-24" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                 <History className="w-4 h-4 text-indigo-600" /> Flux Activitate 24h
              </h3>
              <div className="space-y-6">
                 <div className="flex gap-4 group/item">
                    <div className="w-1 bg-indigo-600 rounded-full h-12 transition-all group-hover/item:h-16 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">Actualizare Resurse</p>
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed">Prof. {course.professorName} a listat noi direcții de studiu în arhivă.</p>
                      <p className="text-[8px] font-black text-indigo-400 uppercase">acum 40 min</p>
                    </div>
                 </div>
                 <div className="flex gap-4 group/item">
                    <div className="w-1 bg-rose-500 rounded-full h-12 transition-all group-hover/item:h-16 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">Alertă Deadline</p>
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed">Sesiunea de predare pentru noua temă expiră în curând.</p>
                      <p className="text-[8px] font-black text-rose-400 uppercase">scadență critică</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="glass-dark max-w-lg w-full rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] p-12 space-y-10 relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
               <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Sistem Evaluare</p>
                    <h3 className="text-3xl font-black text-white tracking-tighter font-display uppercase text-indigo-400">Validare Portofoliu</h3>
                  </div>
                  <button onClick={() => setGradingSubmission(null)} className="p-4 hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
               </div>

               <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-indigo-500/20">
                    {gradingSubmission.studentName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white uppercase tracking-tight">{gradingSubmission.studentName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest border border-indigo-400/30 px-2 py-0.5 rounded-md">ID: {gradingSubmission.studentId.substring(0, 8)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{format(gradingSubmission.submittedAt?.toDate() || new Date(), "d MMM HH:mm")}</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between px-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punctaj Academic (1-10)</label>
                       <span className="text-xs font-black text-indigo-400">{gradeData.grade}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      value={gradeData.grade}
                      onChange={(e) => setGradeData({...gradeData, grade: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-600 px-1">
                      <span>MIN: 1</span>
                      <span>MAX: 10</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observații Critice</label>
                    <textarea 
                      placeholder="Analiza ta aici..." 
                      className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] text-sm font-medium text-white outline-none focus:ring-4 focus:ring-indigo-500/20 min-h-[150px] placeholder:text-slate-600 focus:bg-white/10 transition-all resize-none"
                      value={gradeData.feedback}
                      onChange={(e) => setGradeData({...gradeData, feedback: e.target.value})}
                    />
                  </div>
               </div>

               <button 
                 onClick={handleGrade}
                 className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-slate-800 transition-all transform active:scale-95 uppercase tracking-[0.2em] text-[12px]"
               >
                 Finalizează Evaluarea
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
