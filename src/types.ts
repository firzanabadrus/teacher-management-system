/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum MaritalStatus {
  SINGLE = 'Single',
  MARRIED = 'Married',
  DIVORCED = 'Divorced',
  WIDOWED = 'Widowed',
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export interface TeacherDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: 'empty' | 'uploaded' | 'verified';
}

export enum PerformanceCategory {
  ATTENDANCE_PUNCTUALITY = 'Attendance and Punctuality',
  CLASSROOM_MANAGEMENT = 'Classroom Management',
  TEACHING_PERFORMANCE = 'Teaching Performance',
  STUDENT_DEVELOPMENT = 'Student Development',
  DOCUMENTATION_RECORD_KEEPING = 'Documentation and Record Keeping',
  COMMUNICATION_PROFESSIONALISM = 'Communication and Professionalism',
  TASK_DUTY_RESPONSIBILITY = 'Task & Duty Responsibility',
  CREATIVITY_INITIATIVE = 'Creativity and Initiative',
  TRAINING_SELF_DEVELOPMENT = 'Training and Self Development',
  DISCIPLINE_SOP_COMPLIANCE = 'Discipline and SOP Compliance',
}

export enum DutyFrequency {
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
}

export interface DutyChecklistItem {
  id: string;
  description: string;
  isCompleted: boolean;
  photoUrl?: string; // Proof
  completedAt?: any; // Timestamp
}

export interface DutyTask {
  id: string;
  name: string;
  timeStart: string; // HH:mm
  timeEnd: string;
  frequency: DutyFrequency;
  locations: string[]; // Location names/IDs
  minPeople: number;
  checklistTemplates: string[]; // Default checklist items
  genderRequirement?: Gender.FEMALE | Gender.MALE | null;
  dayOfWeek?: number; // 0-6 if weekly (0=Sunday, 1=Monday...)
  dayOfMonth?: number; // 1-31 if monthly
}

export interface DutyLocation {
  id: string;
  name: string;
}

export interface DutyAssignment {
  id: string;
  taskId: string;
  taskName: string;
  date: string; // YYYY-MM-DD
  locationId: string;
  locationName: string;
  teacherIds: string[];
  checklist: DutyChecklistItem[];
  status: 'pending' | 'in-progress' | 'completed';
  timeStart: string;
  timeEnd: string;
  isReplacement?: boolean;
}

export interface DutySwapRequest {
  id: string;
  assignmentId: string;
  fromTeacherId: string;
  toTeacherId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
  requestedBy: 'teacher' | 'principal';
}

export type LeaveType = 
  | 'annual' 
  | 'medical' 
  | 'unpaid' 
  | 'maternity' 
  | 'marriage' 
  | 'compassionate' 
  | 'umrah' 
  | 'haji' 
  | 'birthday' 
  | 'halfday'
  | 'sick' 
  | 'emergency' 
  | 'other';

export interface LeaveRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: number; // in days, e.g. 1, 3, or 0.5 for half day
  type: LeaveType;
  status: 'pending' | 'approved' | 'rejected';
  documentUrl?: string | null;
  documentName?: string | null;
  remarks?: string;
  principalNotes?: string;
  createdAt?: any;
}

export const PERFORMANCE_CRITERIA: Record<PerformanceCategory, string[]> = {
  [PerformanceCategory.ATTENDANCE_PUNCTUALITY]: [
    'Arrives at school on time',
    'Comes prepared before class starts',
    'Follow attendances procedures',
    'Submit leave application properly',
    'Has good attendance record'
  ],
  [PerformanceCategory.CLASSROOM_MANAGEMENT]: [
    'Classroom is clean and organised',
    'Students are well managed',
    'Learning corners are updated',
    'Safety rules are followed',
    'Students line up properly'
  ],
  [PerformanceCategory.TEACHING_PERFORMANCE]: [
    'Lesson plan prepared on time',
    'Lesson plan submitted on time',
    'Teaching follows lesson plan (Sandbox)',
    'Uses teaching aid effectively',
    'Explains lesson clearly',
    'Students are engaged during class'
  ],
  [PerformanceCategory.STUDENT_DEVELOPMENT]: [
    'Tracks student progress',
    'Help weak students',
    'Encourages student participation',
    'Maintains student discipline positively',
    'Gives motivation and encouragement'
  ],
  [PerformanceCategory.DOCUMENTATION_RECORD_KEEPING]: [
    'Students file updated',
    'Attendance records complete',
    'Assessment record submitted on time',
    'Portfolio/student ‘s work organised'
  ],
  [PerformanceCategory.COMMUNICATION_PROFESSIONALISM]: [
    'Speaks politely to students, parents and colleagues',
    'Responds professionally in WhatsApp groups',
    'Works well with team members',
    'Accept feedback positively',
    'Maintains professional appearance'
  ],
  [PerformanceCategory.TASK_DUTY_RESPONSIBILITY]: [
    'Follow assembly duty schedules',
    'Follow cleaning duty schedule',
    'Completes arrival and dismissal duty',
    'Helps during school events'
  ],
  [PerformanceCategory.CREATIVITY_INITIATIVE]: [
    'Creates attractive teaching materials',
    'Gives new activity ideas',
    'Participated in school improvement',
    'Decorate classroom creatively',
    'Takes initiative without waiting for instruction'
  ],
  [PerformanceCategory.TRAINING_SELF_DEVELOPMENT]: [
    'Attend require training (minimum 3 per year)',
    'Applies knowledge from training',
    'Shares learning with team',
    'Improves teaching skills'
  ],
  [PerformanceCategory.DISCIPLINE_SOP_COMPLIANCE]: [
    'Follow school SOP',
    'Uses appropriate language',
    'Follow dress code',
    'Maintains confidentiality',
    'Uses social media professionally'
  ],
};

