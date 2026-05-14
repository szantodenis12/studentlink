import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { GraduationCap, BookOpen, ShieldCheck, Mail, Lock, UserPlus, LogIn, Chrome, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import logo from "../assets/logo.png";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<"student" | "professor" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [professorKey, setProfessorKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      if (!profile || profile.profileSetup === false) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          fullName: user.displayName || "Utilizator Nou",
          email: user.email,
          role: role,
          photoURL: user.photoURL,
          profileSetup: false,
          createdAt: new Date().toISOString()
        });
      }
      toast.success("Autentificare reușită!");
    } catch (err: any) {
      console.error("Google Auth Error:", err.code, err.message, err);
      setError("Autentificarea cu Google a eșuat. Verifică consola pentru detalii.");
      toast.error("Eroare la autentificare.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (isRegistering) {
        // 1. Validation check for name
        if (!fullName.trim()) {
           setError("Vă rugăm să introduceți numele complet.");
           setLoading(false);
           return;
        }

        // 2. Secret Key Validation for Professors
        if (role === 'professor') {
          // Hardcoding the default key to ensure it works regardless of environment variable propagation
          const secretKey = "prof-secret-2024";
          
          if (professorKey.trim().toLowerCase() !== secretKey.toLowerCase()) {
            setError("Codul de validare profesor este incorect.");
            setLoading(false);
            return;
          }
        }

        // 3. Email domain restriction (Optional but professional)
        if (role === 'professor' && !email.endsWith('@prof.studentlink.ro') && !email.includes('admin')) {
          // Warning but optional for demo purposes, so we'll just log or keep it loose for now
          // If you want it strict: 
          // setError("Profesorii trebuie să folosească o adresă @prof.studentlink.ro");
          // setLoading(false); return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", result.user.uid), {
          fullName,
          email,
          role,
          profileSetup: false,
          createdAt: new Date().toISOString()
        });
        toast.success("Cont creat cu succes!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Bine ai revenit!");
      }
    } catch (err: any) {
      console.error(err);
      setError(isRegistering ? "Crearea contului a eșuat. Verifică datele." : "Email sau parolă incorectă.");
      toast.error("Operațiune eșuată.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col md:flex-row overflow-hidden font-sans relative transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 dark:bg-violet-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Left Pane - Brand & Marketing */}
      <div className="hidden md:flex md:w-[45%] bg-slate-900 p-12 lg:p-24 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-indigo-600/30 to-violet-600/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[80px] rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <img 
              src={logo} 
              alt="StudentLink Logo" 
              className="h-16 w-auto object-contain transition-all hover:scale-105" 
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8 max-w-lg"
          >

            <h2 className="text-6xl lg:text-8xl font-black text-white font-display leading-[1.1] tracking-tighter uppercase">
               Arhitectură<br />Academică<br />Digitală.
            </h2>
            <p className="text-slate-400 text-lg lg:text-xl font-medium leading-relaxed border-l-4 border-indigo-500/50 pl-8">
              Ecosistemul tău de învățare augmentată, unde performanța este definită prin algoritmi de succes.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-12 border-t border-white/5 pt-12">
           <div className="space-y-3">
               <div className="flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em]">
                  <CheckCircle2 className="w-4 h-4" /> Asistent Academic
               </div>
               <p className="text-slate-500 text-sm font-medium leading-tight">Integrare completă între resurse și testări inteligente.</p>
           </div>
           <div className="space-y-3">
               <div className="flex items-center gap-3 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">
                  <ShieldCheck className="w-4 h-4" /> Evoluție Carieră
               </div>
              <p className="text-slate-500 text-sm font-medium leading-tight">Validare profesională bazată pe date reale.</p>
           </div>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-24 relative overflow-y-auto z-10">
        <div className="max-w-md w-full mx-auto space-y-12">
          <div className="md:hidden flex items-center gap-3 mb-12">
            <img 
              src={logo} 
              alt="StudentLink Logo" 
              className="h-10 w-auto object-contain" 
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-5xl font-black text-[var(--text-main)] font-display tracking-tighter uppercase">
              {isRegistering ? "Înregistrare" : "Conectare"}
            </h3>
            <p className="text-[var(--text-muted)] font-medium tracking-tight text-lg">
              {isRegistering ? "Creează-ți profilul academic acum." : "Intră în spațiul tău de studiu."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="group space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">Identitate Completă</label>
                    <input
                      type="text"
                      className="w-full px-8 py-5 glass rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none font-black text-sm shadow-sm placeholder:text-slate-500 dark:placeholder:text-slate-600 uppercase tracking-tight text-[var(--text-main)]"
                      placeholder="e.g. Andrei Ionescu"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Tip de acces:</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'student', name: 'Student', icon: GraduationCap },
                        { id: 'professor', name: 'Profesor', icon: BookOpen }
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id as any)}
                          className={cn(
                            "flex gap-4 items-center p-5 rounded-[1.8rem] border-2 transition-all relative overflow-hidden group",
                            role === r.id 
                              ? "border-indigo-600 bg-[var(--bg-app)] dark:bg-slate-800 shadow-2xl dark:shadow-none shadow-indigo-100 text-indigo-700 dark:text-indigo-400 scale-105" 
                              : "border-slate-100 dark:border-slate-800 bg-[var(--bg-app)]/40 dark:bg-slate-900/40 text-slate-400 hover:border-indigo-200"
                          )}
                        >
                          <r.icon className={cn("w-6 h-6 shrink-0", role === r.id ? "text-indigo-600" : "opacity-40")} />
                          <span className="font-black text-[10px] uppercase tracking-widest">{r.name}</span>
                          {role === r.id && <div className="absolute bottom-0 right-0 p-2"><CheckCircle2 className="w-4 h-4" /></div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {role === 'professor' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                           <ShieldCheck className="w-4 h-4" /> Criptare Profesor
                        </label>
                        <input
                          type="password"
                          className="w-full px-8 py-5 bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-900/40 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-black text-indigo-700 dark:text-indigo-400 shadow-inner tracking-[0.5em] placeholder:tracking-normal placeholder:font-medium uppercase"
                          placeholder="Cod Validare"
                          value={professorKey}
                          onChange={(e) => setProfessorKey(e.target.value)}
                          required={role === 'professor'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3 group">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">Email</label>
              <input
                type="email"
                className="w-full px-8 py-5 glass rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none font-black text-sm shadow-sm placeholder:text-slate-500 dark:placeholder:text-slate-600 text-[var(--text-main)]"
                placeholder="nume@universitate.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 group">
              <div className="flex justify-between items-center px-1">
                 <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] group-focus-within:text-indigo-600 transition-colors">Parolă</label>
                 {!isRegistering && <button type="button" className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline">Ai uitat parola?</button>}
              </div>
              <input
                type="password"
                className="w-full px-8 py-5 glass rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none font-black text-sm shadow-sm placeholder:text-slate-500 dark:placeholder:text-slate-600 tracking-[0.3em] placeholder:tracking-normal text-[var(--text-main)]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-6 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/40 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0" /> {error}
              </motion.div>
            )}

            <button
              disabled={loading}
              className="w-full py-6 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-700 text-white rounded-[2rem] font-black shadow-2xl shadow-slate-200 dark:shadow-none transition-all transform hover:-translate-y-2 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 text-[12px] uppercase tracking-[0.3em]"
            >
              {loading ? "Se conectează..." : isRegistering ? "Creează Contul" : "Intră în Cont"}
              {!loading && <ArrowRight className="w-5 h-5 text-indigo-400 dark:text-white" />}
            </button>
          </form>

          <div className="space-y-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800 shadow-inner"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em]">
                <span className="px-6 bg-[var(--bg-app)] text-[var(--text-muted)] transition-colors">Sursă Alternativă</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full py-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300 rounded-[2rem] font-black flex items-center justify-center gap-4 transition-all shadow-sm hover:shadow-glow-indigo group text-[10px] uppercase tracking-widest"
            >
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Chrome className="w-4 h-4 transition-transform group-hover:scale-110" />
              </div>
              Acces prin Google
            </button>
          </div>

          <p className="text-center text-[var(--text-muted)] font-black text-[10px] pt-4 uppercase tracking-[0.2em]">
            {isRegistering ? "Ai deja cont?" : "Nu ai cont?"}{" "}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 border-b border-indigo-100 dark:border-indigo-900/40 inline-block ml-2"
            >
              {isRegistering ? "Conecteară-te" : "Creează cont"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
