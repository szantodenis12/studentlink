import React, { useState, useEffect, useRef } from "react";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  leaveMeeting,
  createComment,
  getComments,
  updateComment,
  deleteComment,
  likeComment,
  reactToComment,
  replyToComment,
  sendChatMessage,
  getChatMessages,
  Post,
  Meeting,
  PostComment,
  ChatMessage,
  CommentReply
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
  Heart,
  Smile,
  Reply,
  Edit2,
  Trash2,
  Map,
  MessageCircle,
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "../lib/utils";
import { useSearch } from "../context/SearchContext";

// ================= SUB-COMPONENT: POST COMMENTS PANEL =================
function PostCommentsSection({ postId, profile }: { postId: string; profile: any }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPickerId, setShowEmojiPickerId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = getComments(postId, setComments);
    return () => unsub();
  }, [postId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !profile) return;
    try {
      await createComment({
        postId,
        authorId: profile.uid,
        authorName: profile.fullName,
        authorPhoto: profile.photoURL || "",
        content: newCommentText,
      });
      setNewCommentText("");
      toast.success("Comment published!");
    } catch (err) {
      console.error("Error posting comment:", err);
      toast.error("Error posting comment.");
    }
  };

  const handleCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateComment(commentId, editingCommentText);
      setEditingCommentId(null);
      setEditingCommentText("");
      toast.success("Comment updated!");
    } catch (err) {
      console.error("Error updating comment:", err);
      toast.error("Error updating comment.");
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (window.confirm("Delete this comment?")) {
      try {
        await deleteComment(commentId);
        toast.success("Comment deleted.");
      } catch (err) {
        console.error("Error deleting comment:", err);
        toast.error("Error deleting comment.");
      }
    }
  };

  const handleLike = async (comment: PostComment) => {
    if (!profile) return;
    try {
      await likeComment(comment.id, profile.uid, comment.likes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = async (comment: PostComment, emoji: string) => {
    if (!profile) return;
    try {
      await reactToComment(comment.id, profile.uid, emoji, comment.reactions || {});
      setShowEmojiPickerId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyText.trim() || !profile) return;
    try {
      await replyToComment(commentId, {
        id: `${profile.uid}_${Date.now()}`,
        authorId: profile.uid,
        authorName: profile.fullName,
        authorPhoto: profile.photoURL || "",
        content: replyText,
        createdAt: Date.now()
      });
      setReplyText("");
      setReplyingToId(null);
      toast.success("Reply added!");
    } catch (err) {
      console.error("Error posting reply:", err);
      toast.error("Error posting reply.");
    }
  };

  return (
    <div className="glass bg-[var(--bg-app)]/20 p-8 rounded-[2.5rem] border border-indigo-100/40 space-y-6">
      <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100/50 pb-4">Discussion Thread</h5>
      
      {/* Comments List */}
      <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium py-6 text-center">No comments yet. Be the first to start the conversation!</p>
        ) : (
          comments.map((comment) => {
            const hasLiked = comment.likes?.includes(profile?.uid || "");
            return (
              <div key={comment.id} className="space-y-4 bg-white/40 dark:bg-slate-900/10 p-5 rounded-2xl border border-white/5 shadow-sm">
                <div className="flex gap-4">
                  {/* Author Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase overflow-hidden">
                    {comment.authorPhoto ? (
                      <img src={comment.authorPhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      comment.authorName.charAt(0)
                    )}
                  </div>
                  
                  {/* Comment Bubble */}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{comment.authorName}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {comment.createdAt?.toDate 
                          ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) 
                          : "Just now"}
                      </span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          className="flex-1 bg-white p-2.5 rounded-xl border border-indigo-100 outline-none text-xs font-semibold"
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <button
                          onClick={() => handleCommentEdit(comment.id)}
                          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }}
                          className="px-4 py-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center gap-4 pt-2 relative">
                      {/* Like */}
                      <button
                        onClick={() => handleLike(comment)}
                        className={cn(
                          "flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all",
                          hasLiked ? "text-rose-500 scale-105" : "text-slate-400 hover:text-rose-500"
                        )}
                      >
                        <Heart className={cn("w-3.5 h-3.5", hasLiked ? "fill-current" : "")} />
                        <span>{comment.likes?.length || 0}</span>
                      </button>

                      {/* React */}
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPickerId(showEmojiPickerId === comment.id ? null : comment.id)}
                          className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          <Smile className="w-3.5 h-3.5" />
                          <span>React</span>
                        </button>

                        <AnimatePresence>
                          {showEmojiPickerId === comment.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className="absolute z-30 bottom-6 left-0 bg-white glass p-2 rounded-xl border border-indigo-100 flex gap-2 shadow-xl shrink-0"
                            >
                              {["👍", "❤️", "🔥", "👏", "💡"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(comment, emoji)}
                                  className="w-7 h-7 text-sm hover:scale-125 transition-transform flex items-center justify-center"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Reply */}
                      <button
                        onClick={() => { setReplyingToId(replyingToId === comment.id ? null : comment.id); setReplyText(""); }}
                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>

                      {/* Edit / Delete (CRUD) */}
                      {comment.authorId === profile?.uid && (
                        <div className="ml-auto flex items-center gap-3">
                          <button
                            onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCommentDelete(comment.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reaction Badges */}
                    {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {Object.entries(comment.reactions).map(([emoji, uids]) => {
                          const userReacted = uids.includes(profile?.uid || "");
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReact(comment, emoji)}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                userReacted 
                                  ? "bg-indigo-50 border-indigo-100 text-indigo-600 scale-105" 
                                  : "bg-white/40 border-slate-100 text-slate-500 hover:bg-indigo-50/50"
                              )}
                            >
                              <span>{emoji}</span>
                              <span>{uids.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Replies List */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-12 space-y-4 border-l-2 border-indigo-50/40 ml-5">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 bg-indigo-50/10 p-4 rounded-xl border border-white/5 shadow-inner">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase overflow-hidden">
                          {reply.authorPhoto ? (
                            <img src={reply.authorPhoto} className="w-full h-full object-cover" alt="" />
                          ) : (
                            reply.authorName.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{reply.authorName}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">
                              {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Box */}
                <AnimatePresence>
                  {replyingToId === comment.id && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={(e) => handleReplySubmit(e, comment.id)}
                      className="pl-12 flex gap-2 overflow-hidden pt-2"
                    >
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        className="flex-1 bg-white px-4 py-2.5 rounded-xl border border-indigo-100 outline-none text-xs font-semibold shadow-inner placeholder:text-slate-400"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest disabled:opacity-50 hover:bg-slate-800 transition-all flex items-center gap-1 shrink-0"
                      >
                        Reply <Send className="w-3 h-3" />
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Main Comment Input Bar */}
      <form onSubmit={handleCommentSubmit} className="flex gap-3 pt-4 border-t border-slate-100/50">
        <input
          type="text"
          placeholder="Share your thoughts on this broadcast..."
          className="flex-1 bg-white/60 dark:bg-slate-950/40 border border-indigo-100 px-5 py-3.5 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-semibold text-xs text-[var(--text-main)] shadow-inner"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
        />
        <button
          type="submit"
          disabled={!newCommentText.trim()}
          className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
        >
          Send <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}

// ================= MAIN COMMUNITY PAGE COMPONENT =================
export default function CommunityPage() {
  const { profile } = useAuth();
  const { searchQuery } = useSearch();

  const getGoogleMapsUrl = (locationStr: string) => {
    if (locationStr.includes("@")) {
      const parts = locationStr.split("@");
      const coords = parts[1].trim(); // "lat,lng"
      return `https://maps.google.com/maps?q=${coords}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(locationStr)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  };

  const getGoogleMapsSearchUrl = (locationStr: string) => {
    if (locationStr.includes("@")) {
      const parts = locationStr.split("@");
      const coords = parts[1].trim(); // "lat,lng"
      return `https://www.google.com/maps/search/?api=1&query=${coords}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}`;
  };

  const getFriendlyLocation = (locationStr: string) => {
    if (locationStr.includes("@")) {
      return locationStr.split("@")[0].trim();
    }
    return locationStr;
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState<"feed" | "meetings" | "chat">("feed");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // Map interactive states
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Post state
  const [postContent, setPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Post Editing state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");

  // Meeting state
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetTitle, setMeetTitle] = useState("");
  const [meetType, setMeetType] = useState<"online" | "physical">("online");
  const [meetLoc, setMeetLoc] = useState("");
  const [meetLat, setMeetLat] = useState<number | null>(null);
  const [meetLng, setMeetLng] = useState<number | null>(null);
  const [meetDate, setMeetDate] = useState("");
  const [meetDesc, setMeetDesc] = useState("");
  const [googleTokens, setGoogleTokens] = useState<any>(null);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);

  // Map collapse state on physical sessions
  const [expandedMeetingMapId, setExpandedMeetingMapId] = useState<string | null>(null);

  // Comments toggler state
  const [expandedPostCommentsId, setExpandedPostCommentsId] = useState<string | null>(null);

  // Chat Lobby state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Sync Global Lobby Chat
  useEffect(() => {
    if (activeTab === "chat") {
      const unsubChat = getChatMessages(setChatMessages);
      return () => unsubChat();
    }
  }, [activeTab]);

  // ================= INTERACTIVE LEAFLET MAP & NOMINATIM GEOLOCATION =================
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setMeetLat(lat);
      setMeetLng(lng);
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setMeetLoc(data.display_name);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  const fetchSuggestions = async (text: string) => {
    try {
      setIsSearchingLocation(true);
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setMapSuggestions(data || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Location search failed:", err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleLocationSearch = (text: string) => {
    setMeetLoc(text);
    if (text.trim().length < 3) {
      setMapSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 500);
  };

  const handleSelectSuggestion = (sug: any) => {
    setMeetLoc(sug.display_name);
    setMapSuggestions([]);
    setShowSuggestions(false);

    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    
    setMeetLat(lat);
    setMeetLng(lng);

    if (mapRef.current && markerRef.current) {
      const L = (window as any).L;
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 16);
    }
  };

  useEffect(() => {
    if (meetType !== "physical" || !isCreatingMeeting) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    // Initialize Leaflet Map
    const timer = setTimeout(async () => {
      const L = (window as any).L;
      if (!L || mapRef.current) return;

      let defaultLat = meetLat || 46.7712;
      let defaultLng = meetLng || 23.6236;

      // If editing or existing location is present, geocode it first to center map
      if (!meetLat && !meetLng && meetLoc.trim().length > 3) {
        try {
          const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(meetLoc)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            defaultLat = parseFloat(data[0].lat);
            defaultLng = parseFloat(data[0].lon);
            setMeetLat(defaultLat);
            setMeetLng(defaultLng);
          }
        } catch (err) {
          console.error("Initial geocoding failed:", err);
        }
      }

      const mapContainer = document.getElementById("scheduler-map");
      if (!mapContainer) return;

      const map = L.map("scheduler-map").setView([defaultLat, defaultLng], 14);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Drag listener
      marker.on("dragend", async () => {
        const position = marker.getLatLng();
        await reverseGeocode(position.lat, position.lng);
      });

      // Click listener
      map.on("click", async (e: any) => {
        marker.setLatLng(e.latlng);
        await reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [meetType, isCreatingMeeting]);

  // WhatsApp-style Auto-scroll to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // CRUD: Submit chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !profile) return;
    try {
      await sendChatMessage(newChatMessage, profile.uid, profile.fullName, profile.photoURL || "");
      setNewChatMessage("");
    } catch (err) {
      toast.error("Failed to send message.");
    }
  };

  // CRUD: Submit Post
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

  // CRUD: Edit Post
  const handlePostEditSubmit = async (postId: string) => {
    if (!editingPostContent.trim()) return;
    try {
      await updatePost(postId, editingPostContent);
      setEditingPostId(null);
      setEditingPostContent("");
      toast.success("Post updated successfully!");
    } catch (err) {
      toast.error("Error updating post.");
    }
  };

  // CRUD: Delete Post
  const handlePostDelete = async (postId: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(postId);
        toast.success("Post deleted.");
      } catch (err) {
        toast.error("Failed to delete post.");
      }
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

  // CRUD: Save or Update Meeting
  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const savedLocation = meetType === "physical" && meetLat && meetLng
      ? `${meetLoc} @${meetLat},${meetLng}`
      : meetLoc;

    try {
      if (editingMeetingId) {
        await updateMeeting(editingMeetingId, {
          title: meetTitle,
          type: meetType,
          location: savedLocation,
          dateTime: new Date(meetDate),
          description: meetDesc,
        });
        toast.success("Meeting updated successfully!");
        setEditingMeetingId(null);
      } else {
        await createMeeting({
          creatorId: profile.uid,
          creatorName: profile.fullName,
          title: meetTitle,
          type: meetType,
          location: savedLocation,
          dateTime: new Date(meetDate),
          description: meetDesc,
        });
        toast.success("Meeting scheduled successfully!");
      }
      setIsCreatingMeeting(false);
      setMeetTitle("");
      setMeetType("online");
      setMeetLoc("");
      setMeetLat(null);
      setMeetLng(null);
      setMeetDate("");
      setMeetDesc("");
      setMapSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      toast.error("Error saving meeting.");
    }
  };

  const handleEditMeetingClick = (meet: Meeting) => {
    setEditingMeetingId(meet.id);
    setMeetTitle(meet.title);
    setMeetType(meet.type);
    
    if (meet.type === "physical" && meet.location.includes("@")) {
      const parts = meet.location.split("@");
      setMeetLoc(parts[0].trim());
      const coords = parts[1].split(",");
      setMeetLat(parseFloat(coords[0]));
      setMeetLng(parseFloat(coords[1]));
    } else {
      setMeetLoc(meet.location);
      setMeetLat(null);
      setMeetLng(null);
    }

    const formattedDate = format(meet.dateTime, "yyyy-MM-dd'T'HH:mm");
    setMeetDate(formattedDate);
    setMeetDesc(meet.description);
    setIsCreatingMeeting(true);
  };

  const handleDeleteMeetingClick = async (meetingId: string) => {
    if (window.confirm("Are you sure you want to cancel this study session?")) {
      try {
        await deleteMeeting(meetingId);
        toast.success("Study session cancelled.");
      } catch (err) {
        toast.error("Failed to cancel study session.");
      }
    }
  };

  // Filter posts reactively using global searchQuery
  const filteredPosts = posts.filter((post) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      (post.content || "").toLowerCase().includes(query) ||
      (post.authorName || "").toLowerCase().includes(query)
    );
  });

  // Filter meetings reactively using global searchQuery
  const filteredMeetings = meetings.filter((meet) => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") return true;
    return (
      (meet.title || "").toLowerCase().includes(query) ||
      (meet.description || "").toLowerCase().includes(query) ||
      (meet.location || "").toLowerCase().includes(query)
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
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === "chat"
              ? "bg-slate-800 dark:bg-indigo-600 text-white shadow-2xl scale-[1.02]"
              : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]/50",
          )}
        >
          <MessageCircle className="w-5 h-5" />
          <span>Group Chat</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "feed" && (
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

                    {/* Post creator CRUD triggers */}
                    {post.authorId === profile?.uid && (
                      <div className="ml-auto flex items-center gap-4 relative z-10">
                        <button
                          onClick={() => {
                            setEditingPostId(editingPostId === post.id ? null : post.id);
                            setEditingPostContent(post.content);
                          }}
                          className="p-3 bg-[var(--bg-app)]/50 hover:bg-indigo-600 hover:text-white rounded-xl border border-[var(--glass-border)] hover:border-indigo-600 transition-all cursor-pointer shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePostDelete(post.id)}
                          className="p-3 bg-[var(--bg-app)]/50 hover:bg-rose-500/15 hover:text-rose-500 rounded-xl border border-[var(--glass-border)] hover:border-rose-100 transition-all cursor-pointer shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingPostId === post.id ? (
                    <div className="space-y-4 mb-8 pl-8 border-l-4 border-indigo-600">
                      <textarea
                        className="w-full bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-indigo-100 outline-none text-sm font-semibold"
                        value={editingPostContent}
                        onChange={(e) => setEditingPostContent(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePostEditSubmit(post.id)}
                          className="px-6 py-3 bg-indigo-600 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setEditingPostId(null);
                            setEditingPostContent("");
                          }}
                          className="px-6 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[var(--text-main)] text-lg leading-relaxed border-l-4 border-indigo-600/20 dark:border-indigo-500/40 pl-8 mb-8">
                      {post.content}
                    </p>
                  )}

                  {post.attachments && post.attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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

                  {/* Collapsible comments thread trigger */}
                  <div className="pt-6 border-t border-slate-100/50 flex justify-between items-center">
                    <button
                      onClick={() => setExpandedPostCommentsId(expandedPostCommentsId === post.id ? null : post.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                        expandedPostCommentsId === post.id
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "glass border-indigo-100 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                      )}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Discussion Thread</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedPostCommentsId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="mt-6 overflow-hidden"
                      >
                        <PostCommentsSection postId={post.id} profile={profile} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "meetings" && (
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
                onClick={() => {
                  setEditingMeetingId(null);
                  setMeetTitle("");
                  setMeetType("online");
                  setMeetLoc("");
                  setMeetDate("");
                  setMeetDesc("");
                  setIsCreatingMeeting(true);
                }}
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
                    <h4 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight border-b border-slate-100 pb-4">
                      {editingMeetingId ? "Edit Study Session Details" : "Launch Collaborative Session"}
                    </h4>
                    
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
                          onChange={(e) => {
                            setMeetType(e.target.value as any);
                            setMeetLoc("");
                          }}
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
                            : "Physical Location Address"}
                        </label>
                        <div className="flex gap-4 relative">
                          <div className="flex-1 relative">
                            <input
                              required
                              className="w-full bg-[var(--bg-app)]/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 px-8 py-5 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-black text-sm text-[var(--text-main)]"
                              placeholder={
                                meetType === "online"
                                  ? "Google Meet / Zoom URL"
                                  : "University Library, Boulevard 12, Cluj-Napoca"
                              }
                              value={meetLoc}
                              onChange={(e) => {
                                if (meetType === "physical") {
                                  handleLocationSearch(e.target.value);
                                } else {
                                  setMeetLoc(e.target.value);
                                }
                              }}
                              onFocus={() => {
                                if (meetType === "physical" && mapSuggestions.length > 0) {
                                  setShowSuggestions(true);
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => setShowSuggestions(false), 250);
                              }}
                            />

                            {/* Autocomplete suggestions floating dropdown */}
                            {meetType === "physical" && showSuggestions && mapSuggestions.length > 0 && (
                              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-950 border border-indigo-100/50 dark:border-slate-800/50 rounded-[1.5rem] shadow-2xl z-[9999] overflow-hidden max-h-60 overflow-y-auto backdrop-blur-md">
                                {mapSuggestions.map((sug, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(sug)}
                                    className="w-full text-left px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100/30 last:border-b-0 flex flex-col gap-0.5"
                                  >
                                    <span className="font-extrabold text-[var(--text-main)]">{sug.name || sug.address?.road || "Locality"}</span>
                                    <span className="text-[10px] text-slate-400 font-medium truncate">{sug.display_name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {meetType === "online" &&
                            (googleTokens ? (
                              <button
                                type="button"
                                onClick={handleGenerateMeet}
                                disabled={isGeneratingMeet}
                                className="px-8 bg-emerald-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-3 shadow-xl"
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

                        {/* Interactive Leaflet Map for PHYSICAL study sessions */}
                        {meetType === "physical" && (
                          <div className="space-y-2 mt-4 relative z-10">
                            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-1.5 animate-pulse">
                              <span>📍</span> Click on the map or drag the marker to adjust the exact location
                            </p>
                            <div className="w-full h-64 rounded-[2rem] overflow-hidden border border-indigo-100/40 dark:border-slate-800/40 shadow-inner relative">
                              <div id="scheduler-map" className="w-full h-full" style={{ zIndex: 1 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-6 pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingMeeting(false);
                          setEditingMeetingId(null);
                          setMeetTitle("");
                          setMeetType("online");
                          setMeetLoc("");
                          setMeetDate("");
                          setMeetDesc("");
                          setMapSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="px-10 py-5 font-black text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-indigo-600 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-12 py-5 bg-slate-800 dark:bg-indigo-600 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all"
                      >
                        {editingMeetingId ? "Save Updates" : "Create Event"}
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
                      
                      {/* Creator CRUD actions */}
                      {meet.creatorId === profile?.uid ? (
                        <div className="flex items-center gap-3 relative z-10">
                          <button
                            onClick={() => handleEditMeetingClick(meet)}
                            className="p-2.5 bg-[var(--bg-app)]/50 hover:bg-indigo-600 hover:text-white rounded-xl border border-[var(--glass-border)] hover:border-indigo-600 transition-all cursor-pointer shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMeetingClick(meet.id)}
                            className="p-2.5 bg-[var(--bg-app)]/50 hover:bg-rose-500/15 hover:text-rose-500 rounded-xl border border-[var(--glass-border)] hover:border-rose-100 transition-all cursor-pointer shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                          <Users className="w-4 h-4 text-indigo-500" />
                          {meet.participants.length} Participants
                        </div>
                      )}
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
                        <span className="truncate flex-1">{getFriendlyLocation(meet.location)}</span>
                        
                        {/* Google Maps view trigger button for physical meetings */}
                        {meet.type === "physical" && (
                          <button
                            onClick={() => setExpandedMeetingMapId(expandedMeetingMapId === meet.id ? null : meet.id)}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all cursor-pointer",
                              expandedMeetingMapId === meet.id 
                                ? "bg-indigo-600 border-indigo-600 text-white" 
                                : "glass border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                            )}
                          >
                            <Map className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Collapsible physical map representation */}
                      <AnimatePresence>
                        {meet.type === "physical" && expandedMeetingMapId === meet.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 160 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="w-full rounded-2xl overflow-hidden border border-indigo-50/40 relative shadow-inner mt-2 shrink-0"
                          >
                            <iframe
                              title="Interactive Google Map"
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              style={{ border: 0 }}
                              src={getGoogleMapsUrl(meet.location)}
                              allowFullScreen
                            />
                            <a
                              href={getGoogleMapsSearchUrl(meet.location)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-2.5 right-2.5 px-3 py-1.5 bg-indigo-600 hover:bg-slate-800 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow flex items-center gap-1 transition-all"
                            >
                              <ExternalLink className="w-2.5 h-2.5" /> Navigate
                            </a>
                          </motion.div>
                        )}
                      </AnimatePresence>
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

        {/* Global Community WhatsApp-style Chat Room */}
        {activeTab === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-[3rem] border border-[var(--glass-border)] h-[calc(100vh-16rem)] flex flex-col overflow-hidden relative shadow-[var(--card-shadow)] backdrop-blur-3xl"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900/5 dark:bg-slate-950/20 border-b border-[var(--glass-border)] flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-[var(--text-main)] uppercase tracking-tight text-base">StudentLink Global Lobby</h4>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Chat Sync Active
                </p>
              </div>
            </div>

            {/* Messages body (independent scroll) */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth custom-scrollbar bg-slate-50/10 dark:bg-slate-950/5">
              {chatMessages.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-pulse" />
                  <p className="text-sm font-black uppercase tracking-widest">Lobby is quiet...</p>
                  <p className="text-xs font-semibold">Initiate a greeting and break the ice!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === profile?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3 max-w-[80%] md:max-w-[65%]",
                        isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {/* Message author photo */}
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white shrink-0 flex items-center justify-center font-black text-xs shadow overflow-hidden uppercase">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} className="w-full h-full object-cover" alt="" />
                        ) : (
                          msg.senderName.charAt(0)
                        )}
                      </div>

                      {/* Bubble styling */}
                      <div className="space-y-1">
                        <div
                          className={cn(
                            "px-5 py-3.5 rounded-[1.5rem] border shadow-glow-sm relative leading-relaxed",
                            isMe
                              ? "bg-indigo-600 border-indigo-600 text-white rounded-tr-none"
                              : "bg-white/70 dark:bg-slate-900/40 border-[var(--glass-border)] text-[var(--text-main)] rounded-tl-none"
                          )}
                        >
                          {!isMe && (
                            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">
                              {msg.senderName}
                            </p>
                          )}
                          <p className="text-xs font-medium leading-relaxed break-words">{msg.text}</p>
                        </div>
                        <p
                          className={cn(
                            "text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1",
                            isMe ? "text-right" : "text-left"
                          )}
                        >
                          {msg.createdAt?.toDate 
                            ? format(msg.createdAt.toDate(), "HH:mm") 
                            : "Just now"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* WhatsApp-style locked bottom input container */}
            <form
              onSubmit={handleSendChat}
              className="p-6 bg-slate-900/5 dark:bg-slate-950/20 border-t border-[var(--glass-border)] flex gap-4 shrink-0 items-center relative z-10"
            >
              <input
                type="text"
                placeholder="Type message here... Let's collaborate!"
                className="flex-1 bg-white/70 dark:bg-slate-950/40 border border-[var(--glass-border)] px-6 py-4.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none font-semibold text-xs text-[var(--text-main)] shadow-inner"
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newChatMessage.trim()}
                className="px-8 py-4.5 bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-30 transition-all shrink-0 cursor-pointer"
              >
                Send <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
