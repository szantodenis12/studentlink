import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDocs,
  getDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notificationService";

export interface Course {
  id: string;
  title: string;
  description: string;
  professorId: string;
  professorName: string;
  materials: { name: string; url: string; type: string }[];
  createdAt: any;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: Date;
  createdAt: any;
}

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string; // Added to help professors filter
  studentId: string;
  studentName: string;
  fileUrl: string;
  fileName: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'graded';
  submittedAt: any;
}

// Courses
export const createCourse = async (course: Omit<Course, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, "courses"), {
    ...course,
    createdAt: serverTimestamp()
  });
};

export const getCourses = (callback: (courses: Course[]) => void) => {
  const q = query(collection(db, "courses"));
  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    callback(courses);
  });
};

export const addCourseMaterial = async (courseId: string, material: { name: string; url: string; type: string }) => {
  return updateDoc(doc(db, "courses", courseId), {
    materials: arrayUnion(material)
  });
};

// Assignments
export const createAssignment = async (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, "assignments"), {
    ...assignment,
    createdAt: serverTimestamp()
  });
};

export const getAssignments = (courseId: string, callback: (assignments: Assignment[]) => void) => {
  const q = query(collection(db, "assignments"), where("courseId", "==", courseId));
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      dueDate: doc.data().dueDate.toDate() // Convert Firestore Timestamp to JS Date
    } as any));
    callback(assignments);
  });
};

// Enrollment
export const enrollInCourse = async (userId: string, courseId: string) => {
  return updateDoc(doc(db, "users", userId), {
    "academicData.enrolledCourses": arrayUnion(courseId)
  });
};

// Submissions
export const submitAssignment = async (submission: Omit<Submission, 'id' | 'submittedAt' | 'status'>) => {
  return addDoc(collection(db, "submissions"), {
    ...submission,
    status: 'pending',
    submittedAt: serverTimestamp()
  });
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
  const submissionRef = doc(db, "submissions", submissionId);
  const submissionSnap = await getDoc(submissionRef);
  
  if (submissionSnap.exists()) {
    const subData = submissionSnap.data();
    const assignmentSnap = await getDoc(doc(db, "assignments", subData.assignmentId));
    const assignmentTitle = assignmentSnap.exists() ? assignmentSnap.data().title : "o temă";

    await updateDoc(submissionRef, {
      grade,
      feedback,
      status: 'graded'
    });

    // Create notification for student
    await createNotification({
      userId: subData.studentId,
      title: "Temă Notată",
      content: `Ai primit nota ${grade} la tema "${assignmentTitle}".`,
      type: 'grade',
      link: `/academic/${subData.courseId}`
    });
  }
};

export const getSubmissionsForAssignment = (assignmentId: string, callback: (submissions: Submission[]) => void) => {
  const q = query(collection(db, "submissions"), where("assignmentId", "==", assignmentId));
  return onSnapshot(q, (snapshot) => {
    const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
    callback(subs);
  });
};

export const getStudentSubmissionsForAssignment = (assignmentId: string, studentId: string, callback: (submissions: Submission[]) => void) => {
  const q = query(
    collection(db, "submissions"), 
    where("assignmentId", "==", assignmentId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snapshot) => {
    const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
    callback(subs);
  });
};
