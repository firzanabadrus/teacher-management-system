import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SeverityLevel, PerformanceLog, PerformanceCategory, Notification, MonthlySummary, Warning, TeacherRecord, Report, LeaveRecord } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const SEVERITY_POINTS_POSITIVE: Record<SeverityLevel, number> = {
  [SeverityLevel.MINOR]: 1,
  [SeverityLevel.NORMAL]: 1,
  [SeverityLevel.MAJOR]: 2,
  [SeverityLevel.CRITICAL]: 3,
};

const SEVERITY_POINTS_NEGATIVE: Record<SeverityLevel, number> = {
  [SeverityLevel.MINOR]: 1,
  [SeverityLevel.NORMAL]: 2,
  [SeverityLevel.MAJOR]: 3,
  [SeverityLevel.CRITICAL]: 5,
};

export const DAILY_DEDUCTION_LIMIT = -30;

// Performance Service
export const performanceService = {
  async getTodayStats(teacherId: string) {
    const path = 'performance_logs';
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, path),
      where('teacherId', '==', teacherId),
      where('timestamp', '>=', Timestamp.fromDate(startOfDay))
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data() as PerformanceLog);
    const totalDeductions = logs.reduce((acc, log) => log.amount < 0 ? acc + log.amount : acc, 0);
    const totalMerits = logs.reduce((acc, log) => log.amount > 0 ? acc + log.amount : acc, 0);
    
    return { totalDeductions, totalMerits, logsCount: logs.length };
  },

  async addLog(log: Omit<PerformanceLog, 'id'>) {
    const path = 'performance_logs';
    try {
      const isNegative = log.amount < 0;
      const pointsMap = isNegative ? SEVERITY_POINTS_NEGATIVE : SEVERITY_POINTS_POSITIVE;
      const basePoints = pointsMap[log.severity] || 1;
      const finalAmount = isNegative ? -basePoints : basePoints;

      const docRef = await addDoc(collection(db, path), {
        ...log,
        amount: finalAmount,
        timestamp: Timestamp.now()
      });
      
      // Update teacher current score
      const teacherRef = doc(db, 'teachers', log.teacherId);
      const teacherSnap = await getDoc(teacherRef);
      let newScore = finalAmount;
      let teacherName = 'Teacher';

      if (teacherSnap.exists()) {
        const currentData = teacherSnap.data() as TeacherRecord;
        teacherName = currentData.fullName;
        newScore = (currentData.currentScore || 0) + finalAmount;
        await updateDoc(teacherRef, {
          currentScore: newScore
        });
      }

      // Add notification for teacher
      await addDoc(collection(db, 'notifications'), {
        userId: log.teacherId,
        title: `Performance Update: ${finalAmount > 0 ? '+' : ''}${finalAmount} Marks`,
        message: `${log.category} - ${log.criterion} (${log.severity}): ${log.reason || 'No remarks provided.'}`,
        read: false,
        timestamp: Timestamp.now(),
        type: 'performance'
      });

      // Admin alerts
      if (log.severity === SeverityLevel.CRITICAL && finalAmount < 0) {
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin-id', 
          title: `CRITICAL ALERT: ${teacherName}`,
          message: `Critical deduction recorded in ${log.category}: ${log.reason}`,
          read: false,
          timestamp: Timestamp.now(),
          type: 'admin'
        });
      }

      if (newScore < -30) {
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin-id', 
          title: `Score Threshold Alert`,
          message: `${teacherName} has dropped below the critical score threshold (Current: ${newScore}).`,
          read: false,
          timestamp: Timestamp.now(),
          type: 'admin'
        });
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getLogs(teacherId: string, callback: (logs: PerformanceLog[]) => void) {
    const path = 'performance_logs';
    const q = query(
      collection(db, path),
      where('teacherId', '==', teacherId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PerformanceLog));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async issueWarning(warning: Omit<Warning, 'id'>) {
    const path = 'warnings';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...warning,
        issueDate: Timestamp.now()
      });

      // Add notification
      await addDoc(collection(db, 'notifications'), {
        userId: warning.teacherId,
        title: `Formal Warning: ${warning.severity}`,
        message: warning.message,
        read: false,
        timestamp: Timestamp.now(),
        type: 'admin'
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getSummaries(teacherId: string, callback: (summaries: MonthlySummary[]) => void) {
    const path = 'summaries';
    const q = query(
      collection(db, path),
      where('teacherId', '==', teacherId),
      orderBy('month', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const summaries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlySummary));
      callback(summaries);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async calculateYearlyKpi(teacherId: string, year: number) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      
      const q = query(
        collection(db, 'performance_logs'),
        where('teacherId', '==', teacherId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<', Timestamp.fromDate(endDate))
      );
      
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data() as PerformanceLog);
      
      const monthlyScores: Record<number, number> = {};
      logs.forEach(log => {
        const month = new Date(log.timestamp.seconds * 1000).getMonth();
        monthlyScores[month] = (monthlyScores[month] || 0) + log.amount;
      });
      
      const totalYearlyScore = logs.reduce((acc, l) => acc + l.amount, 0);
      const averageMonthlyScore = totalYearlyScore / 12;

      const months = Object.keys(monthlyScores).map(Number).sort((a, b) => a - b);
      let trendFactor = 1.0;
      if (months.length >= 2) {
        const firstHalf = months.slice(0, Math.ceil(months.length / 2));
        const secondHalf = months.slice(Math.ceil(months.length / 2));
        const firstAvg = firstHalf.reduce((acc, m) => acc + monthlyScores[m], 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((acc, m) => acc + monthlyScores[m], 0) / secondHalf.length;
        
        if (secondAvg > firstAvg) trendFactor = 1.1;
        else if (secondAvg < firstAvg) trendFactor = 0.9;
      }

      const finalScore = averageMonthlyScore * trendFactor;
      
      let rating: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
      if (finalScore > 10) rating = 'A';
      else if (finalScore > 5) rating = 'B';
      else if (finalScore > 0) rating = 'C';
      else if (finalScore > -5) rating = 'D';
      else rating = 'E';

      const yearlyData = {
        teacherId,
        year,
        averageMonthlyScore,
        trendFactor,
        finalScore,
        rating,
        status: 'Pending',
        notes: `Automated assessment for year ${year}. Total logs: ${logs.length}.`,
        timestamp: Timestamp.now()
      };

      // Check for existing record to prevent duplicates
      const existingQ = query(
        collection(db, 'yearly_kpis'),
        where('teacherId', '==', teacherId),
        where('year', '==', year)
      );
      const existingSnapshot = await getDocs(existingQ);
      
      if (!existingSnapshot.empty) {
        const docRef = existingSnapshot.docs[0].ref;
        await setDoc(docRef, yearlyData);
        return { id: docRef.id, ...yearlyData };
      } else {
        const kpiRef = await addDoc(collection(db, 'yearly_kpis'), yearlyData);
        return { id: kpiRef.id, ...yearlyData };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'yearly_kpis');
    }
  },

  async calculateAllYearlyKpis(teacherIds: string[], year: number) {
    const results = [];
    for (const teacherId of teacherIds) {
      const res = await this.calculateYearlyKpi(teacherId, year);
      results.push(res);
    }
    return results;
  },

  getYearlyKpis(teacherId: string, callback: (kpis: any[]) => void) {
    const q = query(
      collection(db, 'yearly_kpis'),
      where('teacherId', '==', teacherId),
      orderBy('year', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }
};

// Report Service for incidents
export const reportService = {
  async createReport(report: Omit<Report, 'id' | 'createdAt' | 'lastUpdated'>) {
    const path = 'reports';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...report,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      });
      
      // Also notify admins/principal about the new report
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin-id',
        title: `🚨 New Report: ${report.category}`,
        message: `Submitted by ${report.teacherName}: ${report.description.substring(0, 80)}...`,
        read: false,
        timestamp: Timestamp.now(),
        type: 'report'
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getReports(teacherId: string | null, callback: (reports: Report[]) => void) {
    const path = 'reports';
    let q;
    if (teacherId) {
      q = query(
        collection(db, path),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, path),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => {
        const data = doc.data();
        let created;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          created = data.createdAt.toDate().toISOString();
        } else if (data.createdAt && data.createdAt.seconds) {
          created = new Date(data.createdAt.seconds * 1000).toISOString();
        } else {
          created = new Date().toISOString();
        }

        let updated;
        if (data.lastUpdated && typeof data.lastUpdated.toDate === 'function') {
          updated = data.lastUpdated.toDate().toISOString();
        } else if (data.lastUpdated && data.lastUpdated.seconds) {
          updated = new Date(data.lastUpdated.seconds * 1000).toISOString();
        } else {
          updated = new Date().toISOString();
        }

        return {
          id: doc.id,
          ...data,
          createdAt: created,
          lastUpdated: updated
        } as Report;
      });
      callback(reports);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async updateReport(
    reportId: string, 
    status: Report['status'], 
    priority: Report['priority'], 
    managementNotes: string, 
    teacherId: string, 
    category: string
  ) {
    const path = 'reports';
    try {
      const reportRef = doc(db, path, reportId);
      await updateDoc(reportRef, {
        status,
        priority,
        managementNotes,
        lastUpdated: Timestamp.now()
      });

      // Notify the teacher
      await addDoc(collection(db, 'notifications'), {
        userId: teacherId,
        title: `Report Updated: ${category}`,
        message: `Status matches: ${status}. Notes: ${managementNotes || 'No notes added.'}`,
        read: false,
        timestamp: Timestamp.now(),
        type: 'report'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

// Leave Service
export const leaveService = {
  async applyLeave(leave: Omit<LeaveRecord, 'id' | 'status' | 'createdAt'>) {
    const path = 'leaves';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...leave,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      // Add a notification for admins/principals about the new leave
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin-id', // send to admin/principal
        title: `New Leave Application: ${leave.teacherName}`,
        message: `${leave.teacherName} applied for ${leave.duration} day(s) of ${leave.type} leave starting ${leave.startDate}.`,
        read: false,
        timestamp: Timestamp.now(),
        type: 'leave'
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getLeaves(teacherId: string | null, callback: (leaves: LeaveRecord[]) => void) {
    const path = 'leaves';
    let q;
    if (teacherId) {
      q = query(
        collection(db, path),
        where('teacherId', '==', teacherId),
        orderBy('startDate', 'desc')
      );
    } else {
      q = query(
        collection(db, path),
        orderBy('startDate', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const leaves = snapshot.docs.map(doc => {
        const data = doc.data();
        let created;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          created = data.createdAt.toDate().toISOString();
        } else if (data.createdAt && data.createdAt.seconds) {
          created = new Date(data.createdAt.seconds * 1000).toISOString();
        } else {
          created = new Date().toISOString();
        }

        return {
          id: doc.id,
          ...data,
          createdAt: created
        } as LeaveRecord;
      });
      callback(leaves);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async updateLeaveStatus(
    leaveId: string,
    status: 'approved' | 'rejected',
    principalNotes: string,
    teacherId: string,
    leaveType: string,
    duration: number,
    startDate: string
  ) {
    const path = 'leaves';
    try {
      const leaveRef = doc(db, path, leaveId);
      await updateDoc(leaveRef, {
        status,
        principalNotes,
        reviewedAt: Timestamp.now()
      });

      // Notify the teacher
      const statusTitle = status === 'approved' ? 'Approved' : 'Rejected';
      await addDoc(collection(db, 'notifications'), {
        userId: teacherId,
        title: `Leave Application ${statusTitle}`,
        message: `Your application for ${duration} day(s) of ${leaveType} leave starting ${startDate} has been ${status}. Notes: ${principalNotes || 'None'}`,
        read: false,
        timestamp: Timestamp.now(),
        type: 'leave'
      });

      // If approved, we can deduct / update the teacher record leave balances if stored on the teacher document
      if (status === 'approved') {
        const teacherRef = doc(db, 'teachers', teacherId);
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
          const tData = teacherSnap.data();
          const balances = tData.leaveBalances || {
            annual: 8,
            medical: 14,
            unpaid: 8,
            maternity: 98,
            marriage: 5,
            compassionate: 2,
            umrah: 14,
            haji: 40,
            birthday: 1,
            halfdayUsedThisMonth: 0,
            halfdayMonth: new Date().toISOString().substring(0, 7)
          };

          const typeKey = leaveType as keyof typeof balances;
          if (typeKey === 'halfday') {
            const currentMonthStr = new Date().toISOString().substring(0, 7);
            let used = balances.halfdayUsedThisMonth || 0;
            let month = balances.halfdayMonth || currentMonthStr;
            if (month !== currentMonthStr) {
              used = 0;
              month = currentMonthStr;
            }
            used += duration; // usually 0.5 per halfday
            balances.halfdayUsedThisMonth = used;
            balances.halfdayMonth = month;
          } else if (balances[typeKey] !== undefined) {
            balances[typeKey] = Math.max(0, balances[typeKey] - duration);
          }

          await updateDoc(teacherRef, {
            leaveBalances: balances
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
