import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  where,
  limit
} from "firebase/firestore";
import { db } from "./firebase";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  attachments?: { name: string; url: string }[];
  createdAt: any;
}

export interface Meeting {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  type: 'online' | 'physical';
  location: string;
  dateTime: Date;
  description: string;
  participants: string[]; // List of user IDs
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: number;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
  likes: string[]; // Array of user IDs
  reactions: Record<string, string[]>; // e.g. { "🔥": ["uid1", "uid2"] }
  replies: CommentReply[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  createdAt: any;
}

// ================= Post CRUD =================
export const createPost = async (post: Omit<Post, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, "posts"), {
    ...post,
    createdAt: serverTimestamp()
  });
};

export const getPosts = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
  });
};

export const updatePost = async (postId: string, content: string) => {
  return updateDoc(doc(db, "posts", postId), {
    content
  });
};

export const deletePost = async (postId: string) => {
  return deleteDoc(doc(db, "posts", postId));
};

// ================= Post Comments CRUD, Likes, Reactions & Thread Replies =================
export const createComment = async (comment: Omit<PostComment, 'id' | 'createdAt' | 'likes' | 'reactions' | 'replies'>) => {
  return addDoc(collection(db, "postComments"), {
    ...comment,
    likes: [],
    reactions: {},
    replies: [],
    createdAt: serverTimestamp()
  });
};

export const getComments = (postId: string, callback: (comments: PostComment[]) => void) => {
  const q = query(
    collection(db, "postComments"), 
    where("postId", "==", postId)
  );
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostComment));
    comments.sort((a, b) => {
      const timeA = a.createdAt?.toDate 
        ? a.createdAt.toDate().getTime() 
        : (a.createdAt instanceof Date ? a.createdAt.getTime() : Date.now());
      const timeB = b.createdAt?.toDate 
        ? b.createdAt.toDate().getTime() 
        : (b.createdAt instanceof Date ? b.createdAt.getTime() : Date.now());
      return timeA - timeB;
    });
    callback(comments);
  });
};

export const updateComment = async (commentId: string, content: string) => {
  return updateDoc(doc(db, "postComments", commentId), {
    content
  });
};

export const deleteComment = async (commentId: string) => {
  return deleteDoc(doc(db, "postComments", commentId));
};

export const likeComment = async (commentId: string, userId: string, currentLikes: string[]) => {
  const isLiked = currentLikes.includes(userId);
  return updateDoc(doc(db, "postComments", commentId), {
    likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
  });
};

export const reactToComment = async (commentId: string, userId: string, emoji: string, currentReactions: Record<string, string[]>) => {
  const updatedReactions = { ...currentReactions };
  
  if (!updatedReactions[emoji]) {
    updatedReactions[emoji] = [];
  }
  
  const hasReacted = updatedReactions[emoji].includes(userId);
  
  if (hasReacted) {
    updatedReactions[emoji] = updatedReactions[emoji].filter(id => id !== userId);
  } else {
    // Optionally remove user from other emojis first to allow only one reaction type, 
    // or keep multiple reactions. Let's allow multiple reaction emojis per comment, but toggle this specific one!
    updatedReactions[emoji].push(userId);
  }
  
  // Clean up empty emoji lists
  if (updatedReactions[emoji].length === 0) {
    delete updatedReactions[emoji];
  }

  return updateDoc(doc(db, "postComments", commentId), {
    reactions: updatedReactions
  });
};

export const replyToComment = async (commentId: string, reply: CommentReply) => {
  return updateDoc(doc(db, "postComments", commentId), {
    replies: arrayUnion(reply)
  });
};

// ================= Meeting CRUD =================
export const createMeeting = async (meeting: Omit<Meeting, 'id' | 'participants'>) => {
  return addDoc(collection(db, "meetings"), {
    ...meeting,
    participants: [meeting.creatorId],
    createdAt: serverTimestamp()
  });
};

export const getMeetings = (callback: (meetings: Meeting[]) => void) => {
  const q = query(collection(db, "meetings"), orderBy("dateTime", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        dateTime: data.dateTime?.toDate ? data.dateTime.toDate() : new Date(data.dateTime)
      } as any;
    }));
  });
};

export const updateMeeting = async (meetingId: string, data: Partial<Omit<Meeting, 'id' | 'creatorId' | 'creatorName' | 'participants'>>) => {
  return updateDoc(doc(db, "meetings", meetingId), {
    ...data
  });
};

export const deleteMeeting = async (meetingId: string) => {
  return deleteDoc(doc(db, "meetings", meetingId));
};

export const joinMeeting = async (meetingId: string, userId: string) => {
  return updateDoc(doc(db, "meetings", meetingId), {
    participants: arrayUnion(userId)
  });
};

export const leaveMeeting = async (meetingId: string, userId: string) => {
  return updateDoc(doc(db, "meetings", meetingId), {
    participants: arrayRemove(userId)
  });
};

// ================= Global Community Chat Lobby =================
export const sendChatMessage = async (text: string, senderId: string, senderName: string, senderPhoto?: string) => {
  return addDoc(collection(db, "communityMessages"), {
    senderId,
    senderName,
    senderPhoto: senderPhoto || "",
    text,
    createdAt: serverTimestamp()
  });
};

export const getChatMessages = (callback: (messages: ChatMessage[]) => void) => {
  const q = query(
    collection(db, "communityMessages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
  });
};
