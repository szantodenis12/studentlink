import React, { useState, useEffect } from "react";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { generateCareerAdvice } from "../services/geminiService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { uploadFile } from "../services/storageService";
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
  X
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

  const handleGenerateAdvice = async () => {
    if (!profile) return;
    
    setIsGenerating(true);
    try {
      const data = await generateCareerAdvice(
        profile.fullName,
        profile.academicData?.grades || { "Matematică": 10, "Informatică": 9, "Economie": 8 },
        profile.academicData?.strengths || ["Analiză de date", "Rezolvare de probleme", "Comunicare"]
      );
      setAdvice(data || "Nu s-a putut genera recomandarea.");
      toast.success("Consiliere carieră generată cu succes!");
    } catch (err) {
      toast.error("Eroare la generarea consilierii AI.");
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

      toast.success("Profil actualizat!");
      setIsEditing(false);
      setSelectedFile(null);
    } catch (err) {
      toast.error("Eroare la salvare.");
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
                  placeholder="Nume Complet"
                />
              ) : (
                <h2 className="text-3xl font-black text-center tracking-tighter uppercase">{profile.fullName}</h2>
              )}
              <div className="inline-flex px-4 py-1.5 glass rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 border-indigo-500/20">
                 {profile.role}
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
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Punct de Contact</p>
                  <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{profile.email}</p>
               </div>
             </div>
             <div className="flex items-center gap-5 group/item">
               <div className="w-14 h-14 rounded-[1.5rem] glass flex items-center justify-center text-[var(--text-muted)] group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 group-hover/item:shadow-glow transition-all">
                 <Target className="w-6 h-6" />
               </div>
               <div className="flex-1">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{profile.role === 'professor' ? 'Domeniu Expertiză' : 'Sursă Academică'}</p>
                  {isEditing ? (
                    <input 
                      className="w-full bg-[var(--bg-app)] border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-black text-[var(--text-main)] outline-none uppercase tracking-tight"
                      value={editData.specialization}
                      onChange={(e) => setEditData({...editData, specialization: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{profile.specialization || (profile.role === 'professor' ? 'Conferențiar Universitar' : 'Informatică Economică')}</p>
                  )}
               </div>
             </div>

             {isEditing ? (
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Descriere Personală (Bio)</p>
                 <textarea 
                   className="w-full bg-[var(--bg-app)] border border-slate-100 dark:border-slate-800 rounded-[1.8rem] px-6 py-4 text-sm font-medium text-[var(--text-main)] outline-none min-h-[120px] shadow-inner"
                   value={editData.bio}
                   onChange={(e) => setEditData({...editData, bio: e.target.value})}
                   placeholder="Spune ceva despre tine..."
                 />
               </div>
             ) : (
               profile.bio && (
                 <div className="space-y-2">
                   <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Descriere Bio</p>
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
                 {isSaving ? "Se salvează..." : <><Save className="w-5 h-5 transition-transform group-hover:scale-110" /> Salvează Modificările</>}
               </button>
             )}
          </div>

          <div className="glass rounded-[2.5rem] p-8 shadow-xl self-start">
            <h3 className="text-xs font-black text-[var(--text-main)] mb-6 flex items-center gap-3 uppercase tracking-widest">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {profile.role === 'professor' ? 'Plan Didactic' : 'Situație Academică'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {profile.role === 'professor' ? (
                <>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cursuri Active</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">04</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Feedback Network</p>
                    <p className="text-3xl font-black text-indigo-600">{profile.rating || '4.9'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cursuri Absolvite</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">{completedCoursesCount}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Media Generală</p>
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
               {profile.role === 'professor' ? 'Module Expertiză' : 'Arii de Performanță'}
             </h3>
             <div className="flex flex-wrap gap-3">
               {(profile.role === 'professor' ? (profile.mentorshipSubjects || ["Arhitectură Software", "AI & ML", "Management Proiecte"]) : (profile.academicData?.strengths || ["Algoritmi", "Analiză Date", "Leadership"])).map(s => (
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
                <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">Consilier Carieră AI</h3>
                <p className="text-slate-400 text-sm font-medium mb-10 opacity-90 leading-relaxed border-l-2 border-indigo-500/50 pl-6">
                  Sisteme inteligente analizează traiectoria ta pentru a genera strategii de carieră și oportunități profesionale.
                </p>
                <button
                  onClick={handleGenerateAdvice}
                  disabled={isGenerating}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95 group"
                >
                  {isGenerating ? "Se procesează..." : "Generează Strategie"}
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
                <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">Centru Digital de Predare</h3>
                <p className="text-slate-400 text-sm font-medium mb-10 opacity-90 leading-relaxed border-l-2 border-indigo-500/50 pl-6">
                  Sistem de monitorizare a performanței cursurilor și optimizare a materialelor didactice prin LLM.
                </p>
                <button
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-800 hover:border hover:border-white/20 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                >
                  Acces Module <ArrowRight className="w-5 h-5" />
                </button>
               </div>
             </div>
           )}
        </div>

        {/* AI Content Section */}
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
                        <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter">Strategie Carieră</h3>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Consiliere v1.0.4</p>
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
                  <h4 className="text-2xl font-black text-[var(--text-muted)] uppercase tracking-widest">Date lipsă</h4>
                  <p className="text-[var(--text-muted)] mt-4 max-w-xs font-semibold">Apasă pe butonul de analiză pentru a procesa profilul tău pentru recomandări de carieră.</p>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="glass p-12 rounded-[4rem] h-full flex flex-col items-center justify-center text-center">
               <div className="w-28 h-28 glass rounded-[3rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8 shadow-glow-indigo transition-transform hover:scale-110">
                  <Cpu className="w-12 h-12" />
               </div>
               <h3 className="text-3xl font-black text-[var(--text-main)] font-display tracking-tight mb-4 uppercase">Portal Statistici Profesori</h3>
               <p className="text-[var(--text-muted)] font-medium max-w-md mx-auto leading-relaxed">
                  Panoul tău central pentru monitorizarea performanței educaționale. În curând, vei putea genera rapoarte de feedback detaliate bazate pe performanța academică a studenților.
               </p>
               <div className="mt-12 flex flex-wrap justify-center gap-6">
                  <div className="px-6 py-3 glass rounded-2xl text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Feedback Elevi</div>
                  <div className="px-6 py-3 glass rounded-2xl text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Analiză Materiale</div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
