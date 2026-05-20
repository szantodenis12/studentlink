import React, { useState, useEffect } from "react";
import { getMentors, bookSession, Booking, getMentorReviews, addMentorReview, Review } from "../services/mentorshipService";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { Search, Star, Calendar, DollarSign, GraduationCap, ChevronRight, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearch } from "../context/SearchContext";
import { cn } from "../lib/utils";

export default function MentorshipPage() {
  const { profile } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Reviews modal state
  const [selectedMentorForReviews, setSelectedMentorForReviews] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    loadMentors();
  }, []);

  useEffect(() => {
    if (selectedMentorForReviews) {
      const unsub = getMentorReviews(selectedMentorForReviews.uid, setReviews);
      return () => unsub();
    }
  }, [selectedMentorForReviews]);

  const loadMentors = async () => {
    setLoading(true);
    try {
      const data = await getMentors();
      setMentors(data);
    } catch (err) {
      toast.error("Error loading mentors.");
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
      toast.success(`Request sent to ${mentor.fullName}!`);
    } catch (err) {
      toast.error("Error during booking request.");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedMentorForReviews) return;
    if (newComment.trim() === "") {
      toast.error("Please enter a comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      await addMentorReview({
        mentorId: selectedMentorForReviews.uid,
        studentId: profile.uid,
        studentName: profile.fullName,
        rating: newRating,
        comment: newComment
      });
      toast.success("Review submitted successfully!");
      setNewComment("");
      setNewRating(5);
    } catch (err) {
      toast.error("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter mentors reactively using global searchQuery
  const filteredMentors = mentors.filter((mentor) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      mentor.fullName.toLowerCase().includes(query) ||
      (mentor.bio || "").toLowerCase().includes(query) ||
      (mentor.mentorshipSubjects || []).some((s) => s.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 glass p-10 rounded-[3.5rem] shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 border-indigo-100">
             <Star className="w-3 h-3 fill-current" /> Expert Network
          </div>
          <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase font-display">Expert Academic Consultations</h2>
          <p className="text-sm font-medium text-[var(--text-muted)]">Find experts for your academic and professional success.</p>
        </div>
        
        <div className="relative w-full lg:w-[32rem] group">
          <input
            type="text"
            placeholder="Search subject, skill, or name..."
            className="w-full pl-16 pr-24 py-6 glass rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none shadow-glow transition-all font-black text-sm uppercase tracking-tight placeholder:text-[var(--text-muted)] placeholder:tracking-normal group-hover:scale-[1.02]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-6 h-6 text-indigo-400 absolute left-6 top-5 group-focus-within:text-indigo-600 transition-colors" />
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
          {filteredMentors.map((mentor) => (
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
                     <div className="w-full h-full flex items-center justify-center bg-indigo-600/10 text-indigo-700 font-black text-3xl">
                       {mentor.fullName.charAt(0)}
                     </div>
                   )}
                </div>
                <div className="flex flex-col items-end gap-3">
                   <button
                     onClick={() => setSelectedMentorForReviews(mentor)}
                     className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold glass px-4 py-2 rounded-2xl text-[10px] uppercase tracking-widest border-indigo-100 shadow-sm hover:bg-indigo-600 hover:text-white transition-all active:scale-95 cursor-pointer"
                   >
                     <Star className="w-3.5 h-3.5 fill-current" />
                     {mentor.rating ? mentor.rating.toFixed(1) : "5.0"}
                   </button>
                   <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                   </div>
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{mentor.fullName}</h3>
                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed border-l-2 border-indigo-100 pl-4 mb-6 line-clamp-3">
                  {mentor.bio || "Expert academic consultant specialized in optimizing learning processes and personal development."}
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
                   <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Rate / Session</p>
                   <p className="text-2xl font-black text-indigo-600 tracking-tighter">{mentor.mentorshipPrice || 50} <span className="text-xs uppercase ml-1">Credits</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMentorForReviews(mentor)}
                    className="px-6 py-5 border border-slate-300 dark:border-slate-700 hover:border-indigo-600 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.1em] transition-all active:scale-95 text-[var(--text-main)] cursor-pointer"
                  >
                    Reviews
                  </button>
                  <button
                    onClick={() => handleBook(mentor)}
                    className="px-10 py-5 bg-slate-800 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3"
                  >
                    Book <ChevronRight className="w-5 h-5 text-indigo-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredMentors.length === 0 && !loading && (
        <div className="text-center py-32 glass rounded-[4rem] border-2 border-dashed border-[var(--glass-border)] bg-[var(--bg-app)]/10">
           <GraduationCap className="w-20 h-20 text-[var(--text-muted)] opacity-20 mx-auto mb-6 animate-float" />
           <h3 className="text-2xl font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40">No Mentors Available</h3>
           <p className="text-[var(--text-muted)] max-w-md mx-auto mt-2 font-medium">Our network is constantly expanding. Check back soon for new academic mentors.</p>
        </div>
      )}

      {/* Reviews Overlay Modal */}
      <AnimatePresence>
        {selectedMentorForReviews && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMentorForReviews(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass w-full max-w-2xl rounded-[3rem] p-10 max-h-[85vh] overflow-y-auto custom-scrollbar border border-white/10 flex flex-col gap-8 shadow-2xl relative"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-6 border-b border-[var(--glass-border)]">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)]">
                      Reviews & Feedback
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      For <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedMentorForReviews.fullName}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMentorForReviews(null)}
                    className="p-3 bg-[var(--bg-app)]/50 hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl transition-all border border-[var(--glass-border)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Reviews List */}
                <div className="space-y-6 flex-1 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-6 glass bg-[var(--bg-app)]/30 rounded-2xl border border-[var(--glass-border)] flex gap-4"
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
                    <div className="text-center py-10 opacity-40">
                      <Star className="w-12 h-12 mx-auto mb-2 text-indigo-400" />
                      <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">No reviews yet</p>
                      <p className="text-xs font-medium text-[var(--text-muted)]">Be the first student to leave a review!</p>
                    </div>
                  )}
                </div>

                {/* Add Review Form (Only for Students) */}
                {profile?.role === "student" && (
                  <form onSubmit={handleSubmitReview} className="space-y-6 border-t border-[var(--glass-border)] pt-8">
                    <div className="space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Submit a Review</h4>
                      <p className="text-xs text-[var(--text-muted)]">Share your learning experience with this professor.</p>
                    </div>

                    {/* Star Rating Select */}
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={cn(
                              "w-8 h-8 transition-colors",
                              (hoverRating || newRating) >= star ? "fill-current" : "text-slate-300 dark:text-slate-700"
                            )}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Feedback Comment Input */}
                    <div className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your feedback here..."
                        rows={3}
                        className="w-full p-5 glass rounded-[1.5rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none shadow-glow transition-all text-sm font-semibold placeholder:text-[var(--text-muted)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
