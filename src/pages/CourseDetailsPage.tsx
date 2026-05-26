import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
  Users,
  MessageSquare
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
  Submission,
  CourseCompletion,
  submitCourseForGrading,
  getCourseCompletionForStudent,
  getAllCourseCompletions,
  gradeCourseCompletion
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

  // Comments state
  const [expandedMaterialCommentsIndex, setExpandedMaterialCommentsIndex] = useState<number | null>(null);
  const [allMaterialComments, setAllMaterialComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Course completion / graduation states
  const [completion, setCompletion] = useState<CourseCompletion | null>(null);
  const [allCompletions, setAllCompletions] = useState<CourseCompletion[]>([]);
  const [isSubmittingGraduation, setIsSubmittingGraduation] = useState(false);
  const [gradingCompletion, setGradingCompletion] = useState<CourseCompletion | null>(null);
  const [finalGradeData, setFinalGradeData] = useState({ grade: 10, feedback: '' });

  useEffect(() => {
    if (!courseId) return;
    const unsubCourse = onSnapshot(doc(db, "courses", courseId), (snap) => {
      setCourse({ id: snap.id, ...snap.data() } as Course);
    });
    const unsubAssigns = getAssignments(courseId, setAssignments);

    // Listen to all comments for this course
    const qComments = query(collection(db, "materialComments"), where("courseId", "==", courseId));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setAllMaterialComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubCompletion = () => {};
    if (profile?.role === 'student' && profile.uid) {
      unsubCompletion = getCourseCompletionForStudent(courseId, profile.uid, setCompletion);
    }

    let unsubAllCompletions = () => {};
    if (profile?.role === 'professor') {
      unsubAllCompletions = getAllCourseCompletions(courseId, setAllCompletions);
    }

    return () => {
      unsubCourse();
      unsubAssigns();
      unsubComments();
      unsubCompletion();
      unsubAllCompletions();
    };
  }, [courseId, profile]);

  const handleSubmitCourseForGrading = async () => {
    if (!profile || !course || quizScore === null) return;
    setIsSubmittingGraduation(true);
    try {
      await submitCourseForGrading(
        course.id,
        course.title,
        profile.uid,
        profile.fullName,
        quizScore,
        quiz.length,
        course.skills || []
      );
      toast.success("Cursul a fost trimis spre evaluare finală de către profesor!");
    } catch (err) {
      console.error(err);
      toast.error("Eroare la trimiterea cursului spre evaluare.");
    } finally {
      setIsSubmittingGraduation(false);
    }
  };

  const handleGradeCourse = async () => {
    if (!gradingCompletion) return;
    try {
      await gradeCourseCompletion(
        gradingCompletion.id,
        gradingCompletion.studentId,
        gradingCompletion.courseId,
        gradingCompletion.courseTitle,
        finalGradeData.grade,
        finalGradeData.feedback,
        gradingCompletion.skills || []
      );
      setGradingCompletion(null);
      setFinalGradeData({ grade: 10, feedback: '' });
      toast.success("Notă înregistrată cu succes și trimisă studentului!");
    } catch (err) {
      console.error(err);
      toast.error("Eroare la salvarea notei finale.");
    }
  };

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
      toast.success("Test generated by AI!");
    } catch (err) {
      toast.error("Error generating the test.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === quiz[currentQuizStep].correctIndex;
    if (isCorrect) {
      toast.success("Correct!");
    } else {
      toast.error("Incorrect.");
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
      toast.success("Assignment added!");
    } catch (err) {
      toast.error("Error adding the assignment.");
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
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        uploadedAt: Date.now()
      } as any);
      
      toast.success("Material uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error uploading material.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitWork = async (assignmentId: string) => {
    if (!profile || !courseId || !selectedFile) {
        toast.error("Please select a file.");
        return;
    }
    
    setIsUploading(true);
    try {
      const path = `assignments/${assignmentId}/submissions/${profile.uid}_${Date.now()}_${selectedFile.name}`;
      const { downloadURL } = await uploadFile(selectedFile, path);

      const existingSub = submissions.find(s => s.assignmentId === assignmentId && s.studentId === profile.uid);

      if (existingSub && existingSub.status === 'pending') {
        const submissionRef = doc(db, "submissions", existingSub.id);
        await updateDoc(submissionRef, {
          fileUrl: downloadURL,
          fileName: selectedFile.name,
          submittedAt: serverTimestamp()
        });
        toast.success("Submission updated successfully!");
      } else {
        await submitAssignment({
          assignmentId,
          courseId,
          studentId: profile.uid,
          studentName: profile.fullName,
          fileUrl: downloadURL,
          fileName: selectedFile.name
        });
        toast.success("Assignment submitted successfully!");
      }
      
      setIsSubmitting(null);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Error submitting the assignment.");
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
      toast.success("Grade saved successfully!");
    } catch (err) {
      toast.error("Error processing grade.");
    }
  };

  const handleSendComment = async (materialName: string) => {
    if (!profile || !newCommentText.trim() || !courseId) return;
    setIsSendingComment(true);
    try {
      await addDoc(collection(db, "materialComments"), {
        courseId,
        materialName,
        userId: profile.uid,
        userName: profile.fullName,
        content: newCommentText.trim(),
        createdAt: serverTimestamp()
      });
      setNewCommentText("");
      toast.success("Comment added successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error posting comment.");
    } finally {
      setIsSendingComment(false);
    }
  };

  if (!course) return null;

  const formatRelativeTime = (time: number) => {
    const diff = Date.now() - time;
    if (diff < 60000) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  const feedItems = [
    ...(course.materials || []).map((m: any) => ({
      id: `material-${m.name}-${m.uploadedAt || 0}`,
      type: "material",
      title: "Resources Updated",
      description: `Prof. ${course.professorName} added "${m.name}" to the library.`,
      timestamp: m.uploadedAt || (course.createdAt?.toDate ? course.createdAt.toDate().getTime() : (course.createdAt?.seconds ? course.createdAt.seconds * 1000 : Date.now())),
      color: "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]",
      textColor: "text-indigo-400"
    })),
    ...(assignments || []).map((a: any) => ({
      id: `assignment-${a.id}`,
      type: "assignment",
      title: "New Assignment Posted",
      description: `"${a.title}" is open for submissions. Due date: ${format(a.dueDate, "d MMMM")}.`,
      timestamp: a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now()),
      color: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
      textColor: "text-rose-400"
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

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
               <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Coordinator</p>
               <p className="text-sm font-black text-[var(--text-main)] font-display uppercase tracking-tight">{course.professorName}</p>
            </div>
         </div>

         <div className="flex flex-wrap gap-3 mt-12 bg-[var(--bg-app)]/50 p-2 rounded-[2.5rem] w-fit border border-[var(--glass-border)] backdrop-blur-xl">
            {[
              { id: 'materials', label: 'Materials', icon: FileText },
              { id: 'assignments', label: 'Active Assignments', icon: Plus },
              { id: 'quiz', label: 'Evaluation', icon: BrainCircuit }
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
                      <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight font-display uppercase">Digital Library</h3>
                      <p className="text-xs font-medium text-[var(--text-muted)]">Upload the resources needed for the course.</p>
                    </div>
                    <label className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-all shadow-xl shadow-indigo-100">
                       <Plus className="w-5 h-5" /> 
                       {isUploading ? "Processing..." : "Add Resource"}
                       <input type="file" className="hidden" onChange={handleUploadMaterial} disabled={isUploading} />
                    </label>
                 </div>
               )}
               
               <div className="grid grid-cols-1 gap-6">
                  {course.materials.length === 0 ? (
                     <div className="py-20 text-center glass rounded-[3rem] border-dashed border-2 border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                          <FileText className="w-10 h-10" />
                        </div>
                        <p className="text-[var(--text-main)] font-black text-lg uppercase tracking-widest opacity-60">Empty Library</p>
                        <p className="text-[var(--text-muted)] font-medium">No materials have been uploaded yet.</p>
                     </div>
                  ) : (
                     course.materials.map((m, i) => {
                       const commentsCount = allMaterialComments.filter(c => c.materialName === m.name).length;
                       const commentsExpanded = expandedMaterialCommentsIndex === i;
                       
                       return (
                         <div key={i} className="space-y-4">
                           <motion.div 
                             whileHover={{ scale: 1.01, y: -2 }}
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
                                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Source: StudentLink Assets</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button
                                   onClick={() => setExpandedMaterialCommentsIndex(commentsExpanded ? null : i)}
                                   className={cn(
                                     "px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border",
                                     commentsExpanded
                                       ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                       : "text-slate-400 hover:text-indigo-600 hover:bg-white border-slate-100"
                                   )}
                                 >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Comments ({commentsCount})</span>
                                 </button>
                                 <a 
                                   href={m.url} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                                 >
                                    <Download className="w-5 h-5" />
                                 </a>
                              </div>
                           </motion.div>
                           
                           {/* Expandable comments thread */}
                           <AnimatePresence>
                             {commentsExpanded && (
                               <motion.div
                                 initial={{ opacity: 0, height: 0 }}
                                 animate={{ opacity: 1, height: "auto" }}
                                 exit={{ opacity: 0, height: 0 }}
                                 className="glass p-8 rounded-[2.5rem] border border-indigo-100 bg-indigo-50/20 overflow-hidden space-y-6 ml-6"
                               >
                                 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                   {allMaterialComments.filter(c => c.materialName === m.name).length === 0 ? (
                                     <p className="text-xs text-slate-400 font-medium py-6 text-center">No comments yet. Initiate the conversation!</p>
                                   ) : (
                                     allMaterialComments
                                       .filter(c => c.materialName === m.name)
                                       .sort((a, b) => {
                                         const t1 = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.seconds * 1000 || 0;
                                         const t2 = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.seconds * 1000 || 0;
                                         return t1 - t2;
                                       })
                                       .map((comment) => (
                                         <div key={comment.id} className="flex gap-4 bg-white/60 p-5 rounded-2xl border border-white/5 shadow-sm">
                                           <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                             {comment.userName?.charAt(0) || "U"}
                                           </div>
                                           <div className="space-y-1.5 min-w-0 flex-1">
                                             <div className="flex justify-between items-baseline">
                                               <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{comment.userName}</span>
                                               <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                 {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), "HH:mm, d MMM") : "Just now"}
                                               </span>
                                             </div>
                                             <p className="text-xs text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                                           </div>
                                         </div>
                                       ))
                                   )}
                                 </div>
                                 <form 
                                   onSubmit={(e) => {
                                     e.preventDefault();
                                     handleSendComment(m.name);
                                   }}
                                   className="flex gap-3 pt-4 border-t border-white/40"
                                 >
                                   <input 
                                     type="text" 
                                     required
                                     placeholder="Type a comment in English..." 
                                     className="flex-1 px-5 py-4 bg-white border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-xs font-medium text-[var(--text-main)]"
                                     value={newCommentText}
                                     onChange={(e) => setNewCommentText(e.target.value)}
                                   />
                                   <button 
                                     type="submit"
                                     disabled={isSendingComment || !newCommentText.trim()}
                                     className="bg-indigo-600 disabled:bg-slate-200 text-white px-8 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md"
                                   >
                                     {isSendingComment ? "Sending..." : "Send"} <Send className="w-3.5 h-3.5" />
                                   </button>
                                 </form>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       );
                     })
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
                      <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight font-display uppercase">Evaluation Hub</h3>
                      <p className="text-xs font-medium text-[var(--text-muted)]">Plan new assignments for your students.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingAssignment(true)}
                      className="bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl"
                    >
                      <Plus className="w-5 h-5" /> Create Assignment
                    </button>
                 </div>
               )}

               {isAddingAssignment && (
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-8 space-y-4">
                    <h4 className="font-bold text-indigo-900">Add New Assignment</h4>
                    <input 
                      type="text" 
                      placeholder="Assignment Title" 
                      className="w-full p-3 bg-white rounded-xl border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                    />
                    <textarea 
                      placeholder="Assignment requirements description..." 
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
                       <button onClick={() => setIsAddingAssignment(false)} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>
                       <button onClick={handleAddAssignment} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Save</button>
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
                             <History className="w-3.5 h-3.5" /> Posted 2 days ago
                          </p>
                       </div>
                       <div className="flex items-center gap-2 text-rose-500 bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100">
                          <AlertCircle className="w-4 h-4" />
                          Due: {format(a.dueDate, "d MMMM")}
                       </div>
                    </div>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed border-l-4 border-indigo-100 pl-6 border-dotted">
                      {a.description}
                    </p>
                    
                      <div className="flex justify-end pt-8 border-t border-slate-100/50 gap-4">
                        {profile?.role === 'student' ? (
                          <div className="w-full space-y-4">
                            {submissions.some(s => s.assignmentId === a.id) ? (
                              <div className="w-full space-y-4">
                                <div className="glass p-8 rounded-[2.5rem] border border-[var(--glass-border)] flex items-center justify-between bg-[var(--bg-app)]/40 shadow-glow-sm group hover:bg-[var(--bg-app)]/60 transition-all">
                                  <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200/50 group-hover:scale-110 transition-transform">
                                      <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-1">Status: Submitted</p>
                                      <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight line-clamp-1">{submissions.find(s => s.assignmentId === a.id)?.fileName}</p>
                                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Submitted at {format(submissions.find(s => s.assignmentId === a.id)?.submittedAt?.toDate() || new Date(), "HH:mm, d MMM")}</p>
                                    </div>
                                  </div>
                                  
                                  {submissions.find(s => s.assignmentId === a.id)?.status === 'graded' ? (
                                    <div className="text-right space-y-3">
                                      <div className="inline-flex items-center justify-center px-8 py-4 bg-slate-800 text-white rounded-[1.8rem] font-black shadow-2xl shadow-indigo-200 text-2xl group-hover:bg-indigo-600 transition-colors">
                                        <span className="text-[10px] text-indigo-400 mr-3 uppercase not-italic tracking-widest">Score:</span> {submissions.find(s => s.assignmentId === a.id)?.grade}
                                      </div>
                                      {submissions.find(s => s.assignmentId === a.id)?.feedback && (
                                      <div className="glass p-5 rounded-[1.8rem] border border-[var(--glass-border)] relative shadow-sm max-w-[200px]">
                                          <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-[8px] font-black text-white uppercase tracking-[0.2em] rounded-full">AI Evaluation</div>
                                          <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">"{submissions.find(s => s.assignmentId === a.id)?.feedback}"</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-end gap-2">
                                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-5 py-2 rounded-full uppercase tracking-[0.2em] border border-amber-100 animate-pulse shadow-sm">Grading in Progress</span>
                                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tighter">Awaiting feedback</p>
                                    </div>
                                  )}
                                </div>
                                {submissions.find(s => s.assignmentId === a.id)?.status === 'pending' && (
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsSubmitting(isSubmitting === a.id ? null : a.id)}
                                    className="w-full py-4 glass bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-600 text-amber-600 dark:text-amber-400 hover:text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border border-amber-100 dark:border-amber-900/40 shadow-2xl"
                                  >
                                    Modify Submission <Sparkles className="w-4 h-4 text-amber-400 dark:text-white" />
                                  </motion.button>
                                )}
                              </div>
                            ) : (
                              <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsSubmitting(isSubmitting === a.id ? null : a.id)}
                                className="w-full bg-indigo-600 text-white px-8 py-5 rounded-[1.8rem] text-[10px] font-black shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-slate-800 uppercase tracking-[0.2em] transition-all"
                              >
                                Submit Assignment <Send className="w-4 h-4" />
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
                            {viewingSubmissionsFor === a.id ? "Monitoring active" : "View Submissions"} <Users className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    <AnimatePresence>
                      {profile?.role === 'professor' && viewingSubmissionsFor === a.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="mt-8 border-t border-slate-100/50 pt-8 space-y-6 overflow-hidden"
                        >
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Student Submissions ({submissions.filter(s => s.assignmentId === a.id).length})</h5>
                            <button 
                              onClick={() => setViewingSubmissionsFor(null)}
                              className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors"
                            >
                              Close View
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            {submissions.filter(s => s.assignmentId === a.id).length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium py-8 text-center glass rounded-2xl border border-dashed border-slate-200">No submissions received yet for this assignment.</p>
                            ) : (
                              submissions.filter(s => s.assignmentId === a.id).map(sub => (
                                <div key={sub.id} className="glass p-6 rounded-[2rem] border border-slate-100/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-200 transition-all bg-[var(--bg-app)]/20 shadow-sm text-left">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm uppercase">
                                      {sub.studentName?.charAt(0) || "S"}
                                    </div>
                                    <div className="space-y-1 text-left">
                                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{sub.studentName}</p>
                                      <p className="text-[10px] text-[var(--text-muted)] font-medium flex flex-wrap items-center gap-2">
                                        <span>File: <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline font-bold">{sub.fileName}</a></span>
                                        <span className="text-slate-300">•</span> 
                                        <span>Submitted: {sub.submittedAt?.toDate ? format(sub.submittedAt.toDate(), "d MMM HH:mm") : "Just now"}</span>
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 self-end sm:self-center">
                                    {sub.status === 'graded' ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-150 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                          Grade: {sub.grade}/10
                                        </span>
                                        <button
                                          onClick={() => {
                                            setGradingSubmission(sub);
                                            setGradeData({ grade: sub.grade || 10, feedback: sub.feedback || '' });
                                          }}
                                          className="text-[9px] font-black text-indigo-600 hover:text-indigo-850 uppercase tracking-widest px-3 py-1.5 border border-indigo-150 rounded-full hover:bg-indigo-50 transition-all"
                                        >
                                          Edit Grade
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setGradingSubmission(sub);
                                          setGradeData({ grade: 10, feedback: '' });
                                        }}
                                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-indigo-100"
                                      >
                                        Grade
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}

                      {isSubmitting === a.id && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: "auto" }} 
                          exit={{ opacity: 0, height: 0 }} 
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="mt-6 overflow-hidden"
                        >
                           <div className="p-8 glass rounded-[2.5rem] border border-indigo-100 bg-indigo-50/30 space-y-6">
                              <div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">
                                  {submissions.some(s => s.assignmentId === a.id) ? "Modify Submission" : "Digital Upload"}
                                </p>
                                <h5 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                                  {submissions.some(s => s.assignmentId === a.id) ? "Update Your Submitted File" : "Upload Your Assignment"}
                                </h5>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-[var(--glass-border)] rounded-[2rem] p-12 bg-[var(--bg-app)]/40 hover:border-indigo-500 hover:bg-[var(--bg-app)]/60 hover:shadow-2xl transition-all cursor-pointer group">
                                   <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-4 shadow-sm">
                                      <Download className="w-8 h-8" />
                                   </div>
                                   <span className="text-sm font-black text-[var(--text-main)] tracking-tight text-center px-4">
                                      {selectedFile 
                                        ? selectedFile.name 
                                        : submissions.some(s => s.assignmentId === a.id)
                                          ? `Currently Submitted: ${submissions.find(s => s.assignmentId === a.id)?.fileName}` 
                                          : "Click to select file"
                                      }
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
                                    Cancel
                                 </button>
                                 <button 
                                    onClick={() => handleSubmitWork(a.id)} 
                                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-2xl shadow-indigo-100 disabled:bg-slate-200 uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2"
                                    disabled={!selectedFile || isUploading}
                                 >
                                    {isUploading 
                                      ? "Submitting..." 
                                      : submissions.some(s => s.assignmentId === a.id) 
                                        ? "Update Submission" 
                                        : "Submit to Professor"
                                    }
                                    {!isUploading && <Send className="w-3.5 h-3.5" />}
                                 </button>
                              </div>
                           </div>
                        </motion.div>           
                      )}
                    </AnimatePresence>
                 </motion.div>
               ))}
               {assignments.length === 0 && (
                 <p className="text-center py-12 text-slate-400 font-bold">There are no active assignments.</p>
               )}
            </motion.div>
          )}

          {activeTab === 'quiz' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-10 rounded-[3rem] border border-[var(--glass-border)] shadow-glow-indigo bg-[var(--bg-app)]/20"
            >
              {profile?.role === 'professor' ? (
                // PROFESSOR GRADUATION DASHBOARD
                <div className="space-y-10 text-left">
                  <div className="border-b border-slate-100 pb-6">
                    <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight font-display uppercase">Evaluări Studenți</h3>
                    <p className="text-xs font-semibold text-[var(--text-muted)]">Vizualizează rezultatele testelor AI și acordă notele finale.</p>
                  </div>

                  {allCompletions.length === 0 ? (
                    <div className="py-20 text-center glass rounded-[3rem] border-dashed border-2 border-slate-200">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <p className="text-[var(--text-main)] font-black text-lg uppercase tracking-widest opacity-60">Toate bune!</p>
                      <p className="text-[var(--text-muted)] font-medium">Nu există nicio evaluare înregistrată pentru acest curs.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {allCompletions.map((comp) => (
                        <div key={comp.id} className="glass p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-indigo-200 hover:shadow-glow transition-all">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg uppercase shadow-lg">
                                {comp.studentName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{comp.studentName}</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Student ID: {comp.studentId.substring(0, 8)}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-150">
                                AI Test Score: {comp.quizScore} / {comp.quizTotal}
                              </span>
                              {comp.status === 'graded' ? (
                                <>
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-150 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Nota Finală: {comp.grade} / 10
                                  </span>
                                  {comp.feedback && (
                                    <span className="text-[9px] font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-tight max-w-xs truncate" title={comp.feedback}>
                                      Obs: "{comp.feedback}"
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-150 animate-pulse">
                                  În Așteptare Notă Finală
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {comp.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setGradingCompletion(comp);
                                setFinalGradeData({ grade: 10, feedback: '' });
                              }}
                              className="bg-indigo-600 text-white px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-indigo-100 cursor-pointer"
                            >
                              Grade Course <Trophy className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 border border-emerald-200 rounded-full flex items-center gap-1.5 shadow-sm">
                                Notat <CheckCircle className="w-3.5 h-3.5 text-emerald-650" />
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // STUDENT TRAJECTORY FLOW
                completion ? (
                  completion.status === 'pending' ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-8 shadow-xl animate-pulse">
                        <BrainCircuit className="w-12 h-12" />
                      </div>
                      <h4 className="text-3xl font-black text-[var(--text-main)] tracking-tight font-display mb-4 uppercase">Evaluation in Progress</h4>
                      <p className="text-[var(--text-muted)] max-w-sm mx-auto mt-2 mb-10 font-medium text-lg leading-relaxed">
                        The AI test has been completed successfully! Score: <strong>{completion.quizScore} / {completion.quizTotal}</strong>.
                      </p>
                      <div className="glass p-8 rounded-[2rem] border border-amber-100 bg-amber-50/20 max-w-md mx-auto text-amber-700 text-xs font-black uppercase tracking-wider leading-relaxed">
                        The course has been submitted for final coordinator evaluation. You will be notified once your grade and unlocked skills are added to your profile!
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-8">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-32 h-32 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-4 shadow-2xl relative"
                      >
                        <Trophy className="w-16 h-16 animate-float" />
                        <div className="absolute -top-2 -right-2 bg-slate-800 text-[9px] font-black px-3 py-1 rounded-full uppercase text-white">Graduated</div>
                      </motion.div>
                      
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">Congratulations, you graduated!</h3>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Course successfully completed</p>
                      </div>

                      <div className="inline-flex items-center justify-center px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-3xl shadow-lg">
                        <span className="text-[10px] text-emerald-200 mr-3 uppercase tracking-widest font-black">Your final grade:</span> {completion.grade} / 10
                      </div>

                      {completion.feedback && (
                        <div className="glass p-8 rounded-[2.5rem] border border-slate-150 max-w-lg mx-auto text-left relative bg-white/60">
                          <div className="absolute -top-3 left-8 px-3 py-1 bg-indigo-650 text-[8px] font-black text-white uppercase tracking-[0.2em] rounded-full">Professor Remarks</div>
                          <p className="text-xs text-slate-655 font-semibold leading-relaxed text-slate-700">"{completion.feedback}"</p>
                        </div>
                      )}

                      {completion.skills && completion.skills.length > 0 && (
                        <div className="max-w-lg mx-auto text-left space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Unlocked Skills</p>
                          <div className="flex flex-wrap gap-3">
                            {completion.skills.map((s) => (
                              <span key={s} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  // STANDARD STUDENT QUIZ RENDERER
                  quiz.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-xl animate-float">
                        <BrainCircuit className="w-12 h-12" />
                      </div>
                      <h4 className="text-3xl font-black text-[var(--text-main)] tracking-tight font-display mb-4 uppercase">AI Course Synthesis</h4>
                      <p className="text-[var(--text-muted)] max-w-sm mx-auto mt-2 mb-10 font-medium text-lg leading-relaxed">The AI system will analyze course materials to generate a knowledge evaluation.</p>
                      <button 
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="bg-slate-800 text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-3 mx-auto shadow-2xl shadow-slate-200 hover:bg-slate-900 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-[10px]"
                      >
                        {isGeneratingQuiz ? 'Analyzing Materials...' : 'Generate Evaluation Test'}
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
                         <div className="absolute -top-2 -right-2 bg-slate-800 text-[10px] font-black px-3 py-1 rounded-full uppercase">Final Score</div>
                      </motion.div>
                      <h3 className="text-5xl font-black text-[var(--text-main)] tracking-tighter mb-4">{quizScore} / {quiz.length}</h3>
                      <p className="text-slate-500 max-w-md mx-auto font-medium text-lg mb-10 leading-relaxed border-l-4 border-indigo-100 pl-6">
                        {quizScore === quiz.length ? "Excellent! You have demonstrated full understanding of the resources." : quizScore >= quiz.length / 2 ? "Solid performance. Algorithms confirm a stable knowledge base." : "Incomplete synthesis. Reviewing the source materials is highly recommended."}
                      </p>
                      
                      <div className="mt-12 space-y-4 max-w-lg mx-auto text-left">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 mb-4">Detailed Report</p>
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
                           onClick={handleSubmitCourseForGrading}
                           disabled={isSubmittingGraduation}
                           className="px-10 py-5 bg-emerald-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-100 disabled:opacity-50"
                         >
                           {isSubmittingGraduation ? "Sending..." : "Submit Course for Final Grading"} <CheckCircle className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => {setQuizScore(null); setCurrentQuizStep(0); setSelectedAnswer(null);}} 
                           className="px-10 py-5 bg-indigo-650 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl"
                         >
                           <History className="w-4 h-4" /> Retry Quiz
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                       <div className="flex items-center justify-between">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Active Session</p>
                             <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Question {currentQuizStep + 1} <span className="text-slate-300">/ {quiz.length}</span></h4>
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
                         Submit Answer
                       </button>
                    </div>
                  )
                )
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
                 <History className="w-4 h-4 text-indigo-600" /> Activity Feed 24h
              </h3>
              <div className="space-y-6">
                {feedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium py-6 text-center">No activity recorded yet.</p>
                ) : (
                  feedItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex gap-4 group/item">
                      <div className={cn("w-1 rounded-full h-12 transition-all group-hover/item:h-16 shrink-0", item.color)} />
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">{item.title}</p>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{item.description}</p>
                        <p className={cn("text-[8px] font-black uppercase", item.textColor)}>
                          {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white max-w-lg w-full rounded-[3.5rem] shadow-2xl p-12 space-y-10 relative overflow-hidden border border-slate-200 text-slate-900"
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60" />
               <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-650 uppercase tracking-[0.4em]">Evaluation System</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter font-display uppercase">Portfolio Evaluation</h3>
                  </div>
                  <button onClick={() => setGradingSubmission(null)} className="p-4 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer"><X className="w-6 h-6" /></button>
               </div>

               <div className="p-6 bg-slate-50 border border-slate-150 rounded-[2.5rem] flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-indigo-500/20">
                    {gradingSubmission.studentName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{gradingSubmission.studentName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-indigo-650 font-black uppercase tracking-widest border border-indigo-150 px-2 py-0.5 rounded-md bg-indigo-50">ID: {gradingSubmission.studentId.substring(0, 8)}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{format(gradingSubmission.submittedAt?.toDate() || new Date(), "d MMM HH:mm")}</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between px-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Academic Grade (1-10)</label>
                       <span className="text-xs font-black text-indigo-600">{gradeData.grade}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      value={gradeData.grade}
                      onChange={(e) => setGradeData({...gradeData, grade: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-500 px-1">
                      <span>MIN: 1</span>
                      <span>MAX: 10</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Feedback & Remarks</label>
                    <textarea 
                      placeholder="Your analysis here..." 
                      className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[150px] placeholder:text-slate-400 focus:bg-white transition-all resize-none shadow-sm"
                      value={gradeData.feedback}
                      onChange={(e) => setGradeData({...gradeData, feedback: e.target.value})}
                    />
                  </div>
               </div>

               <button 
                 onClick={handleGrade}
                 className="w-full py-6 bg-indigo-650 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-slate-800 transition-all transform active:scale-95 uppercase tracking-[0.2em] text-[12px] cursor-pointer"
               >
                 Submit Grade
               </button>
            </motion.div>
          </div>
        )}

        {gradingCompletion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white max-w-lg w-full rounded-[3.5rem] shadow-2xl p-12 space-y-10 relative overflow-hidden border border-slate-200 text-slate-900"
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
               <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-emerald-650 uppercase tracking-[0.4em]">Final Course Evaluation</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter font-display uppercase">Course Evaluation</h3>
                  </div>
                  <button onClick={() => setGradingCompletion(null)} className="p-4 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer"><X className="w-6 h-6" /></button>
               </div>

               <div className="p-6 bg-slate-50 border border-slate-150 rounded-[2.5rem] flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-emerald-500/20">
                    {gradingCompletion.studentName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{gradingCompletion.studentName}</p>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-emerald-650 font-black uppercase tracking-widest border border-emerald-150 px-2 py-0.5 rounded-md bg-emerald-50">ID: {gradingCompletion.studentId.substring(0, 8)}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{format(gradingCompletion.submittedAt?.toDate() || new Date(), "d MMM HH:mm")}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold mt-1">
                        AI Test Score: <strong className="text-indigo-600">{gradingCompletion.quizScore}/{gradingCompletion.quizTotal}</strong>
                      </span>
                    </div>
                  </div>
               </div>

               {gradingCompletion.skills && gradingCompletion.skills.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Unlocked Skills</p>
                   <div className="flex flex-wrap gap-1.5">
                     {gradingCompletion.skills.map((skill, idx) => (
                       <span key={idx} className="text-[9px] font-black bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                         {skill}
                       </span>
                     ))}
                   </div>
                 </div>
               )}

               <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between px-2">
                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Final Grade (1-10)</label>
                       <span className="text-xs font-black text-emerald-600">{finalGradeData.grade}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      value={finalGradeData.grade}
                      onChange={(e) => setFinalGradeData({...finalGradeData, grade: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-500 px-1">
                      <span>MIN: 1</span>
                      <span>MAX: 10</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Feedback & Remarks</label>
                    <textarea 
                      placeholder="Enter student feedback..." 
                      className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 min-h-[120px] placeholder:text-slate-400 focus:bg-white transition-all resize-none shadow-sm"
                      value={finalGradeData.feedback}
                      onChange={(e) => setFinalGradeData({...finalGradeData, feedback: e.target.value})}
                    />
                  </div>
               </div>

               <button 
                 onClick={handleGradeCourse}
                 className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:bg-slate-800 transition-all transform active:scale-95 uppercase tracking-[0.2em] text-[12px] cursor-pointer"
               >
                 Submit Grade
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
