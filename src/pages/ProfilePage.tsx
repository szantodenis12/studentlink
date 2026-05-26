import React, { useState, useEffect } from "react";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { generateCareerAdvice } from "../services/geminiService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { uploadFile } from "../services/storageService";
import { getMentorReviews, Review } from "../services/mentorshipService";
import { 
  User, 
  Mail, 
  Award, 
  BrainCircuit, 
  Sparkles, 
  FileText, 
  TrendingUp,
  Cpu,
  Zap,
  Target,
  ArrowRight,
  Edit2,
  Camera,
  Save,
  X,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import Markdown from "react-markdown";

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const [advice, setAdvice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [editData, setEditData] = useState({
    fullName: "",
    specialization: "",
    bio: "",
    photoURL: ""
  });

  const grades = profile?.academicData?.grades || {};
  const gradeValues = Object.values(grades);
  const averageGrade = gradeValues.length > 0 
    ? (gradeValues.reduce((sum, val) => sum + val, 0) / gradeValues.length).toFixed(2)
    : "0.00";
  const completedCoursesCount = profile?.academicData?.completedCourses?.length ?? Object.keys(grades).length;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState("");

  useEffect(() => {
    if (profile) {
      setEditData({
        fullName: profile.fullName || "",
        specialization: profile.specialization || "",
        bio: profile.bio || "",
        photoURL: profile.photoURL || ""
      });
      setPreviewURL(profile.photoURL || "");
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.academicData?.careerRecommendations) {
      setAdvice(profile.academicData.careerRecommendations);
    }
  }, [profile]);

  useEffect(() => {
    if (profile && profile.role === "professor") {
      const unsub = getMentorReviews(profile.uid, setReviews);
      return () => unsub();
    }
  }, [profile]);

  const handleGenerateAdvice = async () => {
    if (!profile) return;
    
    setIsGenerating(true);
    try {
      const data = await generateCareerAdvice(
        profile.fullName,
        profile.academicData?.grades || { "Mathematics": 10, "Computer Science": 9, "Economics": 8 },
        profile.academicData?.strengths || ["Data Analysis", "Problem Solving", "Communication"]
      );
      setAdvice(data || "Could not generate recommendations.");
      toast.success("AI career advice generated successfully!");
    } catch (err) {
      toast.error("Error generating AI career advice.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditSave = async () => {
    if (!user || !profile) return;
    setIsSaving(true);
    try {
      let finalPhotoURL = editData.photoURL;

      if (selectedFile) {
        const path = `users/${user.uid}/profile_${Date.now()}_${selectedFile.name}`;
        const { downloadURL } = await uploadFile(selectedFile, path);
        finalPhotoURL = downloadURL;
      }

      await updateDoc(doc(db, "users", user.uid), {
        ...editData,
        photoURL: finalPhotoURL
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setSelectedFile(null);
    } catch (err) {
      toast.error("Error saving changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-12 pb-12 max-w-6xl mx-auto">
      {/* Profile Header Card */}
      <div className="glass rounded-[3.5rem] overflow-hidden relative group">
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="absolute top-8 right-8 p-4 bg-[var(--bg-app)]/40 hover:bg-slate-800 dark:hover:bg-indigo-600 hover:text-white glass rounded-2xl md:text-indigo-600 dark:md:text-indigo-400 transition-all z-20 shadow-xl"
        >
          {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>

        <div className="bg-slate-900 dark:bg-slate-950 p-12 flex flex-col items-center justify-center text-white md:w-96 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 blur-[60px] rounded-full -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10 space-y-6 flex flex-col items-center w-full">
            <div className="relative group/photo">
              <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600/30 border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group-hover/photo:scale-110 transition-transform">
                {isEditing ? (
                  previewURL ? (
                    <img src={previewURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-white/40" />
                  )
                ) : (
                  profile.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-white">{profile.fullName?.charAt(0)}</span>
                  )
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer hover:bg-indigo-700 transition-all border-4 border-slate-900">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <div className="text-center space-y-2 w-full">
              {isEditing ? (
                <input 
                  className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center font-black text-white outline-none w-full uppercase tracking-tight"
                  value={editData.fullName}
                  onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                  placeholder="Full Name"
                />
              ) : (
                <h2 className="text-3xl font-black text-center tracking-tighter uppercase">{profile.fullName}</h2>
              )}
              <div className="inline-flex px-4 py-1.5 glass rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 border-indigo-500/20">
                 {profile.role === 'student' ? 'Student' : profile.role === 'professor' ? 'Professor' : 'Admin'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-12 flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 bg-[var(--bg-app)]/40 dark:bg-slate-900/20 backdrop-blur-3xl">
          <div className="space-y-8">
             <div className="flex items-center gap-5 group/item">
               <div className="w-14 h-14 rounded-[1.5rem] glass flex items-center justify-center text-[var(--text-muted)] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:shadow-glow transition-all">
                 <Mail className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Contact Point</p>
                  <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{profile.email}</p>
               </div>
             </div>
             <div className="flex items-center gap-5 group/item">
               <div className="w-14 h-14 rounded-[1.5rem] glass flex items-center justify-center text-[var(--text-muted)] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:shadow-glow transition-all">
                 <Target className="w-6 h-6" />
               </div>
               <div className="flex-1">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{profile.role === 'professor' ? 'Expertise Field' : 'Academic Field'}</p>
                  {isEditing ? (
                    <input 
                      className="w-full bg-[var(--bg-app)] border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-black text-[var(--text-main)] outline-none uppercase tracking-tight"
                      value={editData.specialization}
                      onChange={(e) => setEditData({...editData, specialization: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{profile.specialization || (profile.role === 'professor' ? 'University Lecturer' : 'Business Informatics')}</p>
                  )}
               </div>
             </div>

             {isEditing ? (
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Personal Biography (Bio)</p>
                 <textarea 
                   className="w-full bg-[var(--bg-app)] border border-slate-100 dark:border-slate-800 rounded-[1.8rem] px-6 py-4 text-sm font-medium text-[var(--text-main)] outline-none min-h-[120px] shadow-inner"
                   value={editData.bio}
                   onChange={(e) => setEditData({...editData, bio: e.target.value})}
                   placeholder="Tell us about yourself..."
                 />
               </div>
             ) : (
               profile.bio && (
                 <div className="space-y-2">
                   <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Biography</p>
                   <p className="text-sm font-medium text-[var(--text-main)] px-4 py-4 glass border-l-4 border-indigo-600 rounded-[1.5rem] leading-relaxed">"{profile.bio}"</p>
                 </div>
               )
             )}
             
             {isEditing && (
               <button 
                 onClick={handleEditSave}
                 disabled={isSaving}
                 className="w-full flex items-center justify-center gap-4 bg-slate-800 dark:bg-indigo-600 text-white px-10 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all shadow-2xl disabled:opacity-50 group"
               >
                 {isSaving ? "Saving..." : <><Save className="w-5 h-5 transition-transform group-hover:scale-110" /> Save Changes</>}
               </button>
             )}
          </div>

          <div className="glass rounded-[2.5rem] p-8 shadow-xl self-start">
            <h3 className="text-xs font-black text-[var(--text-main)] mb-6 flex items-center gap-3 uppercase tracking-widest">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {profile.role === 'professor' ? 'Teaching Plan' : 'Academic Standing'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {profile.role === 'professor' ? (
                <>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Courses</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">04</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Feedback Network</p>
                    <p className="text-3xl font-black text-indigo-600">{profile.rating ? profile.rating.toFixed(1) : '5.0'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Completed Courses</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">{completedCoursesCount}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Grade Point Average</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{averageGrade}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-10">
           <div className="glass p-10 rounded-[3.5rem]">
             <h3 className="text-lg font-black text-[var(--text-main)] mb-8 flex items-center gap-3 uppercase tracking-tighter">
               <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
               {profile.role === 'professor' ? 'Expertise Modules' : 'Performance Areas'}
             </h3>
             <div className="flex flex-wrap gap-3">
               {(profile.role === 'professor' 
                  ? (profile.mentorshipSubjects && profile.mentorshipSubjects.length > 0 ? profile.mentorshipSubjects : ["Software Architecture", "AI & ML", "Project Management"]) 
                  : (profile.academicData?.strengths && profile.academicData.strengths.length > 0 ? profile.academicData.strengths : ["Algorithms", "Data Analysis", "Leadership"])
                ).map(s => (
                 <span key={s} className="px-5 py-2.5 glass text-[var(--text-main)] rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all">
                   <Zap className="w-3.5 h-3.5 text-indigo-500" /> {s}
                 </span>
               ))}
             </div>
           </div>

           {profile.role === 'student' ? (
             <div className="bg-slate-900 dark:bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/30 dark:bg-indigo-500/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
               </div>
               <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                   <div className="w-16 h-16 glass rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-glow">
                      <BrainCircuit className="w-8 h-8" />
                   </div>
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">AI Career Counselor</h3>
                <p className="text-slate-400 text-sm font-medium mb-10 opacity-90 leading-relaxed border-l-2 border-indigo-500/50 pl-6">
                  Intelligent systems analyze your academic trajectory to generate tailored career strategies and professional opportunities.
                </p>
                <button
                  onClick={handleGenerateAdvice}
                  disabled={isGenerating}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95 group"
                >
                  {isGenerating ? "Analyzing..." : "Generate Strategy"}
                  {!isGenerating && <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                </button>
               </div>
             </div>
           ) : (
             <div className="bg-slate-900 dark:bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 opacity-20">
                  <Cpu className="w-64 h-64 text-indigo-600 dark:text-indigo-400 absolute -bottom-10 -right-10 rotate-12 opacity-10" />
               </div>
               <div className="relative z-10 text-center md:text-left">
                <div className="w-16 h-16 glass rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-glow mb-8 mx-auto md:mx-0">
                   <Cpu className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">Digital Teaching Hub</h3>
                <p className="text-slate-400 text-sm font-medium mb-10 opacity-90 leading-relaxed border-l-2 border-indigo-500/50 pl-6">
                  Monitor class performance and optimize learning resources with integrated AI assistance.
                </p>
                <button
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-800 hover:border hover:border-white/20 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                >
                  Course Modules <ArrowRight className="w-5 h-5" />
                </button>
               </div>
             </div>
           )}
        </div>

        {/* AI Content Section & Reviews for Teachers */}
        <div className="lg:col-span-2">
          {profile.role === 'student' ? (
            <AnimatePresence mode="wait">
              {advice ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass p-12 rounded-[4rem] relative min-h-[500px]"
                >
                  <div className="flex items-center gap-5 mb-12 pb-8 border-b border-[var(--glass-border)]">
                     <div className="w-14 h-14 rounded-[1.5rem] glass flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-glow">
                       <Cpu className="w-8 h-8" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter">Career Strategy</h3>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Counseling v1.0.4</p>
                     </div>
                  </div>
                  
                  <div className="markdown-body prose prose-indigo dark:prose-invert max-w-none text-[var(--text-main)] font-medium leading-relaxed">
                    <Markdown>{advice}</Markdown>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass p-16 rounded-[4rem] border-2 border-dashed border-indigo-100 dark:border-indigo-900/40 bg-[var(--bg-app)]/10 flex flex-col items-center justify-center text-center opacity-70 min-h-[500px]"
                >
                  <div className="w-24 h-24 bg-[var(--bg-app)] rounded-full flex items-center justify-center text-indigo-400 mb-8 shadow-glow-sm animate-float">
                    <Zap className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-[var(--text-muted)] uppercase tracking-widest">No analysis found</h4>
                  <p className="text-[var(--text-muted)] mt-4 max-w-xs font-semibold">Click the analysis button to process your academic profile and generate custom career insights.</p>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
             <div className="glass p-12 rounded-[4rem] flex flex-col h-full gap-8">
                <div className="flex items-center gap-5 pb-8 border-b border-[var(--glass-border)]">
                   <div className="w-14 h-14 rounded-[1.5rem] glass flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-glow">
                     <Star className="w-8 h-8 fill-current text-indigo-500" />
                   </div>
                   <div className="text-left">
                      <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter">Student Reviews & Feedback</h3>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Real-time ratings</p>
                   </div>
                </div>
                
                <div className="space-y-6 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-6 glass bg-[var(--bg-app)]/30 rounded-2xl border border-[var(--glass-border)] flex gap-4 text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-[var(--glass-border)] overflow-hidden shrink-0 flex items-center justify-center font-black text-indigo-700 text-sm">
                          {r.studentName.charAt(0)}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-extrabold text-sm text-[var(--text-main)]">{r.studentName}</h4>
                            <div className="flex items-center gap-1 text-amber-500 text-xs">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="font-black">{r.rating}.0</span>
                            </div>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                            {r.comment}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 opacity-40">
                      <Star className="w-12 h-12 mx-auto mb-2 text-indigo-400 animate-pulse" />
                      <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">No student feedback yet</p>
                      <p className="text-xs font-medium text-[var(--text-muted)]">Your reviews will appear here when students rate your mentorship.</p>
                    </div>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
