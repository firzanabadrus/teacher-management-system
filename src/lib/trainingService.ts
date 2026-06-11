import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  Timestamp, 
  onSnapshot,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { TrainingPost, TrainingComment, TrainingApplication } from '../types';

export const trainingService = {
  // Real-time listen of posts
  getPosts(callback: (posts: TrainingPost[]) => void) {
    const q = query(collection(db, 'training_posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const posts = snap.docs.map(d => {
        const data = d.data();
        let created;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          created = data.createdAt.toDate().toISOString();
        } else if (data.createdAt && data.createdAt.seconds) {
          created = new Date(data.createdAt.seconds * 1000).toISOString();
        } else {
          created = new Date().toISOString();
        }
        return {
          id: d.id,
          ...data,
          createdAt: created,
        } as TrainingPost;
      });
      callback(posts);
    }, (error) => {
      console.error("Error getting posts: ", error);
    });
  },

  // Create post (normal or training)
  async createPost(post: Omit<TrainingPost, 'id' | 'createdAt' | 'likes' | 'commentsCount'>) {
    const docRef = await addDoc(collection(db, 'training_posts'), {
      ...post,
      likes: [],
      commentsCount: 0,
      createdAt: Timestamp.now()
    });
    
    // If it's a training post, notify staff
    if (post.isTraining) {
      const teachersSnap = await getDocs(query(collection(db, 'teachers'), where('status', '==', 'active')));
      for (const tDoc of teachersSnap.docs) {
        await addDoc(collection(db, 'notifications'), {
          userId: tDoc.id,
          title: `📖 New Training Available`,
          message: `The Principal posted a new training: "${post.trainingTitle}". Apply now!`,
          read: false,
          timestamp: Timestamp.now(),
          type: 'admin'
        });
      }
    }
    return docRef.id;
  },

  // Highlight font styles
  fontFamilies: {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
    playful: 'font-sans font-medium tracking-normal italic text-indigo-700',
    elegant: 'font-serif italic font-semibold text-[#8B7E6D]'
  },

  // Like / Unlike post
  async toggleLike(postId: string, userId: string) {
    const postRef = doc(db, 'training_posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const likes = data.likes || [];
    const newLikes = likes.includes(userId)
      ? likes.filter((id: string) => id !== userId)
      : [...likes, userId];
    
    await updateDoc(postRef, { likes: newLikes });
  },

  // Comments
  getComments(postId: string, callback: (comments: TrainingComment[]) => void) {
    const q = query(
      collection(db, 'training_comments'), 
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const comments = snap.docs.map(d => {
        const data = d.data();
        let created;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          created = data.createdAt.toDate().toISOString();
        } else if (data.createdAt && data.createdAt.seconds) {
          created = new Date(data.createdAt.seconds * 1000).toISOString();
        } else {
          created = new Date().toISOString();
        }
        return {
          id: d.id,
          ...data,
          createdAt: created,
        } as TrainingComment;
      });
      callback(comments);
    });
  },

  async addComment(postId: string, comment: Omit<TrainingComment, 'id' | 'postId' | 'createdAt'>) {
    await addDoc(collection(db, 'training_comments'), {
      ...comment,
      postId,
      createdAt: Timestamp.now()
    });

    // Update comments count on post
    const postRef = doc(db, 'training_posts', postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const currentCount = postSnap.data().commentsCount || 0;
      await updateDoc(postRef, { commentsCount: currentCount + 1 });
    }
  },

  // Applications
  async applyForTraining(postId: string, teacherId: string, teacherName: string, trainingTitle: string) {
    // Check if employee already applied
    const q = query(
      collection(db, 'training_applications'),
      where('postId', '==', postId),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`You have already applied for this training.`);
    }

    // Submit training application
    const docRef = await addDoc(collection(db, 'training_applications'), {
      postId,
      trainingTitle,
      teacherId,
      teacherName,
      status: 'pending',
      createdAt: Timestamp.now()
    });

    // Add alert notification for Principal / admin
    await addDoc(collection(db, 'notifications'), {
      userId: 'admin-id',
      title: `📝 Training Application: ${teacherName}`,
      message: `${teacherName} applied for "${trainingTitle}" training session.`,
      read: false,
      timestamp: Timestamp.now(),
      type: 'leave' // Using leave/admin context for approval monitoring
    });

    return docRef.id;
  },

  // Real-time sync of applications
  getApplications(callback: (applications: TrainingApplication[]) => void) {
    const q = query(collection(db, 'training_applications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const applications = snap.docs.map(d => {
        const data = d.data();
        let created;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          created = data.createdAt.toDate().toISOString();
        } else if (data.createdAt && data.createdAt.seconds) {
          created = new Date(data.createdAt.seconds * 1000).toISOString();
        } else {
          created = new Date().toISOString();
        }
        return {
          id: d.id,
          ...data,
          createdAt: created,
        } as TrainingApplication;
      });
      callback(applications);
    }, (error) => {
      console.error("Error reading applications: ", error);
    });
  },

  // Update application status (Approve or Disapprove)
  async updateApplicationStatus(applicationId: string, postId: string, status: 'approved' | 'rejected', teacherId: string, trainingTitle: string) {
    await updateDoc(doc(db, 'training_applications', applicationId), { status });

    // Update authorized trainees list on post if approved
    if (status === 'approved') {
      const postRef = doc(db, 'training_posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const data = postSnap.data();
        const traineeIds = data.traineeIds || [];
        if (!traineeIds.includes(teacherId)) {
          await updateDoc(postRef, {
            traineeIds: [...traineeIds, teacherId]
          });
        }
      }
    }

    // Send visual notification update directly to the teacher
    await addDoc(collection(db, 'notifications'), {
      userId: teacherId,
      title: status === 'approved' ? `✅ Training Approved!` : `❌ Training Application Rejected`,
      message: `Your training application for "${trainingTitle}" has been ${status === 'approved' ? 'approved' : 'rejected'} by the administration.`,
      read: false,
      timestamp: Timestamp.now(),
      type: 'admin'
    });
  },

  // Check if a teacher has already applied
  async getTeacherApplicationStatus(postId: string, teacherId: string): Promise<'pending' | 'approved' | 'rejected' | null> {
    const q = query(
      collection(db, 'training_applications'),
      where('postId', '==', postId),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data().status as any;
  }
};