export enum SeverityLevel {
  MINOR = 'Minor',
  NORMAL = 'Normal',
  MAJOR = 'Major',
  CRITICAL = 'Critical',
}

export interface PerformanceLog {
  id: string;
  teacherId: string;
  principalId: string;
  amount: number;
  reason: string;
  timestamp: any; // Firestore Timestamp
  category: PerformanceCategory;
  criterion?: string;
  severity: SeverityLevel;
}

export interface MonthlySummary {
  id: string;
  teacherId: string;
  month: string; // YYYY-MM
  totalScore: number;
  status: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement';
  reportUrl?: string;
}

export interface Warning {
  id: string;
  teacherId: string;
  issuedBy: string;
  issueDate: any;
  message: string;
  severity: 'Verbal' | 'Written' | 'Final';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: any;
  type: 'performance' | 'admin' | 'leave' | 'duty_swap' | 'report';
}

export interface Report {
  id: string;
  teacherId: string;
  teacherName: string;
  category: string;
  description: string;
  photoUrl: string | null;
  status: 'Submitted' | 'Under Review' | 'Action Taken' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  managementNotes: string;
  createdAt: any;
  lastUpdated: any;
}

export interface TeacherRecord {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'teacher' | 'principal';
  icNumber: string;
  gender: Gender | '';
  dob: string;
  address: string;
  phoneNumber: string;
  maritalStatus: MaritalStatus | '';
  emergencyContactName: string;
  emergencyContactNumber: string;
  documents: {
    myKad: TeacherDocument;
    passportPhoto: TeacherDocument;
    resume: TeacherDocument;
    academicCertificates: TeacherDocument;
    medicalReport: TeacherDocument;
    bankStatement: TeacherDocument;
  };
  completionProgress: number; // 0 to 100
  currentScore: number;
  yearlyKpi: number;
  status: 'active' | 'terminated';
}

export interface YearlyKpiRecord {
  id: string;
  teacherId: string;
  year: number;
  averageMonthlyScore: number;
  trendFactor: number; // e.g. 1.1 for improving, 0.9 for declining
  finalScore: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  status: 'Reviewed' | 'Pending' | 'Adjusted';
  notes: string;
  timestamp: any;
}

export const INITIAL_DOCUMENTS: TeacherRecord['documents'] = {
  myKad: { id: 'myKad', name: 'Copy of Identification Card (MyKad)', type: 'image/pdf', status: 'empty' },
  passportPhoto: { id: 'passportPhoto', name: 'Passport Photo', type: 'image', status: 'empty' },
  resume: { id: 'resume', name: 'Resume/CV', type: 'pdf', status: 'empty' },
  academicCertificates: { id: 'academicCertificates', name: 'Latest Academic Certificates', type: 'image/pdf', status: 'empty' },
  medicalReport: { id: 'medicalReport', name: 'Medical Check Up Report', type: 'image/pdf', status: 'empty' },
  bankStatement: { id: 'bankStatement', name: 'Header of Bank Statement', type: 'image/pdf', status: 'empty' },
};

export const calculateProgress = (record: TeacherRecord): number => {
  const fields = [
    record.fullName,
    record.icNumber,
    record.gender,
    record.dob,
    record.address,
    record.phoneNumber,
    record.email,
    record.maritalStatus,
    record.emergencyContactName,
    record.emergencyContactNumber,
  ];
  
  const filledFields = fields.filter(f => f !== '').length;
  const docs = Object.values(record.documents);
  const uploadedDocs = docs.filter(d => d.status !== 'empty').length;
  
  const totalItems = fields.length + docs.length;
  const completedItems = filledFields + uploadedDocs;
  
  return Math.round((completedItems / totalItems) * 100);
};

export interface TrainingComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'principal';
  text: string;
  createdAt: any;
}

export interface TrainingPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'principal';
  content: string;
  photoUrl?: string | null;
  likes: string[]; // User IDs who liked this post
  commentsCount: number;
  createdAt: any;
  fontStyle?: 'sans' | 'serif' | 'mono' | 'playful' | 'elegant';
  isTraining?: boolean;
  trainingTitle?: string;
  trainingDescription?: string;
  maxTrainees?: number;
  type?: 'volunteer' | 'assigned';
  traineeIds?: string[]; // Approved trainee IDs
}

export interface TrainingApplication {
  id: string;
  postId: string;
  trainingTitle: string;
  teacherId: string;
  teacherName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

