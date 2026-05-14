import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { uploadFile } from "../services/storageService";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Camera, User, BookOpen, FileText, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function OnboardingPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    fullName: profile?.fullName || "",
    specialization: profile?.specialization || "",
    bio: profile?.bio || "",
    photoURL: profile?.photoURL || ""
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string>(profile?.photoURL || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleComplete = async () => {
    if (!user || !profile) return;
    setLoading(true);
    
    try {
      let finalPhotoURL = formData.photoURL;

      if (selectedFile) {
        const path = `users/${user.uid}/profile_${Date.now()}_${selectedFile.name}`;
        const { downloadURL } = await uploadFile(selectedFile, path);
        finalPhotoURL = downloadURL;
      }

      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        photoURL: finalPhotoURL,
        profileSetup: true
      });

      toast.success("Profil completat cu succes!");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Eroare la salvarea profilului.");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6 font-sans text-[var(--text-main)]">
      <div className="max-w-2xl w-full">
        {/* Progress Tracker */}
        <div className="flex justify-between mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 flex-1 relative">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10 ${
                  step === s ? "bg-indigo-600 text-white shadow-lg" : 
                  step > s ? "bg-green-500 text-white" : "glass text-[var(--text-muted)] border border-[var(--glass-border)]"
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${step === s ? "text-indigo-600" : "text-[var(--text-muted)]"}`}>
                {s === 1 ? "Identitate" : s === 2 ? "Academic" : "Finalizare"}
              </span>
              {s < 3 && (
                <div className={`absolute left-1/2 top-5 w-full h-[2px] -z-0 ${step > s ? "bg-green-500" : "bg-[var(--glass-border)]"}`}></div>
              )}
            </div>
          ))}
        </div>

        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-[2.5rem] shadow-xl shadow-indigo-900/10 p-10 md:p-16 border border-[var(--glass-border)]"
        >
          {step === 1 && (
            <div className="space-y-8 text-center">
              <div>
                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Hai să ne cunoaștem!</h2>
                <p className="text-[var(--text-muted)] mt-2 font-medium">Cum vrei să apari colegilor tăi?</p>
              </div>

              <div className="relative w-32 h-32 mx-auto">
                <div className="w-full h-full rounded-[2rem] bg-[var(--bg-app)] overflow-hidden border-4 border-indigo-600/20 shadow-inner flex items-center justify-center">
                  {previewURL ? (
                    <img src={previewURL} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-[var(--text-muted)]" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-indigo-700 transition-all border-4 border-white">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Nume Complet</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)]"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={!formData.fullName}
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
              >
                Continuă <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Detalii Academice</h2>
                <p className="text-[var(--text-muted)] mt-2 font-medium">Unde studiezi sau ce predai?</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                     {profile.role === 'student' ? 'Facultate / Specializare' : 'Departament / Catedră'}
                   </label>
                   <div className="relative">
                      <BookOpen className="absolute left-4 top-4 w-5 h-5 text-indigo-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. Facultatea de Matematică și Informatică"
                        className="w-full p-4 pl-12 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)]"
                        value={formData.specialization}
                        onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Descriere Scurtă (Bio)</label>
                   <div className="relative">
                      <FileText className="absolute left-4 top-4 w-5 h-5 text-indigo-400" />
                      <textarea 
                        placeholder="Spune-ne câteva cuvinte despre tine..."
                        className="w-full p-4 pl-12 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)] min-h-[120px]"
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      />
                   </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-bold hover:bg-slate-200 transition-all"
                >
                  Înapoi
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={!formData.specialization}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  Continuă <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 text-center">
               <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto">
                  <Check className="w-12 h-12 stroke-[3px]" />
               </div>
               
               <div>
                 <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Totul este gata!</h2>
                 <p className="text-[var(--text-muted)] mt-4 font-medium px-8">
                   Ești acum parte din comunitatea <span className="text-indigo-600 font-black">STUDENTLINK</span>. 
                   Profilul tău este complet și poți accesa toate funcționalitățile platformei.
                 </p>
               </div>

               <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-bold hover:bg-slate-200 transition-all"
                >
                  Revizuiește
                </button>
                <button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Se salvează..." : "Intră în Platformă"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
