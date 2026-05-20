import React, { useState, useEffect } from "react";
import {
  getPosts,
  createPost,
  getMeetings,
  createMeeting,
  joinMeeting,
  leaveMeeting,
  Post,
  Meeting,
} from "../services/communityService";
import { uploadFile } from "../services/storageService";
import { useAuth } from "../hooks/useAuth";
import {
  Send,
  MapPin,
  Video,
  Calendar,
  Plus,
  Users,
  Paperclip,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";

export default function CommunityPage() {
  const { profile } = useAuth();
  const { searchQuery } = useSearch();
  const [posts, setPosts] = useState<Post[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState<"feed" | "meetings">("feed");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // Post state
  const [postContent, setPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Meeting state
  const [meetTitle, setMeetTitle] = useState("");
  const [meetType, setMeetType] = useState<"online" | "physical">("online");
  const [meetLoc, setMeetLoc] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetDesc, setMeetDesc] = useState("");
  const [googleTokens, setGoogleTokens] = useState<any>(null);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);

  useEffect(() => {
    // Listen for OAuth messages
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        setGoogleTokens(event.data.tokens);
        toast.success("Google Account connected!");
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  useEffect(() => {
    const unsubPosts = getPosts(setPosts);
    const unsubMeets = getMeetings(setMeetings);
    return () => {
      unsubPosts();
      unsubMeets();
    };
  }, []);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!postContent.trim() && !selectedFile)) return;

    setIsUploading(true);
    let attachments: { name: string; url: string }[] = [];

    try {
      if (selectedFile) {
        const path = `community/posts/${profile.uid}/${Date.now()}_${selectedFile.name}`;
        const { downloadURL } = await uploadFile(selectedFile, path);
        attachments.push({ name: selectedFile.name, url: downloadURL });
      }

      await createPost({
        authorId: profile.uid,
        authorName: profile.fullName,
        authorPhoto: profile.photoURL,
        content: postContent,
        attachments,
      });
      setPostContent("");
      setSelectedFile(null);
      setUploadProgress(0);
      setIsCreatingPost(false);
      toast.success("Post published successfully!");
    } catch (err) {
      toast.error("Error publishing post.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const resp = await fetch("/api/auth/google/url");
      const { url } = await resp.json();
      window.open(url, "google_auth", "width=600,height=700");
    } catch (err) {
      toast.error("Error connecting Google account.");
    }
  };

  const handleGenerateMeet = async () => {
    if (!googleTokens) return;
    if (!meetTitle || !meetDate) {
      toast.error("Please fill in the meeting title and date first!");
      return;
    }

    setIsGeneratingMeet(true);
    try {
      const resp = await fetch("/api/meetings/create-google-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens: googleTokens,
          title: meetTitle,
          description: meetDesc,
          startDateTime: meetDate,
        }),
      });
      const data = await resp.json();
      if (data.meetLink) {
        setMeetLoc(data.meetLink);
        setMeetType("online");
        toast.success("Google Meet link generated!");
      }
    } catch (err) {
      toast.error("Error generating meeting link.");
    } finally {
      setIsGeneratingMeet(false);
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await createMeeting({
        creatorId: profile.uid,
        creatorName: profile.fullName,
        title: meetTitle,
        type: meetType,
        location: meetLoc,
        dateTime: new Date(meetDate),
        description: meetDesc,
      });
      setIsCreatingMeeting(false);
      setMeetTitle("");
      toast.success("Meeting scheduled successfully!");
    } catch (err) {
      toast.error("Error scheduling meeting.");
    }
  };

  // Filter posts reactively using global searchQuery
  const filteredPosts = posts.filter((post) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      post.content.toLowerCase().includes(query) ||
      post.authorName.toLowerCase().includes(query)
    );
  });

  // Filter meetings reactively using global searchQuery
  const filteredMeetings = meetings.filter((meet) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      meet.title.toLowerCase().includes(query) ||
      meet.description.toLowerCase().includes(query) ||
      meet.location.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Tabs */}
      <div className="flex glass bg-[var(--bg-app)]/40 p-2 rounded-[2.5rem] border border-[var(--glass-border)] shadow-[var(--card-shadow)] backdrop-blur-3xl">
        <button
          onClick={() => setActiveTab("feed")}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === "feed"
              ? "bg-slate-800 dark:bg-indigo-600 text-white shadow-2xl scale-[1.02]"
              : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]/50",
          )}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Community Feed</span>
        </button>
        <button
          onClick={() => setActiveTab("meetings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === "meetings"
              ? "bg-slate-800 dark:bg-indigo-600 text-white shadow-2xl scale-[1.02]"
              : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]/50",
          )}
        >
          <Calendar className="w-5 h-5" />
          <span>Study Sessions</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "feed" ? (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Create Post */}
            <div className="glass p-10 rounded-[3.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform">
                <Send className="w-48 h-48 text-indigo-600" />
              </div>

              <div className="flex gap-6 relative z-10">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 shrink-0 flex items-center justify-center text-white font-black text-2xl shadow-2xl overflow-hidden group-hover:scale-110 transition-transform">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.fullName.charAt(0)
                  )}
                </div>
                <div className="flex-1 space-y-6">
                  <textarea
                    placeholder="Engage with the StudentLink community... Share notes, resources, or questions with the network."
                    className="w-full bg-[var(--bg-app)]/60 dark:bg-slate-950/40 border border-[var(--glass-border)] rounded-[2.5rem] p-8 min-h-[160px] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none resize-none transition-all font-medium text-lg placeholder:text-[var(--text-muted)] opacity-60 text-[var(--text-main)]"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 border-t border-slate-100/50">
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        id="post-file"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="post-file"
                        className="flex items-center gap-3 px-6 py-3 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all cursor-pointer"
                      >
                        <Paperclip className="w-5 h-5" />
                        <span>
                          {selectedFile
                            ? selectedFile.name
                            : "Digital Attachment"}
                        </span>
                      </label>
                      {selectedFile && (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 rotate-45" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handlePostSubmit}
                      disabled={
                        (!postContent.trim() && !selectedFile) || isUploading
                      }
                      className="bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl disabled:opacity-30 transition-all flex items-center gap-3 active:scale-95 whitespace-nowrap"
                    >
                      {isUploading ? "Syncing..." : "Broadcast Signal"}{" "}
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {isUploading && (
                <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700"
                  />
                </div>
              )}
            </div>

            {/* Posts List */}
            <div className="space-y-8">
              {filteredPosts.map((post) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={post.id}
                  className="glass p-10 rounded-[3.5rem] group"
                >
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-app)]/40 flex items-center justify-center text-[var(--text-muted)] font-black text-xl border border-[var(--glass-border)] shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                      {post.authorPhoto ? (
                        <img
                          src={post.authorPhoto}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        post.authorName.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-[var(--text-main)] text-lg uppercase tracking-tight">
                        {post.authorName}
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {post.createdAt
                          ? format(post.createdAt.toDate(), "d MMM - HH:mm", {
                              locale: enUS,
                            })
                          : "Just now"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[var(--text-main)] text-lg leading-relaxed border-l-4 border-indigo-600/20 dark:border-indigo-500/40 pl-8 mb-8">
                    {post.content}
                  </p>

                  {post.attachments && post.attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {post.attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="p-4 glass rounded-[1.8rem] flex items-center justify-between group/file hover:bg-indigo-600/5 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover/file:bg-indigo-600 group-hover/file:text-white transition-all">
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight truncate max-w-[120px]">
                              {file.name}
                            </span>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="meetings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center glass bg-[var(--bg-app)]/40 p-8 rounded-[3rem] border border-[var(--glass-border)] backdrop-blur-2xl">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase font-display">
                  Collaborative Space
                </h3>
                <p className="text-slate-400 font-medium">
                  Schedule meetings and collaborate with your peers.
                </p>
              </div>
              <button
                onClick={() => setIsCreatingMeeting(true)}
                className="px-10 py-5 bg-slate-800 dark:bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" /> Launch Session
              </button>
            </div>

            <AnimatePresence>
              {isCreatingMeeting && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="glass p-12 rounded-[4rem] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12">
                    <Calendar className="w-48 h-48 text-indigo-600" />
                  </div>

                  <form
                    onSubmit={handleMeetingSubmit}
                    className="space-y-8 relative z-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
                          Session Subject
                        </label>
                        <input
                          required
                          className="w-full bg-[var(--bg-app)]/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-8 py-5 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-[var(--text-main)] text-sm uppercase tracking-tight"
                          placeholder="e.g., Quantum Physics Exam Review"
                          value={meetTitle}
                          onChange={(e) => setMeetTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
                          Event Type
                        </label>
                        <select
                          className="w-full bg-[var(--bg-app)]/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-8 py-5 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none appearance-none font-black text-[10px] uppercase tracking-widest cursor-pointer text-[var(--text-main)]"
                          value={meetType}
                          onChange={(e) => setMeetType(e.target.value as any)}
                        >
                          <option value="online">ONLINE Presence</option>
                          <option value="physical">PHYSICAL Presence</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          required
                          className="w-full bg-[var(--bg-app)]/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-8 py-5 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-xs uppercase text-[var(--text-main)]"
                          value={meetDate}
                          onChange={(e) => setMeetDate(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
                          {meetType === "online"
                            ? "Connection Link"
                            : "Physical Location"}
                        </label>
                        <div className="flex gap-4">
                          <input
                            required
                            className="flex-1 bg-[var(--bg-app)]/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-8 py-5 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-sm text-[var(--text-main)]"
                            placeholder={
                              meetType === "online"
                                ? "Google Meet / Zoom URL"
                                : "Central Library / Room 201"
                            }
                            value={meetLoc}
                            onChange={(e) => setMeetLoc(e.target.value)}
                          />
                          {meetType === "online" &&
                            (googleTokens ? (
                              <button
                                type="button"
                                onClick={handleGenerateMeet}
                                disabled={isGeneratingMeet}
                                className="px-8 bg-emerald-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-3 shadow-xl shadow-emerald-100"
                              >
                                {isGeneratingMeet ? (
                                  "..."
                                ) : (
                                  <Video className="w-5 h-5" />
                                )}{" "}
                                Generate Meet
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleGoogleConnect}
                                className="px-8 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl"
                              >
                                <Video className="w-5 h-5" /> Google Sync
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-6 pt-6">
                      <button
                        type="button"
                        onClick={() => setIsCreatingMeeting(false)}
                        className="px-10 py-5 font-black text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-indigo-600 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-12 py-5 bg-slate-800 dark:bg-indigo-600 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all"
                      >
                        Create Event
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredMeetings.map((meet) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  key={meet.id}
                  className="glass p-10 rounded-[4rem] flex flex-col justify-between group transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <div
                        className={cn(
                          "px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border",
                          meet.type === "online"
                            ? "bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                            : "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {meet.type}
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                        <Users className="w-4 h-4 text-indigo-500" />
                        {meet.participants.length} Participants
                      </div>
                    </div>
                    <h4 className="text-2xl font-black text-[var(--text-main)] mb-4 tracking-tight uppercase group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {meet.title}
                    </h4>
                    <div className="space-y-4 mt-6 p-6 bg-[var(--bg-app)]/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-4 text-sm text-[var(--text-main)] font-bold">
                        <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Clock className="w-5 h-5" />
                        </div>
                        {format(meet.dateTime, "EEEE, d MMM - HH:mm", {
                          locale: enUS,
                        })}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-main)] font-bold">
                        <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          {meet.type === "online" ? (
                            <Video className="w-5 h-5" />
                          ) : (
                            <MapPin className="w-5 h-5" />
                          )}
                        </div>
                        <span className="truncate">{meet.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-100/50 flex items-center justify-between gap-6">
                    <div className="flex -space-x-3 overflow-hidden">
                      {meet.participants.slice(0, 4).map((p, i) => (
                        <div
                          key={i}
                          className="inline-block h-10 w-10 rounded-2xl ring-4 ring-[var(--bg-app)] glass bg-[var(--bg-sidebar)] border border-[var(--glass-border)]"
                        >
                          <img
                            src={`https://picsum.photos/seed/${p}/100/100`}
                            className="w-full h-full object-cover rounded-2xl"
                            alt=""
                          />
                        </div>
                      ))}
                      {meet.participants.length > 4 && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl glass font-black text-[10px] text-[var(--text-muted)] uppercase tracking-tighter border border-[var(--glass-border)]">
                          +{meet.participants.length - 4}
                        </div>
                      )}
                    </div>

                    {meet.participants.includes(profile?.uid || "") ? (
                      <button
                        onClick={() =>
                          leaveMeeting(meet.id, profile?.uid || "")
                        }
                        className="px-8 py-4 glass border-rose-100 dark:border-rose-900/40 text-rose-500 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-80"
                      >
                        Leave
                      </button>
                    ) : (
                      <button
                        onClick={() => joinMeeting(meet.id, profile?.uid || "")}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-2xl active:scale-95"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredMeetings.length === 0 && (
              <div className="text-center py-24 glass rounded-[4rem] opacity-60">
                <div className="w-24 h-24 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-8 text-[var(--text-muted)] animate-float opacity-20">
                  <Calendar className="w-12 h-12" />
                </div>
                <p className="text-[var(--text-main)] font-black text-xl uppercase tracking-widest opacity-40">
                  No Scheduled Events
                </p>
                <p className="text-[var(--text-muted)] font-medium mt-2 opacity-40">
                  Create the first collaborative study session yourself.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
