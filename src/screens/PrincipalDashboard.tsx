import React, { useState, useEffect } from 'react';
import { Home, Rss, Bell, Settings, Search, LayoutGrid, Users, BookOpen, BarChart3, ShieldCheck, ClipboardList, UserPlus, FileText, CalendarDays, Target, LogOut, X, Plus, Mail, ChevronRight, Download, Eye, CheckCircle2, AlertCircle, TrendingUp, Minus, MessageSquare, Calendar, ChevronLeft, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { TeacherRecord, Gender, MaritalStatus, INITIAL_DOCUMENTS, TeacherDocument, PerformanceCategory, PerformanceLog, PERFORMANCE_CRITERIA, SeverityLevel, Notification, DutyAssignment, DutyLocation, DutyTask, DutyFrequency, Report, LeaveRecord, LeaveType } from '../types';
import { performanceService, db, DAILY_DEDUCTION_LIMIT, reportService, leaveService } from '../lib/firebase';
import { dutyService } from '../lib/dutyService';
import { TaskCalendar } from '../components/TaskCalendar';
import { DutyIndividualPage } from '../components/DutyComponents';
import { pdfService } from '../lib/pdfService';
import { collection, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
import TrainingModule from '../components/TrainingModule';

interface PrincipalDashboardProps {
  onLogout: () => void;
}

const MOCK_TEACHERS: TeacherRecord[] = [
  {
    id: '1',
    username: 'sarah_j',
    email: 'sarah.jenkins@school.edu',
    fullName: 'Sarah Jenkins',
    icNumber: '900101-14-5566',
    gender: Gender.FEMALE,
    dob: '1990-01-01',
    address: '123 School Lane, Education City',
    phoneNumber: '+60123456789',
    maritalStatus: MaritalStatus.MARRIED,
    emergencyContactName: 'John Jenkins',
    emergencyContactNumber: '+60129876543',
    completionProgress: 85,
    role: 'teacher',
    currentScore: 82,
    yearlyKpi: 88,
    status: 'active',
    documents: JSON.parse(JSON.stringify(INITIAL_DOCUMENTS))
  },
  {
    id: '2',
    username: 'mark_w',
    email: 'mark.wilson@school.edu',
    fullName: 'Mark Wilson',
    icNumber: '850505-10-1122',
    gender: Gender.MALE,
    dob: '1985-05-05',
    address: '456 Teacher Road, Education City',
    phoneNumber: '+60111222333',
    maritalStatus: MaritalStatus.SINGLE,
    emergencyContactName: 'Wilson Sr.',
    emergencyContactNumber: '+60119998887',
    completionProgress: 40,
    role: 'teacher',
    currentScore: 65,
    yearlyKpi: 74,
    status: 'active',
    documents: JSON.parse(JSON.stringify(INITIAL_DOCUMENTS))
  }
];

export default function PrincipalDashboard({ onLogout }: PrincipalDashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [teachers, setTeachers] = useState<TeacherRecord[]>(MOCK_TEACHERS);
  
  const [newLog, setNewLog] = useState({ 
    teacherId: '', 
    amount: 5, 
    reason: '', 
    category: PerformanceCategory.ATTENDANCE_PUNCTUALITY,
    criterion: PERFORMANCE_CRITERIA[PerformanceCategory.ATTENDANCE_PUNCTUALITY][0],
    severity: SeverityLevel.NORMAL
  });
  const [todayStats, setTodayStats] = useState<{ totalDeductions: number, totalMerits: number, logsCount: number } | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<PerformanceLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [yearlyKpis, setYearlyKpis] = useState<any[]>([]);
  const [isCalculatingYearly, setIsCalculatingYearly] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [teacherDetailTab, setTeacherDetailTab] = useState<'profile' | 'performance' | 'leave' | 'training' | 'kpi'>('profile');

  const handleOpenTeacherDetail = (teacher: TeacherRecord, tab: 'profile' | 'performance' | 'leave' | 'training' | 'kpi' = 'profile') => {
    setTeacherDetailTab(tab);
    setSelectedTeacher(teacher);
  };

  const [newTeacherForm, setNewTeacherForm] = useState({ username: '', email: '' });
  const [inviteSent, setInviteSent] = useState(false);

  // Leave Management States
  const [allLeaves, setAllLeaves] = useState<LeaveRecord[]>([]);
  const [principalLeaveNotes, setPrincipalLeaveNotes] = useState('');
  const [reviewingLeaveId, setReviewingLeaveId] = useState<string | null>(null);
  const [isUpdatingLeaveStatus, setIsUpdatingLeaveStatus] = useState(false);

  // Incident Reports states
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [mgmtNotes, setMgmtNotes] = useState('');
  const [mgmtStatus, setMgmtStatus] = useState<Report['status']>('Submitted');
  const [mgmtPriority, setMgmtPriority] = useState<Report['priority']>('Medium');
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);

  // Sync teachers from Firestore (fallback to mock if empty/error during dev)
  useEffect(() => {
    const q = query(collection(db, 'teachers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherRecord));
      if (staffList.length > 0) setTeachers(staffList);
    });
    return () => unsubscribe();
  }, []);

  // Sync leaves
  useEffect(() => {
    const unsubscribe = leaveService.getLeaves(null, setAllLeaves);
    return () => unsubscribe();
  }, []);

  // Sync today's stats for current teacher selection
  useEffect(() => {
    const targetId = selectedTeacher?.id || newLog.teacherId;
    if (targetId) {
      performanceService.getTodayStats(targetId).then(setTodayStats);
    } else {
      setTodayStats(null);
    }
  }, [selectedTeacher?.id, newLog.teacherId, showLogModal]);

  // Sync logs when a teacher is selected
  useEffect(() => {
    if (selectedTeacher) {
      const unsub = performanceService.getLogs(selectedTeacher.id, (logs) => {
        setTeacherLogs(logs);
      });
      const unsubKpis = performanceService.getYearlyKpis(selectedTeacher.id, setYearlyKpis);
      return () => { unsub(); unsubKpis(); };
    }
  }, [selectedTeacher]);

  const handleGenerateYearlyReport = async () => {
    if (!selectedTeacher) return;
    setIsCalculatingYearly(true);
    try {
      const currentYear = new Date().getFullYear();
      await performanceService.calculateYearlyKpi(selectedTeacher.id, currentYear);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCalculatingYearly(false);
    }
  };

  const handleBulkGenerateYearlyKpis = async () => {
    setIsCalculatingYearly(true);
    try {
      const currentYear = new Date().getFullYear();
      const teacherIds = teachers.map(t => t.id);
      await performanceService.calculateAllYearlyKpis(teacherIds, currentYear);
      alert(`Yearly KPI calculations for ${currentYear} completed for all faculty members.`);
    } catch (error) {
      console.error(error);
      alert("Failed to process bulk calculations.");
    } finally {
      setIsCalculatingYearly(false);
    }
  };

  const handleDownloadReport = () => {
    if (selectedTeacher) {
      if (teacherLogs.length === 0) {
        alert("No performance logs found for this teacher yet.");
        return;
      }
      pdfService.generatePerformanceReport(selectedTeacher, teacherLogs);
    }
  };

  const handleDownloadAllReports = () => {
    if (teachers.length > 0) {
      pdfService.generateSchoolSummaryReport(teachers);
    }
  };

  // Sync teacher notifications for Principal
  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', 'admin-id'), // Monitoring Principal notifications
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(list);
    });
  }, []);

  // Sync incident reports for Principal
  useEffect(() => {
    const unsub = reportService.getReports(null, setReportsList);
    return () => unsub();
  }, []);

  const handleReviewLeaveSubmit = async (leaveId: string, status: 'approved' | 'rejected') => {
    setIsUpdatingLeaveStatus(true);
    try {
      const leave = allLeaves.find(l => l.id === leaveId);
      if (!leave) return;

      await leaveService.updateLeaveStatus(
        leaveId,
        status,
        principalLeaveNotes,
        leave.teacherId,
        leave.type,
        leave.duration,
        leave.startDate
      );

      setPrincipalLeaveNotes('');
      setReviewingLeaveId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingLeaveStatus(false);
    }
  };

  const handleUpdateScore = async () => {
    const targetTeacherId = selectedTeacher?.id || newLog.teacherId;
    if (!targetTeacherId) return;

    await performanceService.addLog({
      teacherId: targetTeacherId,
      principalId: 'admin-id', // Placeholder
      amount: newLog.amount,
      reason: newLog.reason,
      category: newLog.category,
      criterion: newLog.criterion,
      severity: newLog.severity,
      timestamp: new Date()
    });
    setNewLog({ 
      teacherId: '', 
      amount: 5, 
      reason: '', 
      category: PerformanceCategory.ATTENDANCE_PUNCTUALITY,
      criterion: PERFORMANCE_CRITERIA[PerformanceCategory.ATTENDANCE_PUNCTUALITY][0],
      severity: SeverityLevel.NORMAL
    });
    setShowLogModal(false);
  };

  const performanceData = teacherLogs.slice(0, 7).reverse().map(log => ({
    date: new Date(log.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: log.amount
  }));

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'training', icon: BookOpen, label: 'Training' },
    { id: 'schedule', icon: CalendarDays, label: 'Schedule' },
    { id: 'performance', icon: BarChart3, label: 'KPI' },
    { id: 'notify', icon: Bell, label: 'Alerts' },
  ];

  // Duty State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [locations, setLocations] = useState<DutyLocation[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DutyAssignment | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [filterTeacherId, setFilterTeacherId] = useState<string>('all');
  const [filterLocationId, setFilterLocationId] = useState<string>('all');

  const toggleAccordion = (id: string) => {
    setOpenAccordion(prev => prev === id ? null : id);
  };

  // Sync locations
  useEffect(() => {
    return dutyService.getLocations(setLocations);
  }, []);

  // Sync assignments
  useEffect(() => {
    dutyService.ensureAssignmentsForDate(selectedDate);
    return dutyService.getAssignments(selectedDate, setAssignments);
  }, [selectedDate]);

  const shortcuts = [
    { label: 'View Tasks', icon: ClipboardList, color: 'bg-primary', onClick: () => setActiveTab('schedule') },
    { label: 'Incidents Inbox', icon: FileText, color: 'bg-rose-400', onClick: () => setActiveTab('reports') },
    { label: 'Leave Approval', icon: Users, color: 'bg-accent-pink', onClick: () => setActiveTab('leaves') },
    { label: 'Schedules', icon: CalendarDays, color: 'bg-accent-tan', onClick: () => setActiveTab('schedule') },
  ];

  const services = [
    { label: 'Teachers', icon: UserPlus, color: 'bg-[#F5F7F5]', iconColor: 'text-[#7A8A7A]' },
    { label: 'Finance', icon: FileText, color: 'bg-[#F5F7FA]', iconColor: 'text-[#7A8A9A]' },
    { label: 'Schedules', icon: CalendarDays, color: 'bg-[#FAF5F5]', iconColor: 'text-[#9A7A7A]' },
    { label: 'Reports', icon: FileText, color: 'bg-[#F5F5F0]', iconColor: 'text-[#8A8A7A]' },
  ];

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Validate locations
    const selectedLocations = formData.getAll('locations') as string[];
    if (selectedLocations.length === 0) {
      alert('Please select at least one location');
      return;
    }

    const newTask: any = {
      name: (formData.get('name') as string).trim(),
      timeStart: formData.get('timeStart') as string,
      timeEnd: formData.get('timeEnd') as string,
      minPeople: parseInt(formData.get('minPeople') as string) || 1,
      frequency: formData.get('frequency') as DutyFrequency,
      locations: selectedLocations,
      checklistTemplates: ((formData.get('checklist') as string) || '').split(',').map(s => s.trim()).filter(s => s),
      createdAt: new Date().toISOString()
    };

    const dayOfWeek = formData.get('dayOfWeek');
    if (newTask.frequency === DutyFrequency.WEEKLY && dayOfWeek !== null && dayOfWeek !== '') {
      newTask.dayOfWeek = parseInt(dayOfWeek as string);
    }

    try {
      console.log('Attempting to add task:', newTask);
      await dutyService.addTask(newTask);
      console.log('Task added successfully');
      
      // Feedback to user
      alert('Task created successfully! Generating assignments...');
      
      setShowAddTask(false);
      
      // Immediately refresh local state and generate assignments
      setTimeout(() => {
        dutyService.ensureAssignmentsForDate(selectedDate).then(() => {
          console.log('Assignments generated/verified for', selectedDate);
        }).catch(err => {
          console.error('Failed to generate assignments:', err);
        });
      }, 800);
      
      form.reset();
    } catch (err) {
      console.error('Failed to add task:', err);
      alert('Error creating task: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      await dutyService.addLocation(name, description);
      setShowAddLocation(false);
      form.reset();
    } catch (err) {
      console.error('Failed to add location:', err);
      alert('Error creating location: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleForceSeed = async () => {
    if (confirm('Verify: Initializing duty system data? This will seed locations and teachers if they are missing.')) {
      await dutyService.seedInitialData();
      alert('Initialization attempt complete. Please check the directory.');
    }
  };

  const AddLocationModal = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden ios-shadow"
      >
        <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-stone-50">
          <h3 className="text-sm font-black uppercase tracking-widest text-text-main">New Duty Location</h3>
          <button onClick={() => setShowAddLocation(false)} className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleAddLocation} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Location Name</label>
            <input required name="name" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Science Lab" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Description</label>
            <textarea name="description" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none h-24 no-scrollbar" placeholder="Area details and specific instructions..." />
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest ios-shadow mt-4 transition-transform active:scale-95 shadow-lg shadow-primary/20">
            Create Location
          </button>
        </form>
      </motion.div>
    </motion.div>
  );

  const AddTaskModal = () => {
    const [frequency, setFrequency] = useState<DutyFrequency>(DutyFrequency.DAILY);

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-white w-full max-w-md rounded-3xl overflow-hidden ios-shadow"
        >
          <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-stone-50">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-main">New Duty Task</h3>
            <button onClick={() => setShowAddTask(false)} className="p-2"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleAddTask} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Task Name</label>
              <input required name="name" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Cleaning Duty" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Start Time</label>
                <input required name="timeStart" type="time" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">End Time</label>
                <input required name="timeEnd" type="time" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Frequency</label>
              <select 
                name="frequency" 
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as DutyFrequency)}
                className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none"
              >
                <option value={DutyFrequency.DAILY}>Daily</option>
                <option value={DutyFrequency.WEEKLY}>Weekly</option>
                <option value={DutyFrequency.MONTHLY}>Monthly</option>
              </select>
            </div>
            {frequency === DutyFrequency.WEEKLY && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Day of Week</label>
                <select name="dayOfWeek" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none">
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </motion.div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Locations</label>
              {locations.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-bg-input rounded-xl no-scrollbar">
                  {locations.map(loc => (
                    <label key={loc.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-border-subtle cursor-pointer hover:bg-stone-50 transition-colors">
                      <input type="checkbox" name="locations" value={loc.id} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20" />
                      <span className="text-[10px] font-bold truncate">{loc.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-[10px] text-amber-700 font-bold uppercase text-center">No locations found. Please initialize the system first.</p>
                  <button 
                    type="button"
                    onClick={handleForceSeed}
                    className="w-full mt-2 py-2 bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                  >
                    Init System
                  </button>
                </div>
              )}
            </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Min. Teachers</label>
            <input required name="minPeople" type="number" min="1" defaultValue="1" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Checklist (Comma separated)</label>
            <textarea name="checklist" className="w-full p-4 bg-bg-input rounded-xl text-sm font-bold border-none h-24 no-scrollbar" placeholder="Item 1, Item 2, Item 3..." />
          </div>
          <button 
            type="submit" 
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest ios-shadow mt-6 transition-all active:scale-[0.98] active:bg-stone-800 shadow-xl shadow-stone-200 flex items-center justify-center gap-2 hover:shadow-stone-300"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

  return (
    <div className="min-h-screen bg-bg-light pb-24 relative overflow-hidden">
      <AnimatePresence>
        {showAddTask && <AddTaskModal />}
        {showAddLocation && <AddLocationModal />}
      </AnimatePresence>
      {/* Notch */}
      <div className="h-6 w-32 bg-[#202020] absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-10 hidden sm:block"></div>

      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Admin Panel</h1>
          <p className="text-text-dim text-[10px] font-bold uppercase tracking-widest mt-0.5">School Overview</p>
        </div>
        <div className="flex gap-2">
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center ios-shadow overflow-hidden border-2 border-white"
          >
            <img 
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150" 
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onLogout}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center ios-shadow text-rose-300"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Shortcuts Section */}
            <section>
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
                {shortcuts.map((item, i) => (
                  <motion.div 
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        if (item.label === 'Performance') setActiveTab('performance');
                        if (item.label === 'View Tasks' || item.label === 'Schedules') setActiveTab('schedule');
                        if (item.label === 'Leave Approval') setActiveTab('leaves');
                      }
                    }}
                    className={`min-w-[90px] h-24 ${item.color} rounded-2xl ios-shadow flex flex-col items-center justify-center p-3 text-white gap-2 cursor-pointer`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center relative">
                      <item.icon className="w-5 h-5" />
                      {item.label === 'Leave Approval' && allLeaves.filter(l => l.status === 'pending').length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-white text-accent-pink font-black text-[8px] h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full leading-none shadow-sm border border-accent-pink/20">
                          {allLeaves.filter(l => l.status === 'pending').length}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-center leading-tight">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Services Section */}
            <section>
              {/* Search Bar */}
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search staff or records..."
                  className="w-full h-11 pl-11 pr-4 bg-white rounded-xl border border-gray-200 ios-shadow focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-subtle text-xs font-medium"
                />
              </div>

              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-[10px] font-bold text-text-main uppercase tracking-widest">Teacher Directory</h3>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[9px] font-bold uppercase flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> Add Teacher
                </motion.button>
              </div>

              <div className="space-y-4">
                {teachers.map((teacher) => (
                  <motion.div 
                    key={teacher.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenTeacherDetail(teacher, 'profile')}
                    className="bg-white p-4 rounded-2xl ios-shadow border border-border-subtle flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent-pink/10 flex items-center justify-center font-bold text-accent-pink text-xs">
                        {teacher.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-main">{teacher.fullName}</h4>
                        <p className="text-[10px] text-text-dim">{teacher.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${teacher.completionProgress}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-primary">{teacher.completionProgress}%</span>
                          <span className="text-[8px] font-black text-secondary ml-2">SCORE: {teacher.currentScore || 0}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-subtle group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                ))}
              </div>

              <h3 className="text-[10px] font-bold text-text-main uppercase tracking-widest mt-8 mb-4 px-1">Management Services</h3>
              <div className="grid grid-cols-2 gap-3">
                {services.map((service, i) => (
                  <motion.button 
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (service.label === 'Teachers') setActiveTab('home');
                      if (service.label === 'Schedules') setActiveTab('schedule');
                      if (service.label === 'Reports') setActiveTab('reports');
                    }}
                    className="bg-white p-3 rounded-2xl ios-shadow border border-border-subtle flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 ${service.color} rounded-xl flex items-center justify-center ${service.iconColor}`}>
                      <service.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-text-main tracking-tight">{service.label}</span>
                  </motion.button>
                ))}
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  className="bg-white p-3 rounded-2xl ios-shadow border border-border-subtle flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-accent-tan/20 rounded-xl flex items-center justify-center text-[#8B7E6D]">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-text-main tracking-tight">Objectives</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  className="bg-white p-3 rounded-2xl ios-shadow border border-border-subtle flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-text-subtle">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-text-main tracking-tight">Utility</span>
                </motion.button>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'training' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24"
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-black text-text-subtle uppercase tracking-widest">Faculty Connect & CPD</h3>
                <h2 className="text-2xl font-bold text-text-main tracking-tight">Postings & Coordinated Trainings</h2>
              </div>
            </div>

            <TrainingModule 
              currentUserId="admin-id"
              currentUserFullName="Dr. Evelyn Carter"
              currentUserRole="principal"
            />
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24"
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-black text-text-subtle uppercase tracking-widest">Faculty Safety & Incidents</h3>
                <h2 className="text-2xl font-bold text-text-main tracking-tight">Incidents Inbox</h2>
              </div>
            </div>

            {/* KPI Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl ios-shadow border border-border-subtle flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] text-[#A0A0A0] font-black uppercase tracking-wider leading-none">Pending Audits</span>
                  <div className="p-1 px-1.5 bg-primary/10 text-primary rounded-lg text-xs">
                    <ClipboardList className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-3xl font-black text-text-main leading-none mt-2">
                  {reportsList.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl ios-shadow border border-accent-pink/10 hover:border-accent-pink/20 transition-all flex flex-col justify-between h-28 bg-gradient-to-br from-white to-red-50/10">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] text-accent-pink font-black uppercase tracking-wider leading-none">Critical Alerts</span>
                  <div className="p-1 text-accent-pink rounded-lg text-xs animate-pulse">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  </div>
                </div>
                <p className="text-3xl font-black text-accent-pink leading-none mt-2">
                  {reportsList.filter(r => r.priority === 'High' && r.status !== 'Resolved').length}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl ios-shadow border border-border-subtle flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] text-[#A0A0A0] font-black uppercase tracking-wider leading-none">Resolved (Total)</span>
                  <div className="p-1 px-1.5 bg-secondary/10 text-secondary rounded-lg text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-3xl font-black text-secondary leading-none mt-2">
                  {reportsList.filter(r => r.status === 'Resolved').length}
                </p>
              </div>
            </div>

            {/* Filters Area */}
            <div className="bg-white p-4 rounded-2xl border border-border-subtle ios-shadow space-y-3">
              <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none">Inbox Query Filter</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-bold text-text-subtle uppercase">Status filter</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-stone-50 border border-border-subtle rounded-xl p-2.5 text-xs font-bold text-text-main focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Submitted">Submitted (Pending)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Action Taken">Action Taken</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-bold text-text-subtle uppercase">Category filter</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-stone-50 border border-border-subtle rounded-xl p-2.5 text-xs font-bold text-text-main focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {[
                      'Sexual Harassment Report',
                      'Bullying Report (Physical/Emotional/Social Media)',
                      'Conflict Between Staff Report',
                      'SOP Violation Report',
                      'Workload Stress Report',
                      'Teacher Misconduct Report',
                      'Facility Maintenance Report',
                      'Teaching Material Shortage Report',
                      'Safety Hazard Report',
                      'IT/System Problem Report'
                    ].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Master Data List / Table */}
            <div className="bg-white rounded-2xl border border-border-subtle ios-shadow overflow-hidden">
              <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-stone-50">
                <p className="text-[10px] font-black text-text-main uppercase tracking-widest">Reports Directory ({
                  reportsList.filter(rep => {
                    const matchStatus = filterStatus === 'all' || rep.status === filterStatus;
                    const matchCategory = filterCategory === 'all' || rep.category === filterCategory;
                    return matchStatus && matchCategory;
                  }).length
                })</p>
              </div>

              <div className="divide-y divide-border-subtle overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-stone-50/40 border-b border-border-subtle text-[9px] font-black text-[#A0A0A0] uppercase tracking-wider">
                      <th className="py-3 pr-4 pl-4 border-l-4 border-transparent">Report Details</th>
                      <th className="py-3 px-4">Submitted By</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {reportsList
                      .filter(rep => {
                        const matchStatus = filterStatus === 'all' || rep.status === filterStatus;
                        const matchCategory = filterCategory === 'all' || rep.category === filterCategory;
                        return matchStatus && matchCategory;
                      })
                      .map((rep) => {
                        let statusColor = 'bg-stone-100 text-stone-600 border-stone-200/50';
                        if (rep.status === 'Under Review') {
                          statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        } else if (rep.status === 'Action Taken') {
                          statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        } else if (rep.status === 'Resolved') {
                          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        }

                        let priorityColor = 'bg-stone-100 text-stone-600';
                        let borderPriorityColor = 'border-l-4 border-blue-500';
                        if (rep.priority === 'High') {
                          priorityColor = 'bg-accent-pink/10 text-accent-pink';
                          borderPriorityColor = 'border-l-4 border-red-500';
                        } else if (rep.priority === 'Medium') {
                          priorityColor = 'bg-primary/10 text-primary';
                          borderPriorityColor = 'border-l-4 border-orange-500';
                        } else if (rep.priority === 'Low') {
                          borderPriorityColor = 'border-l-4 border-blue-500';
                        }

                        return (
                          <tr
                            key={rep.id}
                            onClick={() => {
                              setSelectedReport(rep);
                              setMgmtNotes(rep.managementNotes || '');
                              setMgmtStatus(rep.status);
                              setMgmtPriority(rep.priority);
                            }}
                            className="text-xs hover:bg-stone-50/70 transition-colors cursor-pointer group"
                          >
                            <td className={`py-3.5 pr-4 pl-4 ${borderPriorityColor}`}>
                              <p className="font-bold text-text-main group-hover:text-primary transition-colors">{rep.category}</p>
                              <p className="text-[10px] text-text-subtle line-clamp-1 mt-0.5 max-w-xs">{rep.description}</p>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-text-subtle">
                              <p className="font-bold text-text-main">{rep.teacherName}</p>
                              <p className="text-[9px] text-[#A0A0A0]">{new Date(rep.createdAt).toLocaleDateString([], { dateStyle: 'short' })}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${priorityColor}`}>
                                {rep.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border rounded-full ${statusColor}`}>
                                {rep.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right border-none">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReport(rep);
                                  setMgmtNotes(rep.managementNotes || '');
                                  setMgmtStatus(rep.status);
                                  setMgmtPriority(rep.priority);
                                }}
                                className="p-2 hover:bg-stone-100 rounded-lg text-primary transition-colors flex items-center justify-center gap-1 text-[10px] uppercase font-black tracking-wider ml-auto cursor-pointer"
                              >
                                View / Edit <ChevronRight className="w-3.5 h-3.5 text-primary" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {reportsList.filter(rep => {
                      const matchStatus = filterStatus === 'all' || rep.status === filterStatus;
                      const matchCategory = filterCategory === 'all' || rep.category === filterCategory;
                      return matchStatus && matchCategory;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-text-subtle">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#A0A0A0]" />
                          <p className="text-xs font-bold">No incident reports align with search filter query</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Dialog / Detail Sheet Drawer Panel */}
            <AnimatePresence>
              {selectedReport && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[200] flex items-end justify-center">
                  <div className="absolute inset-0" onClick={() => setSelectedReport(null)} />
                  
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="relative bg-white w-full max-w-lg rounded-t-[32px] border-t border-border-subtle ios-shadow max-h-[90vh] flex flex-col z-10"
                  >
                    <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto my-3 flex-shrink-0" />
                    
                    <div className="px-6 pb-4 border-b border-border-subtle flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-black text-text-subtle uppercase tracking-widest">Case ID: #{selectedReport.id.substring(0, 8).toUpperCase()}</span>
                        <h3 className="text-sm font-black text-text-main uppercase tracking-wider">{selectedReport.category}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedReport(null)}
                        className="p-1 px-1.5 bg-stone-50 rounded-full border border-border-subtle cursor-pointer hover:bg-stone-100 text-text-dim"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1 pb-16">
                      <div className="flex justify-between items-center bg-stone-50 border border-border-subtle rounded-2xl p-4">
                        <div>
                          <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Reported By</p>
                          <p className="text-xs font-black text-text-main mt-0.5">{selectedReport.teacherName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Timestamp</p>
                          <p className="text-xs font-semibold text-text-subtle mt-0.5">
                            {new Date(selectedReport.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-dim uppercase tracking-wider">Teacher Statement</label>
                        <p className="bg-stone-50/65 border border-border-subtle rounded-2xl p-4 text-xs text-text-main leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedReport.description}
                        </p>
                      </div>

                      {selectedReport.photoUrl && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-dim uppercase tracking-wider">Evidence Image</label>
                          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-border-subtle ios-shadow">
                            <img src={selectedReport.photoUrl} alt="Incident Attachment" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      <div className="bg-stone-50/70 border border-border-subtle rounded-2xl p-5 space-y-4">
                        <p className="text-[10px] font-black text-text-main uppercase tracking-widest leading-none">Administrative Action Controls</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[8px] font-black text-text-dim uppercase tracking-wider">Report Status</label>
                            <select
                              value={mgmtStatus}
                              onChange={(e) => setMgmtStatus(e.target.value as Report['status'])}
                              className="bg-white border border-border-subtle rounded-xl p-2.5 text-xs font-bold text-text-main focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="Submitted">Submitted (Pending)</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Action Taken">Action Taken</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[8px] font-black text-text-dim uppercase tracking-wider">Priority Level</label>
                            <select
                              value={mgmtPriority}
                              onChange={(e) => setMgmtPriority(e.target.value as Report['priority'])}
                              className="bg-white border border-border-subtle rounded-xl p-2.5 text-xs font-bold text-text-main focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-black text-text-dim uppercase tracking-wider">Action & Management Notes</label>
                          <textarea
                            value={mgmtNotes}
                            onChange={(e) => setMgmtNotes(e.target.value)}
                            placeholder="Add action statements (e.g., 'Disciplinary action schedule issued', 'Hazard removed from scene'). These notes will notify and update the teacher."
                            rows={3}
                            className="bg-white border border-border-subtle rounded-xl p-3 text-xs text-text-main placeholder-text-dim focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isUpdatingReport}
                        onClick={async () => {
                          setIsUpdatingReport(true);
                          try {
                            await reportService.updateReport(
                              selectedReport.id,
                              mgmtStatus,
                              mgmtPriority,
                              mgmtNotes,
                              selectedReport.teacherId,
                              selectedReport.category
                            );
                            setSelectedReport(null);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsUpdatingReport(false);
                          }
                        }}
                        className="w-full py-4 text-xs font-black text-white bg-primary rounded-xl hover:opacity-95 text-center flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer shadow-md border border-transparent"
                      >
                        {isUpdatingReport ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Updating and notifying...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Update & Notify Teacher
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'schedule' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-[calc(100vh-180px)] space-y-4"
          >
            <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl ios-shadow border border-border-subtle">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg text-text-dim">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Duty Roster</h3>
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Global Visualization</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-stone-900 text-white shadow-lg' : 'text-text-subtle'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-stone-900 text-white shadow-lg' : 'text-text-subtle'}`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-xl border border-border-subtle">
                  <button 
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-text-subtle" />
                  </button>
                  <span className="text-[11px] font-black w-24 text-center uppercase tracking-tighter">
                    {new Date(selectedDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() + 1);
                      setSelectedDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-text-subtle" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl ios-shadow text-[11px] font-black uppercase tracking-wider transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <select 
                  value={filterTeacherId}
                  onChange={(e) => setFilterTeacherId(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-border-subtle rounded-lg text-[10px] font-bold text-text-dim focus:outline-none min-w-[100px]"
                >
                  <option value="all">All Teachers</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
                <select 
                  value={filterLocationId}
                  onChange={(e) => setFilterLocationId(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-border-subtle rounded-lg text-[10px] font-bold text-text-dim focus:outline-none min-w-[100px]"
                >
                  <option value="all">All Locations</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {viewMode === 'calendar' ? (
                <TaskCalendar 
                  date={selectedDate}
                  assignments={assignments.filter(a => 
                    (filterTeacherId === 'all' || a.teacherIds.includes(filterTeacherId)) &&
                    (filterLocationId === 'all' || a.locationId === filterLocationId)
                  )}
                  locations={locations}
                  teachers={teachers}
                  onSelectAssignment={setSelectedAssignment}
                  onAddLocation={() => setShowAddLocation(true)}
                  onAddAssignment={() => {}} // TODO
                />
              ) : (
                <div className="h-full overflow-y-auto no-scrollbar space-y-3 pb-8">
                  {locations
                    .filter(loc => filterLocationId === 'all' || loc.id === filterLocationId)
                    .map(loc => {
                      const locAssignments = assignments.filter(a => 
                        a.locationId === loc.id && 
                        (filterTeacherId === 'all' || a.teacherIds.includes(filterTeacherId))
                      );
                      const isOpen = openAccordion === loc.id;
                      if (locAssignments.length === 0) return null;

                      return (
                        <div key={loc.id} className="bg-white rounded-2xl border border-border-subtle ios-shadow overflow-hidden">
                          <button 
                            onClick={() => toggleAccordion(loc.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-text-dim">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-widest text-text-main">{loc.name}</p>
                                <p className="text-[9px] font-bold text-text-subtle uppercase">{locAssignments.length} Assignments</p>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-text-subtle transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border-subtle bg-stone-50/30"
                              >
                                <div className="p-3 space-y-2">
                                  {locAssignments.map(ass => (
                                    <div 
                                      key={ass.id}
                                      onClick={() => setSelectedAssignment(ass)}
                                      className="p-3 bg-white rounded-xl border border-border-subtle ios-shadow-sm flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-transform"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${ass.status === 'completed' ? 'bg-primary' : 'bg-stone-300'}`} />
                                        <div>
                                          <p className="text-[11px] font-black uppercase tracking-tight text-text-main">{ass.taskName}</p>
                                          <p className="text-[9px] font-bold text-text-dim uppercase">{ass.timeStart} - {ass.timeEnd}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex -space-x-1.5">
                                          {ass.teacherIds.map((tId, idx) => (
                                            <div key={idx} className="w-5 h-5 rounded-full bg-stone-100 border border-white flex items-center justify-center text-[7px] font-black uppercase">
                                              {tId.substring(0, 1)}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {selectedAssignment && (
          <AnimatePresence>
            <DutyIndividualPage 
              assignment={selectedAssignment}
              onBack={() => setSelectedAssignment(null)}
              currentTeacherId="admin-id"
              isAdmin={true}
              onUpdate={() => {
                dutyService.getAssignment(selectedAssignment.id).then(ass => ass && setSelectedAssignment(ass));
              }}
            />
          </AnimatePresence>
        )}

        {activeTab === 'performance' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">Global Analytics</h3>
                <h2 className="text-2xl font-bold text-text-main tracking-tight">School Performance</h2>
              </div>
              <button 
                onClick={handleDownloadAllReports}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center ios-shadow text-text-subtle"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>

            <div className="ios-card bg-primary text-white border-none">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-80">Average Teacher KPI</p>
                  <h4 className="text-3xl font-bold mt-1">84.2%</h4>
                </div>
                <TrendingUp className="w-8 h-8 opacity-40" />
              </div>
              <div className="mt-4 flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold opacity-70">TOP CATEGORY</span>
                  <span className="text-xs font-bold uppercase">Teaching</span>
                </div>
                <div className="flex flex-col border-l border-white/20 pl-4">
                  <span className="text-[9px] font-bold opacity-70">MONTHLY DELTA</span>
                  <span className="text-xs font-bold uppercase">+12%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="ios-card bg-secondary/10 border-secondary/20">
                <p className="text-[10px] font-bold text-secondary uppercase mb-2">Total Marks Added</p>
                <p className="text-2xl font-bold text-secondary">+1,240</p>
              </div>
              <div className="ios-card bg-accent-pink/10 border-accent-pink/20">
                <p className="text-[10px] font-bold text-accent-pink uppercase mb-2">Total Deductions</p>
                <p className="text-2xl font-bold text-accent-pink">-215</p>
              </div>
            </div>

            <div className="ios-card bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">Master Yearly KPI Registry</h3>
                <button 
                  onClick={handleBulkGenerateYearlyKpis}
                  disabled={isCalculatingYearly}
                  className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-[9px] font-bold uppercase flex items-center gap-2 disabled:opacity-50"
                >
                  {isCalculatingYearly ? 'Processing...' : 'Run All Calculations'}
                </button>
              </div>
              <div className="space-y-3">
                {teachers.slice(0, 5).map((teacher) => (
                  <div 
                    key={teacher.id} 
                    onClick={() => handleOpenTeacherDetail(teacher, 'kpi')}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-stone-50 transition-colors px-1 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold">
                        {teacher.fullName[0]}
                      </div>
                      <span className="text-xs font-bold text-text-main">{teacher.fullName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${teacher.currentScore! > 20 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                          {teacher.currentScore! > 20 ? 'A' : teacher.currentScore! > 10 ? 'B' : 'C'}
                        </span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-text-subtle opacity-30" />
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 rounded-lg">
                View Full Faculty Registry
              </button>
            </div>

            <div className="space-y-4 pb-20">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-bold text-text-main uppercase tracking-widest">Detailed Performance rankings</h3>
                <button 
                  onClick={handleDownloadAllReports}
                  className="flex items-center gap-2 text-[9px] font-black text-primary uppercase"
                >
                  <Download className="w-3 h-3" /> Get All PDF
                </button>
              </div>
              {teachers
                .sort((a, b) => (b.currentScore || 0) - (a.currentScore || 0))
                .map((teacher) => {
                  const score = teacher.currentScore || 0;
                  const isLow = score < 0;
                  const isHigh = score > 20;

                  return (
                    <motion.div 
                      key={teacher.id} 
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenTeacherDetail(teacher, 'performance')}
                      className="ios-card flex items-center justify-between border-l-4 border-l-transparent hover:border-l-primary transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-text-main font-bold text-xs border border-white ios-shadow">
                            {teacher.fullName[0]}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${isLow ? 'bg-accent-pink' : isHigh ? 'bg-primary' : 'bg-secondary'}`}>
                            {isLow ? <AlertCircle className="w-2 h-2 text-white" /> : <CheckCircle2 className="w-2 h-2 text-white" />}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-main">{teacher.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isLow ? 'bg-accent-pink/10 text-accent-pink' : isHigh ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                              {isLow ? 'Needs Intervention' : isHigh ? 'Distinction' : 'Satisfactory'}
                            </span>
                            <span className="text-[9px] text-text-subtle font-medium">RANK {(teachers.indexOf(teacher) + 1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${score >= 0 ? 'text-primary' : 'text-accent-pink'}`}>
                          {score >= 0 ? '+' : ''}{score}
                        </p>
                        <p className="text-[8px] font-bold text-text-subtle uppercase">CURRENT KPI</p>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        )}
        {activeTab === 'notify' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-text-main">Critical Alerts</h2>
              <span className="text-[10px] font-bold text-accent-pink bg-accent-pink/10 px-2 py-1 rounded">ADMIN ACTIONS</span>
            </div>

            {notifications.length === 0 ? (
              <div className="py-20 text-center">
                <ShieldCheck className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                <p className="text-sm font-medium text-text-dim">No critical alerts detected.</p>
                <p className="text-[10px] text-text-subtle mt-1 uppercase tracking-widest font-bold">System Secure</p>
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`ios-card border-l-4 ${notif.title.includes('CRITICAL') ? 'border-accent-pink' : 'border-secondary'} p-5`}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.title.includes('CRITICAL') ? 'bg-accent-pink/10 text-accent-pink' : 'bg-secondary/10 text-secondary'}`}>
                          {notif.title.includes('CRITICAL') ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-text-main text-balance">{notif.title}</h4>
                          <p className="text-[10px] text-text-subtle font-medium">
                            {notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      </div>
                      {!notif.read && <div className="w-2 h-2 bg-accent-pink rounded-full" />}
                    </div>
                    <p className="text-[11px] text-text-dim leading-relaxed mt-4 font-medium italic">
                      {notif.message}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 py-3 bg-stone-100 rounded-lg text-[9px] font-bold uppercase text-text-dim">Dismiss</button>
                      <button className="flex-1 py-3 bg-primary text-white rounded-lg text-[9px] font-bold uppercase">Take Action</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'leaves' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-text-main">Leave Control Centre</h2>
                <p className="text-[10px] text-text-dim mt-0.5 uppercase tracking-wider font-bold">Principal Leave Review & Balances</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-accent-pink bg-accent-pink/10 px-2 py-1 rounded">
                  {allLeaves.filter(l => l.status === 'pending').length} Actionable
                </span>
              </div>
            </div>

            {/* Part 1: Pending Approvals list */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent-pink" /> Pending Approvals ({allLeaves.filter(l => l.status === 'pending').length})
              </h3>

              {allLeaves.filter(l => l.status === 'pending').length === 0 ? (
                <div className="ios-card bg-stone-50/50 p-8 text-center border border-dashed border-stone-200">
                  <CheckCircle2 className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-text-dim uppercase tracking-wider">All caught up!</p>
                  <p className="text-[10px] text-text-subtle mt-1">No pending leave applications require review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allLeaves.filter(l => l.status === 'pending').map((leave) => (
                    <div key={leave.id} className="ios-card bg-white border border-[#E9ECE9] shadow-sm p-5 relative overflow-hidden">
                      {/* Left color bar */}
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary/70"></div>
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {leave.teacherName ? leave.teacherName[0] : 'T'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-text-main leading-none">{leave.teacherName || 'Faculty Member'}</h4>
                            <p className="text-[9px] font-bold text-text-subtle mt-1 flex items-center gap-1.5 bg-stone-50 rounded px-1.5 py-0.5 uppercase tracking-widest w-fit">
                              {leave.type.toUpperCase()} LEAVE
                            </p>
                          </div>
                        </div>

                        <span className="text-[9px] text-text-subtle font-medium bg-stone-100 px-2 py-1 rounded uppercase">
                          {leave.duration} DAY(S)
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-xs text-text-main leading-relaxed">
                          <span className="font-black">Date Period:</span> {leave.startDate} {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}
                        </div>
                        
                        {leave.remarks && (
                          <div className="p-3 bg-stone-50/60 rounded-xl text-[11px] leading-relaxed italic text-text-dim relative">
                            &ldquo;{leave.remarks}&rdquo;
                          </div>
                        )}

                        {leave.documentName && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold text-text-subtle">Supporting Doc:</span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                              <FileText className="w-3.5 h-3.5" />
                              <a href={leave.documentUrl || '#'} target="_blank" rel="noreferrer" className="underline truncate max-w-[170px]">
                                {leave.documentName}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Review Input and Buttons */}
                      <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-text-subtle">Principal Feedback Note</label>
                          <input
                            type="text"
                            placeholder="Add reason for approval or rejection (optional)..."
                            value={reviewingLeaveId === leave.id ? principalLeaveNotes : ''}
                            onChange={(e) => {
                              setReviewingLeaveId(leave.id);
                              setPrincipalLeaveNotes(e.target.value);
                            }}
                            className="w-full h-10 px-3 bg-stone-50 rounded-lg text-xs placeholder-text-subtle text-text-main focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            disabled={isUpdatingLeaveStatus}
                            onClick={() => {
                              setReviewingLeaveId(leave.id);
                              handleReviewLeaveSubmit(leave.id, 'rejected');
                            }}
                            className="px-4 py-2 text-[10px] border border-accent-pink/40 text-accent-pink hover:bg-accent-pink/5 font-black uppercase tracking-widest rounded-lg transition-colors flex-1 text-center"
                          >
                            Reject Application
                          </button>
                          
                          <button
                            disabled={isUpdatingLeaveStatus}
                            onClick={() => {
                              setReviewingLeaveId(leave.id);
                              handleReviewLeaveSubmit(leave.id, 'approved');
                            }}
                            className="px-4 py-2 text-[10px] bg-primary text-white font-black uppercase tracking-widest rounded-lg hover:bg-opacity-90 transition-all flex-1 text-center"
                          >
                            Approve & Update
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Part 2: Staff Leave Balances & Quotas Tracker */}
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Faculty Leave Balances
                </h3>
              </div>
              
              <div className="ios-card bg-white p-4 space-y-4 border border-[#E9ECE9]">
                <p className="text-[10px] text-text-dim text-justify leading-relaxed">
                  Remaining quotas is calculated automatically by starting with standard allowances minus any approved leave certificates. Half-day leave is relative to the current month allocation (2 per month max).
                </p>
                
                <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto no-scrollbar">
                  {teachers.map((t) => {
                    // Summarize remaining days
                    const teacherLeaves = allLeaves.filter(l => l.teacherId === t.id && l.status === 'approved');
                    
                    const annualTaken = teacherLeaves.filter(l => l.type === 'annual').reduce((sum, l) => sum + (l.duration || 1), 0);
                    const annualRemaining = Math.max(0, 8 - annualTaken);

                    const medicalTaken = teacherLeaves.filter(l => l.type === 'medical').reduce((sum, l) => sum + (l.duration || 1), 0);
                    const medicalRemaining = Math.max(0, 14 - medicalTaken);

                    const currentMonthStr = new Date().toISOString().substring(0, 7);
                    const halfdayTaken = teacherLeaves.filter(l => l.type === 'halfday' && l.startDate.substring(0, 7) === currentMonthStr).reduce((sum, l) => sum + (l.duration || 0.5), 0);
                    const halfdayRemaining = Math.max(0, 2 - halfdayTaken);

                    return (
                      <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#7A8A7A]/10 text-primary font-bold text-[10px] flex items-center justify-center uppercase">
                            {t.fullName ? t.fullName[0] : 'S'}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-text-main truncate max-w-[120px]">{t.fullName}</p>
                            <p className="text-[8px] text-[#A69988] font-bold uppercase">{t.role}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="text-center bg-stone-50 px-2 py-1 rounded border border-stone-150">
                            <p className="text-[7px] font-bold text-text-subtle uppercase">ANNUAL</p>
                            <p className="text-xs font-black text-primary">{annualRemaining}d</p>
                          </div>
                          <div className="text-center bg-stone-50 px-2 py-1 rounded border border-stone-150">
                            <p className="text-[7px] font-bold text-text-subtle uppercase">MEDICAL</p>
                            <p className="text-xs font-black text-primary">{medicalRemaining}d</p>
                          </div>
                          <div className="text-center bg-stone-50 px-2 py-1 rounded border border-stone-150">
                            <p className="text-[7px] font-bold text-text-subtle uppercase">H-DAY</p>
                            <p className="text-xs font-black text-secondary">{halfdayRemaining}d</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Part 3: Completed Leaves Book / History */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#A69988]" /> Leave Logs History ({allLeaves.filter(l => l.status !== 'pending').length})
              </h3>

              {allLeaves.filter(l => l.status !== 'pending').length === 0 ? (
                <div className="ios-card bg-stone-50/50 p-6 text-center text-[10px] font-bold uppercase text-text-dim">
                  No completed operations in history log.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar bg-white rounded-3xl p-4 border border-[#E9ECE9]">
                  {allLeaves.filter(l => l.status !== 'pending').sort((a,b) => b.createdAt ? b.createdAt.localeCompare(a.createdAt) : 0).map((leave) => (
                    <div key={leave.id} className="text-xs py-2.5 border-b border-stone-100 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-text-main block truncate pr-1 max-w-[150px]">{leave.teacherName}</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          leave.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {leave.status}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-text-dim mt-1">
                        <span>Period: {leave.startDate} to {leave.endDate} ({leave.duration} day(s))</span>
                        <span className="text-[8px] uppercase tracking-wide bg-stone-100 px-1 rounded font-bold">{leave.type}</span>
                      </div>

                      {leave.principalNotes && (
                        <p className="text-[9px] text-[#A69988] bg-stone-50/50 rounded p-1.5 mt-1.5 italic">
                          &ldquo;{leave.principalNotes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button */}
      {activeTab === 'home' && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setSelectedTeacher(null);
            setShowLogModal(true);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full ios-shadow flex items-center justify-center z-[60] border-4 border-white"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Add Teacher Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 ios-shadow border border-border-subtle"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-text-main">New Teacher</h3>
                <button onClick={() => { setShowAddModal(false); setInviteSent(false); }} className="p-2 bg-stone-50 rounded-full">
                  <X className="w-4 h-4 text-text-dim" />
                </button>
              </div>

              {!inviteSent ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Username</label>
                    <input 
                      type="text" 
                      placeholder="e.g. johndoe"
                      className="w-full h-12 px-4 bg-bg-input rounded-xl focus:ring-1 focus:ring-primary focus:outline-none text-sm font-medium"
                      value={newTeacherForm.username}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Work Email</label>
                    <input 
                      type="email" 
                      placeholder="e.g. john@school.edu"
                      className="w-full h-12 px-4 bg-bg-input rounded-xl focus:ring-1 focus:ring-primary focus:outline-none text-sm font-medium"
                      value={newTeacherForm.email}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })}
                    />
                  </div>
                  <button 
                    onClick={() => setInviteSent(true)}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold mt-4 ios-shadow flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" /> Send Invite
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-main">Invite Sent!</h4>
                    <p className="text-xs text-text-dim mt-1">A reset password link has been sent to <br/><span className="font-bold text-primary">{newTeacherForm.email}</span></p>
                  </div>
                  <button 
                    onClick={() => { setShowAddModal(false); setInviteSent(false); }}
                    className="w-full py-4 bg-stone-100 text-text-main rounded-2xl font-bold mt-4"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Performance log modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-full max-w-sm bg-white rounded-3xl p-6 ios-shadow border border-border-subtle max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-text-main">
                  KPI Assessment Detail
                </h3>
                <button onClick={() => setShowLogModal(false)} className="p-2 bg-stone-50 rounded-full">
                  <X className="w-4 h-4 text-text-dim" />
                </button>
              </div>

              <div className="space-y-5">
                {!selectedTeacher && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Teacher</label>
                    <select 
                      value={newLog.teacherId}
                      onChange={(e) => setNewLog({ ...newLog, teacherId: e.target.value })}
                      className="w-full h-12 px-4 bg-bg-input rounded-xl border-none text-sm text-text-main focus:ring-1 focus:ring-primary focus:outline-none appearance-none"
                    >
                      <option value="">Select Staff...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Category</label>
                  <select 
                    value={newLog.category}
                    onChange={(e) => {
                      const cat = e.target.value as PerformanceCategory;
                      setNewLog({ 
                        ...newLog, 
                        category: cat,
                        criterion: PERFORMANCE_CRITERIA[cat][0]
                      });
                    }}
                    className="w-full h-12 px-4 bg-bg-input rounded-xl border-none text-sm text-text-main focus:ring-1 focus:ring-primary focus:outline-none appearance-none"
                  >
                    {Object.values(PerformanceCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Criterion Selection</label>
                  <div className="space-y-2">
                    {PERFORMANCE_CRITERIA[newLog.category].map(crit => (
                      <button 
                        key={crit}
                        onClick={() => setNewLog({ ...newLog, criterion: crit })}
                        className={`w-full p-3 rounded-xl border text-[11px] font-medium text-left transition-all ${newLog.criterion === crit ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-border-subtle text-text-dim'}`}
                      >
                        {crit}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Impact Severity</label>
                  <div className="flex gap-2">
                    {Object.values(SeverityLevel).map(sev => (
                      <button 
                         key={sev}
                         onClick={() => setNewLog({ ...newLog, severity: sev })}
                         className={`flex-1 h-10 rounded-lg text-[10px] font-bold border transition-all ${newLog.severity === sev ? 'bg-secondary text-white border-secondary' : 'bg-white text-text-dim border-border-subtle'}`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewLog({...newLog, amount: Math.abs(newLog.amount)})}
                    className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all ${newLog.amount > 0 ? 'bg-primary text-white' : 'bg-bg-input text-text-dim'}`}
                  >
                    + Merit
                  </button>
                  <button 
                    onClick={() => setNewLog({...newLog, amount: -Math.abs(newLog.amount)})}
                    className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all ${newLog.amount < 0 ? 'bg-accent-pink text-white' : 'bg-bg-input text-text-dim'}`}
                  >
                    - Deduction
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Observation Details</label>
                  <div className="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Automated Scoring Logic</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-text-main">
                        Severity: <span className="font-bold">{newLog.severity}</span>
                      </span>
                      <span className={`text-sm font-black ${newLog.amount > 0 ? 'text-primary' : 'text-accent-pink'}`}>
                        {newLog.amount > 0 ? '+' : '-'}{
                          newLog.amount > 0 ? (
                            newLog.severity === SeverityLevel.MINOR ? 1 :
                            newLog.severity === SeverityLevel.NORMAL ? 1 :
                            newLog.severity === SeverityLevel.MAJOR ? 2 : 3
                          ) : (
                            newLog.severity === SeverityLevel.MINOR ? 1 :
                            newLog.severity === SeverityLevel.NORMAL ? 2 :
                            newLog.severity === SeverityLevel.MAJOR ? 3 : 5
                          )
                        } PTS
                      </span>
                    </div>
                  </div>
                </div>

                {newLog.amount < 0 && todayStats && (todayStats.totalDeductions - (
                  newLog.severity === SeverityLevel.MINOR ? 1 :
                  newLog.severity === SeverityLevel.NORMAL ? 2 :
                  newLog.severity === SeverityLevel.MAJOR ? 3 : 5
                ) < DAILY_DEDUCTION_LIMIT) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-accent-pink/5 border border-accent-pink/20 rounded-xl flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-accent-pink shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-accent-pink uppercase tracking-widest">Limit Exceeded Warning</p>
                      <p className="text-[10px] text-accent-pink font-medium leading-relaxed mt-1">
                        Daily deduction limit for this staff is {Math.abs(DAILY_DEDUCTION_LIMIT)} points. Current: {Math.abs(todayStats.totalDeductions)}. Proceeding with this deduction will exceed the limit.
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Remarks (Optional)</label>
                  <textarea 
                    placeholder="Specific observations..."
                    className="w-full h-24 p-4 bg-bg-input rounded-xl border-none text-sm text-text-main focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                    value={newLog.reason}
                    onChange={(e) => setNewLog({ ...newLog, reason: e.target.value })}
                  />
                </div>

                <button 
                  onClick={handleUpdateScore}
                  disabled={!newLog.criterion || (!selectedTeacher && !newLog.teacherId)}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-bold mt-4 ios-shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" /> Confirm Assessment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Details Modal */}
      <AnimatePresence>
        {selectedTeacher && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 z-[110] bg-bg-light overflow-y-auto no-scrollbar"
          >
            <div className="px-6 pt-12 pb-24">
              <div className="flex justify-between items-center mb-8">
                <button 
                  onClick={() => setSelectedTeacher(null)}
                  className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back
                </button>
                <div className="w-24 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary">STAFF RECORD</span>
                </div>
              </div>

                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-accent-pink/10 flex items-center justify-center ios-shadow text-xl font-bold text-accent-pink mb-4 border border-white">
                    {selectedTeacher.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h2 className="text-xl font-bold text-text-main">{selectedTeacher.fullName}</h2>
                  <p className="text-xs text-text-dim mt-1">{selectedTeacher.email}</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-stone-100 rounded-xl mb-8 ios-shadow-sm overflow-x-auto no-scrollbar">
                  {[
                    { id: 'profile', label: 'Profile' },
                    { id: 'performance', label: 'Performance' },
                    { id: 'leave', label: 'Leave' },
                    { id: 'training', label: 'Training' },
                    { id: 'kpi', label: 'Yearly KPI' }
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setTeacherDetailTab(tab.id as any)}
                      className={`flex-none px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${teacherDetailTab === tab.id ? 'bg-white text-primary ios-shadow' : 'text-text-subtle'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {teacherDetailTab === 'profile' && (
                    <>
                      <div className="ios-card bg-white">
                        <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-4">Official Identification</h3>
                        <div className="space-y-4">
                          {[
                            { label: 'IC Number', value: selectedTeacher.icNumber },
                            { label: 'Gender', value: selectedTeacher.gender },
                            { label: 'Date of Birth', value: selectedTeacher.dob },
                            { label: 'Marital Status', value: selectedTeacher.maritalStatus },
                            { label: 'Phone', value: selectedTeacher.phoneNumber },
                            { label: 'Address', value: selectedTeacher.address },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0 font-sans">
                              <span className="text-[10px] font-bold text-text-subtle uppercase">{item.label}</span>
                              <span className="text-xs font-medium text-text-main text-right ml-4">{item.value || 'N/A'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="ios-card bg-accent-tan/5 border-accent-tan/20">
                        <h3 className="text-[10px] font-bold text-[#A69988] uppercase tracking-widest mb-4">Emergency Support Contact</h3>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-[#8B7E6D]">{selectedTeacher.emergencyContactName || 'N/A'}</p>
                            <p className="text-[10px] text-[#A69988] font-medium">{selectedTeacher.emergencyContactNumber || 'N/A'}</p>
                          </div>
                          <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center text-[#8B7E6D]">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest px-1">Documents Repository</h3>
                        {(Object.values(selectedTeacher.documents) as TeacherDocument[]).map((doc) => (
                          <div key={doc.id} className="ios-card flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-text-subtle">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-bold text-text-main line-clamp-1">{doc.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="p-1.5 bg-stone-50 rounded-lg text-text-dim hover:text-primary transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1.5 bg-stone-50 rounded-lg text-text-dim hover:text-primary transition-colors">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {teacherDetailTab === 'performance' && (
                    <>
                      <div className="flex gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowLogModal(true)}
                          className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Merit Award
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setShowLogModal(true); setNewLog({ ...newLog, amount: -1 }); }}
                          className="flex-1 py-3 bg-accent-pink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Minus className="w-3.5 h-3.5" /> Disciplinary
                        </motion.button>
                      </div>

                      <div className="ios-card bg-white h-[280px]">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">KPI Trend Analysis</h3>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-bold text-primary">LIVE TRACKING</span>
                          </div>
                        </div>
                        <div className="w-full h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData}>
                              <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#B2C2B2" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#B2C2B2" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fill: '#A0A0A0' }}
                              />
                              <YAxis hide />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '10px' }}
                              />
                              <Area type="monotone" dataKey="score" stroke="#B2C2B2" fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
                          <button 
                            onClick={handleDownloadReport}
                            className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest"
                          >
                            <Download className="w-3.5 h-3.5" /> Full Performance PDF
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest px-1">Detailed Evaluation Records</h3>
                        {teacherLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="ios-card flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[8px] font-black uppercase text-primary bg-primary/5 px-1.5 py-0.5 rounded mr-2">{log.category}</span>
                                <span className="text-[10px] font-bold text-text-main">{log.criterion}</span>
                              </div>
                              <span className={`text-xs font-black ${log.amount > 0 ? 'text-primary' : 'text-accent-pink'}`}>
                                {log.amount > 0 ? '+' : ''}{log.amount}
                              </span>
                            </div>
                            {log.reason && <p className="text-[10px] text-text-dim italic leading-relaxed">"{log.reason}"</p>}
                            <p className="text-[8px] text-text-subtle font-medium uppercase mt-1">
                              {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {teacherDetailTab === 'leave' && (() => {
                    const teacherLeaves = allLeaves.filter(l => l.teacherId === selectedTeacher?.id);
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">Leave Applications ({teacherLeaves.length})</h4>
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">Quotas Ledger</span>
                        </div>

                        {teacherLeaves.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center ios-card bg-stone-50/40">
                            <Calendar className="w-8 h-8 text-text-subtle/30 mb-3" />
                            <h4 className="text-[10px] font-black text-text-main uppercase tracking-wider">No Applications Submitted</h4>
                            <p className="text-[9px] text-text-dim mt-1.5 max-w-[200px] leading-relaxed">This teacher has not submitted any leave applications through their portal.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {teacherLeaves.map((leave) => (
                              <div key={leave.id} className="ios-card bg-white border border-border-subtle p-4pink-edge relative">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black uppercase text-primary">
                                    {leave.type.toUpperCase()} LEAVE
                                  </span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    leave.status === 'approved' ? 'bg-green-50 text-green-600' :
                                    leave.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                    'bg-yellow-50 text-yellow-600'
                                  }`}>
                                    {leave.status}
                                  </span>
                                </div>

                                <p className="text-xs font-extrabold text-text-main">
                                  {leave.startDate} {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}
                                </p>
                                <p className="text-[10px] text-text-dim mt-1">
                                  Duration: <span className="font-bold text-primary">{leave.duration} day(s)</span>
                                </p>

                                {leave.remarks && (
                                  <p className="text-[10px] italic text-text-subtle mt-2 bg-stone-50 p-2 rounded-lg leading-relaxed border border-stone-100">
                                    &ldquo;{leave.remarks}&rdquo;
                                  </p>
                                )}

                                {leave.documentName && (
                                  <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg w-fit">
                                    <FileText className="w-3.5 h-3.5" />
                                    <a href={leave.documentUrl || '#'} target="_blank" rel="noreferrer" className="underline truncate max-w-[150px]">
                                      {leave.documentName}
                                    </a>
                                  </div>
                                )}

                                {leave.principalNotes && (
                                  <div className="mt-3 pt-3 border-t border-stone-50 text-[10px] trailing-relaxed">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-[#A69988]">Principal Verdict Feedback</p>
                                    <p className="text-[10px] font-bold text-text-dim mt-0.5 italic">&ldquo;{leave.principalNotes}&rdquo;</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {teacherDetailTab === 'training' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-text-subtle mb-4">
                        <ShieldCheck className="w-8 h-8 opacity-20" />
                      </div>
                      <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">No Training Records</h4>
                      <p className="text-[10px] text-text-dim mt-2 max-w-[200px]">CPD certifications and workshop attendance records for {new Date().getFullYear()} will be displayed here.</p>
                      <button className="mt-6 px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">
                        Assign Training
                      </button>
                    </div>
                  )}

                  {teacherDetailTab === 'kpi' && (
                    <div className="ios-card bg-stone-900 text-white overflow-hidden relative border-none">
                      <div className="absolute top-[-10px] right-[-10px] w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Yearly KPI Assessment</h3>
                          <p className="text-2xl font-black mt-1">
                            {yearlyKpis.length > 0 ? yearlyKpis[0].rating : '--'}
                            <span className="text-xs font-bold text-stone-500 ml-2 uppercase">Official Rating</span>
                          </p>
                        </div>
                        <ShieldCheck className="w-6 h-6 text-primary" />
                      </div>

                      {yearlyKpis.length > 0 ? (
                        <div className="space-y-4 relative z-10">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <p className="text-[9px] text-stone-400 uppercase font-bold">Annual Avg</p>
                              <p className="text-sm font-bold text-white mt-0.5">{yearlyKpis[0].averageMonthlyScore.toFixed(1)}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <p className="text-[9px] text-stone-400 uppercase font-bold">Trend Factor</p>
                              <p className="text-sm font-bold text-secondary mt-0.5">{yearlyKpis[0].trendFactor.toFixed(1)}x</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => pdfService.generateYearlyKpiReport(selectedTeacher, yearlyKpis[0])}
                              className="flex-1 py-3 bg-white text-stone-900 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              <Download className="w-3.5 h-3.5" /> Yearly Certificate PDF
                            </button>
                            <button className="flex-1 py-3 bg-stone-800 text-stone-400 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                              Adjust
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 relative z-10">
                          <p className="text-xs text-stone-400 font-medium leading-relaxed italic opacity-70">
                            No yearly KPI data available for this cycle. Generate faculty-wide assessments from the Master KPI Registry on the main dashboard.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex justify-between items-center z-50">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-1 relative"
          >
            <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-text-subtle opacity-40'}`} />
            <span className={`text-[8px] font-bold uppercase tracking-tighter ${activeTab === tab.id ? 'text-primary' : 'text-text-subtle opacity-40'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
