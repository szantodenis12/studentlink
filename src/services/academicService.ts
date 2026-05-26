import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs,
  getDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
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
  skills?: string[];
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

export const updateCourse = async (courseId: string, updates: Partial<Course>) => {
  const courseDoc = await getDoc(doc(db, "courses", courseId));
  const currentTitle = courseDoc.exists() ? courseDoc.data().title : "Curs";

  await updateDoc(doc(db, "courses", courseId), updates);

  try {
    const studentsQ = query(
      collection(db, "users"),
      where("academicData.enrolledCourses", "array-contains", courseId)
    );
    const studentsSnap = await getDocs(studentsQ);

    const displayTitle = updates.title || currentTitle;

    const promises = studentsSnap.docs.map(studentDoc => 
      createNotification({
        userId: studentDoc.id,
        title: "Curs Actualizat 📘",
        content: `Cursul "${displayTitle}" a fost actualizat de către profesor.`,
        type: 'system',
        link: `/academic/${courseId}`
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Error creating notifications for updated course:", err);
  }
};

export const deleteCourse = async (courseId: string) => {
  return deleteDoc(doc(db, "courses", courseId));
};

export const getCourses = (callback: (courses: Course[]) => void) => {
  const q = query(collection(db, "courses"));
  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    callback(courses);
  });
};

export const addCourseMaterial = async (courseId: string, material: { name: string; url: string; type: string }) => {
  await updateDoc(doc(db, "courses", courseId), {
    materials: arrayUnion(material)
  });

  try {
    const courseDoc = await getDoc(doc(db, "courses", courseId));
    const courseTitle = courseDoc.exists() ? courseDoc.data().title : "curs";

    const studentsQ = query(
      collection(db, "users"),
      where("academicData.enrolledCourses", "array-contains", courseId)
    );
    const studentsSnap = await getDocs(studentsQ);

    const promises = studentsSnap.docs.map(studentDoc => 
      createNotification({
        userId: studentDoc.id,
        title: "Material Nou 📚",
        content: `A fost adăugat un nou material "${material.name}" la cursul "${courseTitle}".`,
        type: 'system',
        link: `/academic/${courseId}`
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Error creating notifications for new material:", err);
  }
};

// Assignments
export const createAssignment = async (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, "assignments"), {
    ...assignment,
    createdAt: serverTimestamp()
  });

  try {
    const courseSnap = await getDoc(doc(db, "courses", assignment.courseId));
    const courseTitle = courseSnap.exists() ? courseSnap.data().title : "curs";

    const studentsQ = query(
      collection(db, "users"),
      where("academicData.enrolledCourses", "array-contains", assignment.courseId)
    );
    const studentsSnap = await getDocs(studentsQ);

    const promises = studentsSnap.docs.map(studentDoc => 
      createNotification({
        userId: studentDoc.id,
        title: "Temă Nouă 📝",
        content: `A fost adăugată tema "${assignment.title}" la cursul "${courseTitle}".`,
        type: 'assignment',
        link: `/academic/${assignment.courseId}`
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Error creating notifications for new assignment:", err);
  }

  return docRef;
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

export const unenrollFromCourse = async (userId: string, courseId: string) => {
  return updateDoc(doc(db, "users", userId), {
    "academicData.enrolledCourses": arrayRemove(courseId)
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

export interface CourseCompletion {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  quizScore: number;
  quizTotal: number;
  status: 'pending' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt: any;
  gradedAt?: any;
  skills?: string[];
}

export const submitCourseForGrading = async (
  courseId: string,
  courseTitle: string,
  studentId: string,
  studentName: string,
  quizScore: number,
  quizTotal: number,
  skills: string[]
) => {
  return addDoc(collection(db, "courseCompletions"), {
    courseId,
    courseTitle,
    studentId,
    studentName,
    quizScore,
    quizTotal,
    status: 'pending',
    submittedAt: serverTimestamp(),
    skills: skills || []
  });
};

export const getCourseCompletionForStudent = (
  courseId: string,
  studentId: string,
  callback: (completion: CourseCompletion | null) => void
) => {
  const q = query(
    collection(db, "courseCompletions"),
    where("courseId", "==", courseId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const docData = snapshot.docs[0];
      callback({ id: docData.id, ...docData.data() } as CourseCompletion);
    }
  });
};

export const getPendingCourseCompletions = (
  courseId: string,
  callback: (completions: CourseCompletion[]) => void
) => {
  const q = query(
    collection(db, "courseCompletions"),
    where("courseId", "==", courseId),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snapshot) => {
    const completions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCompletion));
    callback(completions);
  });
};

export const gradeCourseCompletion = async (
  completionId: string,
  studentId: string,
  courseId: string,
  courseTitle: string,
  grade: number,
  feedback: string,
  skills: string[]
) => {
  const completionRef = doc(db, "courseCompletions", completionId);
  await updateDoc(completionRef, {
    grade,
    feedback,
    status: 'graded',
    gradedAt: serverTimestamp()
  });

  const studentRef = doc(db, "users", studentId);
  const studentSnap = await getDoc(studentRef);
  
  if (studentSnap.exists()) {
    const updateObj: any = {
      [`academicData.grades.${courseTitle}`]: grade,
      "academicData.completedCourses": arrayUnion(courseId)
    };
    
    if (skills && skills.length > 0) {
      updateObj["academicData.strengths"] = arrayUnion(...skills);
    }
    
    await updateDoc(studentRef, updateObj);
  }

  // Create notification for student
  await createNotification({
    userId: studentId,
    title: "Curs Absolvit! 🎉",
    content: `Ai absolvit cursul "${courseTitle}" cu nota ${grade}!`,
    type: 'grade',
    link: `/academic/${courseId}`
  });
};

export const getAllCourseCompletions = (
  courseId: string,
  callback: (completions: CourseCompletion[]) => void
) => {
  const q = query(
    collection(db, "courseCompletions"),
    where("courseId", "==", courseId)
  );
  return onSnapshot(q, (snapshot) => {
    const completions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCompletion));
    callback(completions);
  });
};
