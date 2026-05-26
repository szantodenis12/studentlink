import React, { useState, useEffect } from "react";
import { 
  getMentors, 
  bookSession, 
  Booking, 
  getMentorReviews, 
  addMentorReview, 
  Review,
  getStudentBookings,
  getProfessorBookings,
  updateBookingDateTime,
  updateMentorProfile,
  updateBookingStatus
} from "../services/mentorshipService";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { 
  Search, 
  Star, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  ChevronRight, 
  Filter, 
  X, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Video, 
  Clock,
  UserCheck,
  Plus,
  Trash2,
  Edit
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearch } from "../context/SearchContext";
import { cn } from "../lib/utils";
import { createNotification } from "../services/notificationService";

export default function MentorshipPage() {
  const { profile } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Bookings list state
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Card Payment modal state
  const [selectedMentorForBooking, setSelectedMentorForBooking] = useState<UserProfile | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  // Online Meeting Scheduler modal state
  const [selectedBookingForScheduling, setSelectedBookingForScheduling] = useState<Booking | null>(null);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  // Reviews modal state
  const [selectedMentorForReviews, setSelectedMentorForReviews] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Mentor Profile form state
  const [isEditingMentorProfile, setIsEditingMentorProfile] = useState(false);
  const [mentorPriceText, setMentorPriceText] = useState("200");
  const [mentorSubjectsText, setMentorSubjectsText] = useState("");
  const [mentorBioText, setMentorBioText] = useState("");
  const [isSubmittingMentorProfile, setIsSubmittingMentorProfile] = useState(false);

  useEffect(() => {
    loadMentors();
  }, []);

  useEffect(() => {
    if (profile && profile.role === "professor") {
      setMentorPriceText(String(profile.mentorshipPrice || 200));
      setMentorSubjectsText(profile.mentorshipSubjects?.join(", ") || "");
      setMentorBioText(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "student") {
      const unsub = getStudentBookings(profile.uid, setBookings);
      return () => unsub();
    } else if (profile.role === "professor") {
      const unsub = getProfessorBookings(profile.uid, setBookings);
      return () => unsub();
    }
  }, [profile]);

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

  const handleBook = (mentor: UserProfile) => {
    if (!profile) {
      toast.error("Please log in to book a session.");
      return;
    }
    setSelectedMentorForBooking(mentor);
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setShowCardModal(true);
  };

  const handlePayAndBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedMentorForBooking) return;

    if (!cardName.trim() || cardNumber.replace(/\s/g, "").length < 16 || cardExpiry.length < 5 || cardCvc.length < 3) {
      toast.error("Please enter valid card details.");
      return;
    }

    setIsPaying(true);
    try {
      // Simulate Stripe transaction processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const price = selectedMentorForBooking.mentorshipPrice || 200;

      const docRef = await bookSession({
        mentorId: selectedMentorForBooking.uid,
        mentorName: selectedMentorForBooking.fullName,
        studentId: profile.uid,
        studentName: profile.fullName,
        subject: selectedMentorForBooking.mentorshipSubjects?.[0] || "General",
        dateTime: new Date(Date.now() + 86400000), // Default next day
        price: price
      });

      // Send interactive booking request notification to professor
      await createNotification({
        userId: selectedMentorForBooking.uid,
        title: "New Mentorship Request",
        content: `Student ${profile.fullName} requested a mentorship session in ${selectedMentorForBooking.mentorshipSubjects?.[0] || "General"} (${price} RON). Accept or decline in your notifications drawer.`,
        type: 'booking_request',
        bookingId: docRef.id
      });

      toast.success(`Payment authorized! Request sent to ${selectedMentorForBooking.fullName}.`);
      setShowCardModal(false);
      setSelectedMentorForBooking(null);
    } catch (err) {
      console.error(err);
      toast.error("Error during booking request.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedBookingForScheduling) return;

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select a valid date and time.");
      return;
    }

    setIsScheduling(true);
    try {
      const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      // Update booking dateTime in database
      await updateBookingDateTime(selectedBookingForScheduling.id, combinedDateTime);

      // Notify the professor
      await createNotification({
        userId: selectedBookingForScheduling.mentorId,
        title: "Online Meeting Scheduled",
        content: `Student ${profile.fullName} has scheduled the online mentorship session for ${selectedBookingForScheduling.subject} on ${format(combinedDateTime, "PPP 'at' p")}.`,
        type: 'system'
      });

      toast.success("Meeting scheduled successfully!");
      setShowSchedulerModal(false);
      setSelectedBookingForScheduling(null);
    } catch (err) {
      console.error(err);
      toast.error("Error scheduling meeting.");
    } finally {
      setIsScheduling(false);
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

  const handleSaveMentorProfile = async (e: React.FormEvent, isMentor: boolean) => {
    if (e) e.preventDefault();
    if (!profile) return;

    const parsedPrice = parseFloat(mentorPriceText);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid session price.");
      return;
    }

    const subjects = mentorSubjectsText
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (isMentor && subjects.length === 0) {
      toast.error("Please enter at least one specialization subject.");
      return;
    }

    setIsSubmittingMentorProfile(true);
    try {
      await updateMentorProfile(
        profile.uid,
        isMentor,
        subjects,
        parsedPrice,
        mentorBioText.trim()
      );
      if (isMentor) {
        toast.success("Mentorship profile updated successfully!");
      } else {
        toast.success("Successfully opted out of the mentorship program.");
      }
      setIsEditingMentorProfile(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update mentorship profile.");
    } finally {
      setIsSubmittingMentorProfile(false);
    }
  };

  const handleAcceptBooking = async (booking: Booking) => {
    try {
      await updateBookingStatus(booking.id, "confirmed");

      // Notify the student
      await createNotification({
        userId: booking.studentId,
        title: "Mentorship Request Approved",
        content: `Professor ${profile?.fullName || "Mentor"} accepted your booking for ${booking.subject}. You can now schedule your meeting details.`,
        type: "system"
      });

      toast.success("Booking request accepted!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept booking.");
    }
  };

  const handleDeclineBooking = async (booking: Booking) => {
    try {
      await updateBookingStatus(booking.id, "rejected");

      // Notify the student
      await createNotification({
        userId: booking.studentId,
        title: "Mentorship Request Declined",
        content: `Professor ${profile?.fullName || "Mentor"} declined your booking for ${booking.subject}.`,
        type: "system"
      });

      toast.success("Booking request declined.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to decline booking.");
    }
  };

  // Filter mentors reactively using global searchQuery
  const filteredMentors = mentors.filter((mentor) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      (mentor.fullName || "").toLowerCase().includes(query) ||
      (mentor.bio || "").toLowerCase().includes(query) ||
      (mentor.mentorshipSubjects || []).some((s) => (s || "").toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {profile?.role === "student" && (
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
      )}

      {/* Coordinating Professor Portal */}
      {profile?.role === "professor" && (
        <div className="space-y-12">
          {/* Portal Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 glass p-10 rounded-[3.5rem] shadow-xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                 <GraduationCap className="w-3.5 h-3.5" /> Mentor Portal
              </div>
              <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase font-display">Academic Mentorship Management</h2>
              <p className="text-sm font-medium text-[var(--text-muted)]">Share your expertise, set your price, and guide the next generation of students.</p>
            </div>
          </div>

          {/* Onboarding / Profile Configuration Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <GraduationCap className="w-32 h-32 text-indigo-650" />
            </div>

            {!profile.isMentor ? (
              // Unregistered Mentor Onboarding
              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                     Pending Enrollment
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Become an Academic Mentor</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Configure your rates and specializations to start accepting student session requests.</p>
                </div>

                <form onSubmit={(e) => handleSaveMentorProfile(e, true)} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl pt-4">
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-300">Specialization Subjects (Comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Database Systems, Web Development, Java programming"
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                      value={mentorSubjectsText}
                      onChange={(e) => setMentorSubjectsText(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-300">Price per Session (RON)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        placeholder="200"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 dark:text-white"
                        value={mentorPriceText}
                        onChange={(e) => setMentorPriceText(e.target.value)}
                      />
                      <DollarSign className="w-5 h-5 text-slate-400 absolute left-5 top-5" />
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-655 dark:text-slate-300">Professional Bio / Description</label>
                    <textarea
                      rows={4}
                      placeholder="Share your teaching style, field of research, or what students can expect from your mentorship sessions..."
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                      value={mentorBioText}
                      onChange={(e) => setMentorBioText(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmittingMentorProfile}
                      className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl cursor-pointer"
                    >
                      {isSubmittingMentorProfile ? "Saving Profile..." : "Register as Mentor"}
                    </button>
                  </div>
                </form>
              </div>
            ) : isEditingMentorProfile ? (
              // Editing Mentor Profile Form
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">Configure Mentor Profile</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Update your specializations, pricing, and bio info dynamically.</p>
                </div>

                <form onSubmit={(e) => handleSaveMentorProfile(e, true)} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl pt-4">
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-300">Specialization Subjects (Comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Database Systems, Web Development, Java programming"
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 dark:text-white"
                      value={mentorSubjectsText}
                      onChange={(e) => setMentorSubjectsText(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-300">Price per Session (RON)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        placeholder="200"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 dark:text-white"
                        value={mentorPriceText}
                        onChange={(e) => setMentorPriceText(e.target.value)}
                      />
                      <DollarSign className="w-5 h-5 text-slate-400 absolute left-5 top-5" />
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-655 dark:text-slate-300">Professional Bio / Description</label>
                    <textarea
                      rows={4}
                      placeholder="Brief bio..."
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 dark:text-white"
                      value={mentorBioText}
                      onChange={(e) => setMentorBioText(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 pt-4 flex gap-4">
                    <button
                      type="submit"
                      disabled={isSubmittingMentorProfile}
                      className="px-10 py-5 bg-indigo-600 hover:bg-indigo-705 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl cursor-pointer"
                    >
                      {isSubmittingMentorProfile ? "Saving Profile..." : "Save Profile"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingMentorProfile(false)}
                      className="px-8 py-5 border border-slate-300 dark:border-slate-700 hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Active Mentor Display Card
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/50">
                       <CheckCircle2 className="w-3.5 h-3.5" /> Active Academic Mentor
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">My Mentor Profile</h3>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditingMentorProfile(true)}
                      className="px-6 py-4 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Edit className="w-4 h-4" /> Edit Profile
                    </button>
                    <button
                      onClick={(e) => handleSaveMentorProfile(e, false)}
                      disabled={isSubmittingMentorProfile}
                      className="px-6 py-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Opt Out
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-150 dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Session Billing</span>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{profile.mentorshipPrice || 200} <span className="text-xs uppercase ml-1">RON / Session</span></p>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-155 dark:border-slate-800 md:col-span-2 space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Specializations</span>
                    <div className="flex flex-wrap gap-2">
                      {(profile.mentorshipSubjects || []).map((s) => (
                        <span key={s} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-155 dark:border-slate-800 md:col-span-3 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">My Mentor Bio</span>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed pl-4 border-l-2 border-slate-300 dark:border-slate-700">
                      {profile.bio || "No bio description configured yet. Set a professional bio to help students connect with you."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending Requests Section */}
          <div className="space-y-8 glass p-10 rounded-[3.5rem] shadow-xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Calendar className="w-32 h-32 text-indigo-600" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                 <Clock className="w-3.5 h-3.5" /> Bookings Inbox
              </div>
              <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight font-display">Incoming Booking Requests</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Approve or reject mentorship session bookings sent by students.</p>
            </div>

            {bookings.filter(b => b.status === "pending").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.filter(b => b.status === "pending").map((booking) => (
                  <div key={booking.id} className="glass bg-[var(--bg-app)]/30 rounded-[2.5rem] p-8 border border-white/5 flex flex-col justify-between hover:shadow-lg transition-all group">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border-2 border-white/5 flex items-center justify-center font-black text-indigo-500 text-lg uppercase shrink-0">
                          {booking.studentName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[var(--text-main)] uppercase tracking-tight mb-1">{booking.studentName}</h4>
                          <span className="inline-block px-2.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md text-[9px] font-extrabold uppercase tracking-wider">{booking.subject}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-app)]/45 rounded-2xl border border-[var(--glass-border)] space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[var(--text-main)] font-semibold">
                          <DollarSign className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>Amount: <span className="font-black text-indigo-600">{booking.price} RON</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider pl-6">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Requested: {format(new Date(booking.dateTime), "PPp")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-6 border-t border-[var(--glass-border)] mt-6">
                      <button
                        onClick={() => handleAcceptBooking(booking)}
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineBooking(booking)}
                        className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[var(--bg-app)]/10 border-2 border-dashed border-[var(--glass-border)] rounded-[2.5rem]">
                <Clock className="w-12 h-12 text-[var(--text-muted)] opacity-20 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-40">No Pending Requests</p>
                <p className="text-xs font-medium text-[var(--text-muted)] mt-1">Student booking requests will show up here.</p>
              </div>
            )}
          </div>

          {/* Active Mentorships Section */}
          <div className="space-y-8 glass p-10 rounded-[3.5rem] shadow-xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <GraduationCap className="w-32 h-32 text-indigo-600" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                 <CheckCircle2 className="w-3.5 h-3.5" /> Active Connections
              </div>
              <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight font-display">My Active Study Sessions</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">Coordinate schedules and launch Google Meet classroom rooms for active students.</p>
            </div>

            {bookings.filter(b => b.status === "confirmed").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.filter(b => b.status === "confirmed").map((booking) => (
                  <div key={booking.id} className="glass bg-[var(--bg-app)]/30 rounded-[2.5rem] p-8 border border-white/5 flex flex-col justify-between hover:shadow-lg transition-all group">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border-2 border-white/5 flex items-center justify-center font-black text-indigo-500 text-lg uppercase shrink-0">
                          {booking.studentName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[var(--text-main)] uppercase tracking-tight mb-1">{booking.studentName}</h4>
                          <span className="inline-block px-2.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md text-[9px] font-extrabold uppercase tracking-wider">{booking.subject}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-app)]/45 rounded-2xl border border-[var(--glass-border)] space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[var(--text-main)] font-semibold">
                          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{booking.dateTime ? format(new Date(booking.dateTime), "PPPP") : "Date not finalized"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider pl-6">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>{booking.dateTime ? format(new Date(booking.dateTime), "p") : "Establish time"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-6 border-t border-[var(--glass-border)] mt-6">
                      <button
                        onClick={() => {
                          setSelectedBookingForScheduling(booking);
                          setScheduledDate(booking.dateTime ? format(new Date(booking.dateTime), "yyyy-MM-dd") : "");
                          setScheduledTime(booking.dateTime ? format(new Date(booking.dateTime), "HH:mm") : "");
                          setShowSchedulerModal(true);
                        }}
                        className="flex-1 py-4 border border-slate-300 dark:border-slate-700 hover:border-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 text-[var(--text-main)] text-center cursor-pointer"
                      >
                        Adjust Meeting
                      </button>
                      <a
                        href="https://meet.google.com/abc-defg-hij"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" /> Start Meet
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[var(--bg-app)]/10 border-2 border-dashed border-[var(--glass-border)] rounded-[2.5rem]">
                <GraduationCap className="w-12 h-12 text-[var(--text-muted)] opacity-20 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-40">No Active Study Sessions</p>
                <p className="text-xs font-medium text-[var(--text-muted)] mt-1">Confirmed student mentorship programs will show up here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Mentorships Section */}
      {profile?.role === "student" && bookings.filter(b => b.status === "confirmed").length > 0 && (
        <div className="space-y-8 glass p-10 rounded-[3.5rem] shadow-xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <GraduationCap className="w-32 h-32 text-indigo-600" />
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
               <CheckCircle2 className="w-3 h-3" /> Confirmed Partnerships
            </div>
            <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight font-display">My Active Mentorships</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Coordinate, schedule, and join your active online mentorship classrooms.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.filter(b => b.status === "confirmed").map((booking) => (
              <div 
                key={booking.id}
                className="glass bg-[var(--bg-app)]/30 rounded-[2.5rem] p-8 border border-white/5 flex flex-col justify-between hover:shadow-lg transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border-2 border-white/5 flex items-center justify-center font-black text-indigo-500 text-lg uppercase shrink-0">
                      {booking.mentorName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[var(--text-main)] uppercase tracking-tight leading-none mb-1.5">{booking.mentorName}</h4>
                      <div className="inline-block px-2.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md text-[9px] font-extrabold uppercase tracking-wider">{booking.subject}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--bg-app)]/45 rounded-2xl border border-[var(--glass-border)] space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-main)] font-semibold">
                      <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{booking.dateTime ? format(new Date(booking.dateTime), "PPPP") : "Not scheduled"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider pl-6">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>{booking.dateTime ? format(new Date(booking.dateTime), "p") : "Establish time"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 border-t border-[var(--glass-border)] mt-6">
                  <button
                    onClick={() => {
                      setSelectedBookingForScheduling(booking);
                      setScheduledDate(booking.dateTime ? format(new Date(booking.dateTime), "yyyy-MM-dd") : "");
                      setScheduledTime(booking.dateTime ? format(new Date(booking.dateTime), "HH:mm") : "");
                      setShowSchedulerModal(true);
                    }}
                    className="flex-1 py-4 border border-slate-300 dark:border-slate-700 hover:border-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 text-[var(--text-main)] text-center cursor-pointer"
                  >
                    Schedule Meeting
                  </button>
                  <a
                    href="https://meet.google.com/abc-defg-hij"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Meet
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.role === "student" && (
        <>
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
                   <p className="text-2xl font-black text-indigo-600 tracking-tighter">{mentor.mentorshipPrice || 200} <span className="text-xs uppercase ml-1">RON</span></p>
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
        </>
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
                className="bg-white w-full max-w-2xl rounded-[3rem] p-10 max-h-[85vh] overflow-y-auto custom-scrollbar border border-slate-200 flex flex-col gap-8 shadow-2xl relative text-slate-900"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-6 border-b border-slate-150">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                      Reviews & Feedback
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      For <span className="font-extrabold text-indigo-650">{selectedMentorForReviews.fullName}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMentorForReviews(null)}
                    className="p-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all border border-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5 text-slate-650" />
                  </button>
                </div>

                {/* Reviews List */}
                <div className="space-y-6 flex-1 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-6 bg-slate-50 rounded-2xl border border-slate-150 flex gap-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden shrink-0 flex items-center justify-center font-black text-indigo-700 text-sm">
                          {r.studentName.charAt(0)}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-extrabold text-sm text-slate-900">{r.studentName}</h4>
                            <div className="flex items-center gap-1 text-amber-500 text-xs">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="font-black">{r.rating}.0</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-650 leading-relaxed font-medium">
                            {r.comment}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-60">
                      <Star className="w-12 h-12 mx-auto mb-2 text-indigo-400" />
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No reviews yet</p>
                      <p className="text-xs font-medium text-slate-500">Be the first student to leave a review!</p>
                    </div>
                  )}
                </div>

                {/* Add Review Form (Only for Students) */}
                {profile?.role === "student" && (
                  <form onSubmit={handleSubmitReview} className="space-y-6 border-t border-slate-150 pt-8">
                    <div className="space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Submit a Review</h4>
                      <p className="text-xs text-slate-500">Share your learning experience with this professor.</p>
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
                          className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "w-8 h-8 transition-colors",
                              (hoverRating || newRating) >= star ? "fill-current" : "text-slate-350"
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
                        className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none shadow-sm transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-405"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full py-5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                )}
              </motion.div>
            </motion.div>
          </>
        )}

        {/* Card Payment Modal */}
        {showCardModal && selectedMentorForBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCardModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[3rem] p-10 border border-slate-200 flex flex-col gap-6 shadow-2xl relative text-slate-900"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-150">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    Secure Checkout
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Mentorship Booking with <span className="font-bold text-indigo-650">{selectedMentorForBooking.fullName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="p-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all border border-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-650" />
                </button>
              </div>

              <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-[1.8rem] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount to Authorize</p>
                    <p className="text-xl font-black text-indigo-600 leading-none mt-1">{selectedMentorForBooking.mentorshipPrice || 200} RON</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-150 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Stripe Secured
                </div>
              </div>

              <form onSubmit={handlePayAndBook} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="xxxx xxxx xxxx xxxx"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                      setCardNumber(formatted);
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 2) {
                          value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
                        }
                        setCardExpiry(value);
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">CVC / CVV</label>
                    <input
                      type="password"
                      required
                      placeholder="123"
                      maxLength={3}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full mt-4 py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 cursor-pointer"
                >
                  {isPaying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Authorizing...
                    </>
                  ) : (
                    `Pay & Request Booking`
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Meeting Scheduler Modal */}
        {showSchedulerModal && selectedBookingForScheduling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSchedulerModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[3rem] p-10 border border-slate-200 flex flex-col gap-6 shadow-2xl relative text-slate-900"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-150">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    Schedule online meeting
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    With Professor <span className="font-bold text-indigo-650">{selectedBookingForScheduling.mentorName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowSchedulerModal(false)}
                  className="p-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all border border-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-650" />
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Select Date</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-semibold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Select Time</label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all text-sm font-semibold text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isScheduling}
                  className="w-full mt-4 py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 cursor-pointer"
                >
                  {isScheduling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Schedule...
                    </>
                  ) : (
                    `Confirm Date & Time`
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
