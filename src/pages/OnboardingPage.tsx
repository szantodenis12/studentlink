import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { uploadFile } from "../services/storageService";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Camera, User, BookOpen, FileText, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UNIVERSITIES = [
  {
    id: "ubb",
    name: "Babeș-Bolyai University (UBB)",
    faculties: [
      {
        id: "ubb-mate-info",
        name: "Faculty of Mathematics and Computer Science",
        specializations: [
          "Computer Science (Romanian)",
          "Computer Science (English)",
          "Computer Science (German)",
          "Mathematics",
          "Mathematics-Computer Science"
        ]
      },
      {
        id: "ubb-fsega",
        name: "Faculty of Economics and Business Administration (FSEGA)",
        specializations: [
          "Economic Informatics",
          "Management",
          "Finance-Banking",
          "Marketing",
          "Accounting and Management Information Systems"
        ]
      },
      {
        id: "ubb-litere",
        name: "Faculty of Letters",
        specializations: [
          "Romanian Language and Literature",
          "Applied Modern Languages",
          "English Language and Literature"
        ]
      }
    ]
  },
  {
    id: "utcn",
    name: "Technical University of Cluj-Napoca (UTCN)",
    faculties: [
      {
        id: "utcn-ac",
        name: "Faculty of Automation and Computer Science",
        specializations: [
          "Computer Science (Romanian)",
          "Computer Science (English)",
          "Information Technology",
          "Automation and Applied Informatics"
        ]
      },
      {
        id: "utcn-etti",
        name: "Faculty of Electronics, Telecommunications and Information Technology (ETTI)",
        specializations: [
          "Telecommunication Technologies and Systems",
          "Applied Electronics"
        ]
      },
      {
        id: "utcn-constructii",
        name: "Faculty of Machine Building",
        specializations: [
          "Robotics",
          "Industrial Engineering"
        ]
      }
    ]
  },
  {
    id: "unibuc",
    name: "University of Bucharest (UniBuc)",
    faculties: [
      {
        id: "unibuc-mate-info",
        name: "Faculty of Mathematics and Computer Science",
        specializations: [
          "Computer Science",
          "Information Technology",
          "Mathematics"
        ]
      },
      {
        id: "unibuc-drept",
        name: "Faculty of Law",
        specializations: [
          "Law"
        ]
      }
    ]
  },
  {
    id: "upb",
    name: "Politehnica University of Bucharest (UPB)",
    faculties: [
      {
        id: "upb-ac",
        name: "Faculty of Automatic Control and Computers",
        specializations: [
          "Computers",
          "Systems Engineering"
        ]
      },
      {
        id: "upb-etti",
        name: "Faculty of Electronics, Telecommunications and Information Technology",
        specializations: [
          "Telecommunication Technologies and Systems",
          "Microelectronics, Optoelectronics and Nanotechnologies"
        ]
      }
    ]
  },
  {
    id: "uaic",
    name: "Alexandru Ioan Cuza University of Iași (UAIC)",
    faculties: [
      {
        id: "uaic-info",
        name: "Faculty of Computer Science",
        specializations: [
          "Computer Science"
        ]
      },
      {
        id: "uaic-economie",
        name: "Faculty of Economics and Business Administration (FEAA)",
        specializations: [
          "Economic Informatics",
          "Finance and Banking",
          "Management"
        ]
      }
    ]
  },
  {
    id: "other",
    name: "Other University",
    faculties: [
      {
        id: "other-fac",
        name: "Other Faculty",
        specializations: [
          "Other Specialization"
        ]
      }
    ]
  }
];

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

  const [selectedUniv, setSelectedUniv] = useState<string>("");
  const [selectedFac, setSelectedFac] = useState<string>("");
  const [selectedSpec, setSelectedSpec] = useState<string>("");
  const [customUniv, setCustomUniv] = useState<string>("");
  const [customFac, setCustomFac] = useState<string>("");
  const [customSpec, setCustomSpec] = useState<string>("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string>(profile?.photoURL || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const isStep2Valid = () => {
    if (profile.role !== 'student') {
      return !!formData.specialization.trim();
    }
    if (!selectedUniv) return false;
    if (selectedUniv === 'other' && !customUniv.trim()) return false;
    if (!selectedFac) return false;
    if (selectedFac === 'other-fac' && !customFac.trim()) return false;
    if (!selectedSpec) return false;
    if (selectedSpec === 'other-spec' && !customSpec.trim()) return false;
    return true;
  };

  const handleStep2Continue = () => {
    if (profile.role === 'student') {
      const univName = selectedUniv === 'other' ? customUniv : UNIVERSITIES.find(u => u.id === selectedUniv)?.name || "";
      const facName = selectedFac === 'other-fac' ? customFac : UNIVERSITIES.find(u => u.id === selectedUniv)?.faculties.find(f => f.id === selectedFac)?.name || "";
      const specName = selectedSpec === 'other-spec' ? customSpec : selectedSpec;
      const finalSpecialization = `${univName} - ${facName} (${specName})`;
      setFormData(prev => ({
        ...prev,
        specialization: finalSpecialization
      }));
    }
    setStep(3);
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

      const univName = profile.role === 'student'
        ? (selectedUniv === 'other' ? customUniv : UNIVERSITIES.find(u => u.id === selectedUniv)?.name || "")
        : "";
      const facName = profile.role === 'student'
        ? (selectedFac === 'other-fac' ? customFac : UNIVERSITIES.find(u => u.id === selectedUniv)?.faculties.find(f => f.id === selectedFac)?.name || "")
        : "";
      const specName = profile.role === 'student'
        ? (selectedSpec === 'other-spec' ? customSpec : selectedSpec)
        : formData.specialization;

      const finalSpecialization = profile.role === 'student'
        ? `${univName} - ${facName} (${specName})`
        : formData.specialization;

      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        specialization: finalSpecialization,
        university: univName,
        faculty: facName,
        photoURL: finalPhotoURL,
        profileSetup: true
      });

      toast.success("Profile completed successfully!");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Error saving profile.");
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
                {s === 1 ? "Identity" : s === 2 ? "Academic" : "Completion"}
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
                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Let's get to know you!</h2>
                <p className="text-[var(--text-muted)] mt-2 font-medium">How would you like to appear to your peers?</p>
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
                  <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Full Name</label>
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
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Academic Details</h2>
                <p className="text-[var(--text-muted)] mt-2 font-medium">Where do you study or what do you teach?</p>
              </div>

              <div className="space-y-6">
                {profile.role === 'student' ? (
                  <div className="space-y-6">
                    {/* 1. University Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                        University
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-4 top-4 w-5 h-5 text-indigo-400 z-10 pointer-events-none" />
                        <select
                          className="w-full p-4 pl-12 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)] appearance-none cursor-pointer"
                          value={selectedUniv}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedUniv(val);
                            setSelectedFac("");
                            setSelectedSpec("");
                            setCustomUniv("");
                            setCustomFac("");
                            setCustomSpec("");
                          }}
                        >
                          <option value="" disabled className="bg-[var(--bg-app)] text-[var(--text-muted)]">Select University</option>
                          {UNIVERSITIES.map((univ) => (
                            <option key={univ.id} value={univ.id} className="bg-[var(--bg-app)] text-[var(--text-main)]">
                              {univ.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-5 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-indigo-400 w-0 h-0"></div>
                      </div>
                    </div>

                    {/* Custom University Input */}
                    {selectedUniv === 'other' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                          University Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="Enter university name..."
                          className="w-full p-4 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)]"
                          value={customUniv}
                          onChange={(e) => setCustomUniv(e.target.value)}
                        />
                      </motion.div>
                    )}

                    {/* 2. Faculty Dropdown */}
                    {selectedUniv && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                          Faculty
                        </label>
                        <div className="relative">
                          <BookOpen className="absolute left-4 top-4 w-5 h-5 text-indigo-400 z-10 pointer-events-none" />
                          <select
                            className="w-full p-4 pl-12 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)] appearance-none cursor-pointer"
                            value={selectedFac}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedFac(val);
                              setSelectedSpec("");
                              setCustomFac("");
                              setCustomSpec("");
                            }}
                          >
                            <option value="" disabled className="bg-[var(--bg-app)] text-[var(--text-muted)]">Select Faculty</option>
                            {selectedUniv === 'other' ? (
                              <option value="other-fac" className="bg-[var(--bg-app)] text-[var(--text-main)]">Other Faculty</option>
                            ) : (
                              <>
                                {UNIVERSITIES.find(u => u.id === selectedUniv)?.faculties.map((fac) => (
                                  <option key={fac.id} value={fac.id} className="bg-[var(--bg-app)] text-[var(--text-main)]">
                                    {fac.name}
                                  </option>
                                ))}
                                <option value="other-fac" className="bg-[var(--bg-app)] text-[var(--text-main)]">Other Faculty</option>
                              </>
                            )}
                          </select>
                          <div className="absolute right-4 top-5 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-indigo-400 w-0 h-0"></div>
                        </div>
                      </motion.div>
                    )}

                    {/* Custom Faculty Input */}
                    {(selectedFac === 'other-fac' || selectedUniv === 'other') && selectedUniv && selectedFac && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                          Faculty Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="Enter faculty name..."
                          className="w-full p-4 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)]"
                          value={customFac}
                          onChange={(e) => setCustomFac(e.target.value)}
                        />
                      </motion.div>
                    )}

                    {/* 3. Specialization Dropdown */}
                    {selectedFac && selectedUniv && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                          Specialization
                        </label>
                        <div className="relative">
                          <BookOpen className="absolute left-4 top-4 w-5 h-5 text-indigo-400 z-10 pointer-events-none" />
                          <select
                            className="w-full p-4 pl-12 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)] appearance-none cursor-pointer"
                            value={selectedSpec}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedSpec(val);
                              setCustomSpec("");
                            }}
                          >
                            <option value="" disabled className="bg-[var(--bg-app)] text-[var(--text-muted)]">Select Specialization</option>
                            {selectedFac === 'other-fac' || selectedUniv === 'other' ? (
                              <option value="other-spec" className="bg-[var(--bg-app)] text-[var(--text-main)]">Other Specialization</option>
                            ) : (
                              <>
                                {UNIVERSITIES.find(u => u.id === selectedUniv)
                                  ?.faculties.find(f => f.id === selectedFac)
                                  ?.specializations.map((spec) => (
                                    <option key={spec} value={spec} className="bg-[var(--bg-app)] text-[var(--text-main)]">
                                      {spec}
                                    </option>
                                  ))}
                                <option value="other-spec" className="bg-[var(--bg-app)] text-[var(--text-main)]">Other Specialization</option>
                              </>
                            )}
                          </select>
                          <div className="absolute right-4 top-5 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-indigo-400 w-0 h-0"></div>
                        </div>
                      </motion.div>
                    )}

                    {/* Custom Specialization Input */}
                    {(selectedSpec === 'other-spec' || selectedFac === 'other-fac' || selectedUniv === 'other') && selectedUniv && selectedFac && selectedSpec && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                          Specialization Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="Enter specialization name..."
                          className="w-full p-4 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)]"
                          value={customSpec}
                          onChange={(e) => setCustomSpec(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                      Department / Chair
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-4 w-5 h-5 text-indigo-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. Department of Mathematics and Computer Science"
                        className="w-full p-4 pl-12 bg-[var(--bg-app)]/50 border border-[var(--glass-border)] rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-[var(--text-main)]"
                        value={formData.specialization}
                        onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Short Description (Bio)</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-4 w-5 h-5 text-indigo-400" />
                    <textarea 
                      placeholder="Tell us a few words about yourself..."
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
                  Back
                </button>
                <button 
                  onClick={handleStep2Continue}
                  disabled={!isStep2Valid()}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  Continue <ArrowRight className="w-5 h-5" />
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
                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Everything is ready!</h2>
                <p className="text-[var(--text-muted)] mt-4 font-medium px-8">
                  You are now part of the <span className="text-indigo-600 font-black">STUDENTLINK</span> community. 
                  Your profile is complete and you can access all features of the platform.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-bold hover:bg-slate-200 transition-all"
                >
                  Review
                </button>
                <button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Enter Platform"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
