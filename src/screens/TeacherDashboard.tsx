import React, { useState, useRef, useEffect } from 'react';
import { Home, Rss, Bell, User, ClipboardCheck, Calendar, Clock, ChevronRight, LogOut, Camera, BookOpen, Upload, FileText, X, CheckCircle2, AlertCircle, Eye, BarChart3, TrendingUp, Download, Target, Plus, Minus, ShieldCheck, MapPin, ChevronLeft, LayoutGrid, ClipboardList } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { TeacherRecord, Gender, MaritalStatus, INITIAL_DOCUMENTS, calculateProgress, TeacherDocument, PerformanceLog, MonthlySummary, YearlyKpiRecord, DutyAssignment, DutyLocation, Report, LeaveRecord, LeaveType } from '../types';
import { performanceService, db, reportService, leaveService } from '../lib/firebase';
import { dutyService } from '../lib/dutyService';
import { DutyIndividualPage } from '../components/DutyComponents';
import { TaskCalendar } from '../components/TaskCalendar';
import { pdfService } from '../lib/pdfService';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import TrainingModule from '../components/TrainingModule';

interface TeacherDashboardProps {
  onLogout: () => void;
}

export default function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'performance' | 'leave' | 'training' | 'kpi'>('info');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  const [record, setRecord] = useState<TeacherRecord>({
    id: '1',
    username: 'sarah_j',
    email: 'sarah.jenkins@school.edu',
    fullName: 'Sarah Jenkins',
    role: 'teacher',
    icNumber: '',
    gender: Gender.FEMALE,
    dob: '',
    address: '',
    phoneNumber: '',
    maritalStatus: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    documents: JSON.parse(JSON.stringify(INITIAL_DOCUMENTS)),
    completionProgress: 0,
    currentScore: 85,
    yearlyKpi: 92,
    status: 'active'
  });

  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [yearlyKpis, setYearlyKpis] = useState<any[]>([]);

  // Incident Reports states
  const [reportsSubTab, setReportsSubTab] = useState<'create' | 'history'>('create');
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [reportCategory, setReportCategory] = useState('Sexual Harassment Report');
  const [reportDesc, setReportDesc] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  // Duty State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<DutyAssignment[]>([]);
  const [locations, setLocations] = useState<DutyLocation[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DutyAssignment | null>(null);
  const [dutyViewMode, setDutyViewMode] = useState<'list' | 'calendar'>('list');
  const [isViewingFullSchedule, setIsViewingFullSchedule] = useState(false);

  // Leave States
  const [leavesList, setLeavesList] = useState<LeaveRecord[]>([]);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual' as LeaveType,
    startDate: '',
    endDate: '',
    remarks: '',
    documentUrl: '',
    documentName: ''
  });
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync profile
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'teachers', record.id), (snap) => {
      if (snap.exists()) setRecord({ id: snap.id, ...snap.data() } as TeacherRecord);
    });
    return () => unsub();
  }, [record.id]);

  // Sync leaves
  useEffect(() => {
    return leaveService.getLeaves(record.id, setLeavesList);
  }, [record.id]);

  // Sync duty tasks
  useEffect(() => {
    dutyService.ensureAssignmentsForDate(selectedDate);
    const unsub = dutyService.getAssignments(selectedDate, (all) => {
      setAllAssignments(all);
      setAssignments(all.filter(a => a.teacherIds.includes(record.id)));
    });
    return () => unsub();
  }, [selectedDate, record.id]);

  // Sync locations and teachers for calendar
  useEffect(() => {
    const unsubLocs = dutyService.getLocations(setLocations);
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherRecord)));
    });
    return () => {
      unsubLocs();
      unsubTeachers();
    };
  }, []);

  // Sync logs, summaries, and yearly KPIs
  useEffect(() => {
    const unsubLogs = performanceService.getLogs(record.id, setLogs);
    const unsubSummaries = performanceService.getSummaries(record.id, setSummaries);
    const unsubKpis = performanceService.getYearlyKpis(record.id, setYearlyKpis);
    return () => { unsubLogs(); unsubSummaries(); unsubKpis(); };
  }, [record.id]);

  // Sync incident reports
  useEffect(() => {
    const unsubReports = reportService.getReports(record.id, setReportsList);
    return () => unsubReports();
  }, [record.id]);

  const currentMonthLogs = logs.filter(log => {
    if (!log.timestamp) return false;
    const date = new Date(log.timestamp.seconds * 1000);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const monthlyScoreSum = currentMonthLogs.reduce((acc, log) => acc + log.amount, 0);

  const performanceData = logs.slice(0, 7).reverse().map(log => ({
    date: new Date(log.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: log.amount
  }));

  const progress = calculateProgress(record);

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'training', icon: BookOpen, label: 'Training' },
    { id: 'performance', icon: BarChart3, label: 'Performance' },
    { id: 'notify', icon: Bell, label: 'Alerts' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleUpdateField = (field: keyof TeacherRecord, value: string) => {
    setRecord(prev => {
      const next = { ...prev, [field]: value };
      return { ...next, completionProgress: calculateProgress(next) };
    });
  };

  const handleUploadDoc = () => {
    if (!selectedDocId) return;
    setRecord(prev => {
      const nextDocs = { ...prev.documents };
      const docKey = selectedDocId as keyof typeof INITIAL_DOCUMENTS;
      nextDocs[docKey] = { ...nextDocs[docKey], status: 'uploaded', url: '#' };
      const next = { ...prev, documents: nextDocs };
      return { ...next, completionProgress: calculateProgress(next) };
    });
    setShowUploadModal(false);
    setSelectedDocId(null);
  };

  const handleRemoveDoc = (docId: string) => {
    setRecord(prev => {
      const nextDocs = { ...prev.documents };
      const docKey = docId as keyof typeof INITIAL_DOCUMENTS;
      nextDocs[docKey] = { ...nextDocs[docKey], status: 'empty', url: undefined };
      const next = { ...prev, documents: nextDocs };
      return { ...next, completionProgress: calculateProgress(next) };
    });
  };

  const LEAVE_SPECS = [
    { type: 'annual', name: 'Annual Leave', quota: 8, docRequired: false, docLabel: 'None (Optional Remarks)' },
    { type: 'medical', name: 'Medical Leave (MC)', quota: 14, docRequired: true, docLabel: 'Medical Certificate from clinic/hospital' },
    { type: 'unpaid', name: 'Unpaid Leave', quota: 8, docRequired: true, docLabel: 'Justification letter/document' },
    { type: 'maternity', name: 'Maternity Leave', quota: 98, docRequired: true, docLabel: 'Hospital admission / Certified medical report' },
    { type: 'marriage', name: 'Marriage Leave', quota: 5, docRequired: true, docLabel: 'Marriage certificate / Wedding invitation' },
    { type: 'compassionate', name: 'Compassionate Leave', quota: 2, docRequired: true, docLabel: 'Death certificate / Official notice' },
    { type: 'umrah', name: 'Umrah Leave', quota: 14, docRequired: true, docLabel: 'Travel itinerary / Flight booking' },
    { type: 'haji', name: 'Haji Leave', quota: 40, docRequired: true, docLabel: 'Official pilgrim allocation letter' },
    { type: 'birthday', name: 'Birthday Leave', quota: 1, docRequired: false, docLabel: 'None (System validates via Birth Date)' },
    { type: 'halfday', name: 'Half Day Leave', quota: 2, docRequired: false, docLabel: 'None (Quota resets monthly)' }
  ];

  const getLeaveBalance = (type: LeaveType) => {
    const spec = LEAVE_SPECS.find(s => s.type === type);
    const quota = spec ? spec.quota : 0;
    
    // Calculate Taken (Approved)
    let approvedDays = 0;
    if (type === 'halfday') {
      const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
      approvedDays = leavesList
        .filter(l => l.type === 'halfday' && l.status === 'approved' && l.startDate.substring(0, 7) === currentMonthStr)
        .reduce((sum, l) => sum + (l.duration || 0.5), 0);
    } else {
      approvedDays = leavesList
        .filter(l => l.type === type && l.status === 'approved')
        .reduce((sum, l) => sum + (l.duration || 1), 0);
    }

    // Calculate Pending
    let pendingDays = 0;
    if (type === 'halfday') {
      const currentMonthStr = new Date().toISOString().substring(0, 7);
      pendingDays = leavesList
        .filter(l => l.type === 'halfday' && l.status === 'pending' && l.startDate.substring(0, 7) === currentMonthStr)
        .reduce((sum, l) => sum + (l.duration || 0.5), 0);
    } else {
      pendingDays = leavesList
        .filter(l => l.type === type && l.status === 'pending')
        .reduce((sum, l) => sum + (l.duration || 1), 0);
    }

    const remaining = Math.max(0, quota - approvedDays - pendingDays);

    return {
      quota,
      taken: approvedDays,
      pending: pendingDays,
      remaining
    };
  };

  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsApplying(true);

    try {
      // Calculate duration
      let duration = 1;
      if (leaveForm.type !== 'halfday') {
        const start = new Date(leaveForm.startDate);
        const end = new Date(leaveForm.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          setErrorMessage("Please enter valid start and end dates.");
          setIsApplying(false);
          return;
        }
        if (start > end) {
          setErrorMessage("Start date cannot be after end date.");
          setIsApplying(false);
          return;
        }
        const diffTime = Math.abs(end.getTime() - start.getTime());
        duration = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } else {
        duration = 0.5;
      }

      // 1. Quota Remaining Validation
      const balance = getLeaveBalance(leaveForm.type);
      if (duration > balance.remaining) {
        setErrorMessage(`Insufficient balance. You are applying for ${duration} day(s), but you only have ${balance.remaining} day(s) remaining for ${leaveForm.type === 'halfday' ? 'Half Day Leave' : leaveForm.type + ' leave'}.`);
        setIsApplying(false);
        return;
      }

      // 2. Mandatory Documentation check
      const spec = LEAVE_SPECS.find(s => s.type === leaveForm.type);
      if (spec?.docRequired && !leaveForm.documentName) {
        setErrorMessage(`Supporting document is mandatory for ${spec?.name}. Please upload: ${spec?.docLabel}.`);
        setIsApplying(false);
        return;
      }

      // 3. Birthday Leave DOB match validation
      if (leaveForm.type === 'birthday') {
        if (!record.dob) {
          setErrorMessage("Please set your Date of Birth in the 'Info' tab first so the system can validate your birthday leave.");
          setIsApplying(false);
          return;
        }
        const dobDate = new Date(record.dob);
        const leaveDate = new Date(leaveForm.startDate);
        if (dobDate.getDate() !== leaveDate.getDate() || dobDate.getMonth() !== leaveDate.getMonth()) {
          setErrorMessage(`Birthday leave can only be applied on your exact birth date (${record.dob.substring(5)}).`);
          setIsApplying(false);
          return;
        }
      }

      // Submit
      await leaveService.applyLeave({
        teacherId: record.id,
        teacherName: record.fullName,
        startDate: leaveForm.startDate,
        endDate: leaveForm.type === 'halfday' ? leaveForm.startDate : leaveForm.endDate,
        duration,
        type: leaveForm.type,
        remarks: leaveForm.remarks,
        documentUrl: leaveForm.documentUrl || null,
        documentName: leaveForm.documentName || null
      });

      // Reset
      setShowApplyLeaveModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while submitting your leave application.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light pb-24 relative overflow-hidden">
      {/* Notch */}
      <div className="h-6 w-32 bg-[#202020] absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-10 hidden sm:block"></div>

      {/* Top Header */}
      <div className="px-6 pt-12 pb-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold">Wednesday, 22 April</p>
          <h1 className="text-xl font-bold text-text-main mt-0.5">{record.fullName || 'New Teacher'}</h1>
          <div className="mt-1 flex items-center gap-2">
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary" 
              />
            </div>
            <span className="text-[9px] font-bold text-text-dim">{progress}% COMPLETE</span>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.div 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowProfileModal(true)}
            className="w-10 h-10 rounded-full bg-accent-pink ios-shadow border-2 border-white overflow-hidden cursor-pointer flex items-center justify-center"
          >
            {record.documents.passportPhoto.status === 'uploaded' ? (
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="text-white w-5 h-5" />
            )}
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

      {/* Upload Popup */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-3xl p-6 ios-shadow"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main">Upload Document</h4>
                  <p className="text-[10px] text-text-dim uppercase font-bold mt-1">
                    {selectedDocId ? (record.documents as any)[selectedDocId].name : ''}
                  </p>
                </div>
                
                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/30 transition-colors">
                  <Camera className="w-6 h-6 text-text-subtle" />
                  <span className="text-[10px] font-bold text-text-subtle">SELECT IMAGE OR PDF</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { setShowUploadModal(false); setSelectedDocId(null); }}
                    className="flex-1 py-3 bg-stone-100 text-text-main rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUploadDoc}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs"
                  >
                    Save Change
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[100] bg-bg-light overflow-y-auto no-scrollbar"
          >
            <div className="px-6 pt-12 pb-24">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text-main">Teacher Record</h2>
                <button onClick={() => setShowProfileModal(false)} className="p-2 bg-white rounded-full ios-shadow">
                  <X className="w-5 h-5 text-text-dim" />
                </button>
              </div>

              {/* Progress Bar in Modal */}
              <div className="ios-card mb-6 bg-primary/5 border-primary/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-primary uppercase">Profile Completion</span>
                  <span className="text-xs font-bold text-primary">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary" 
                  />
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-stone-100 rounded-xl mb-8 ios-shadow-sm overflow-x-auto no-scrollbar">
                {[
                  { id: 'info', label: 'Info' },
                  { id: 'performance', label: 'KPI' },
                  { id: 'leave', label: 'Leave' },
                  { id: 'training', label: 'Training' },
                  { id: 'kpi', label: 'Yearly' }
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setProfileTab(tab.id as any)}
                    className={`flex-none px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${profileTab === tab.id ? 'bg-white text-primary ios-shadow' : 'text-text-subtle'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {profileTab === 'info' && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Personal Information</h3>
                  
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Full Name</label>
                      <input 
                        type="text" 
                        value={record.fullName}
                        onChange={(e) => handleUpdateField('fullName', e.target.value)}
                        className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">IC Number</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 900101-01-1234"
                          value={record.icNumber}
                          onChange={(e) => handleUpdateField('icNumber', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Gender</label>
                        <select 
                          value={record.gender}
                          onChange={(e) => handleUpdateField('gender', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                        >
                          <option value="">Select</option>
                          <option value={Gender.MALE}>Male</option>
                          <option value={Gender.FEMALE}>Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Date of Birth</label>
                        <input 
                          type="date" 
                          value={record.dob}
                          onChange={(e) => handleUpdateField('dob', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Marital Status</label>
                        <select 
                          value={record.maritalStatus}
                          onChange={(e) => handleUpdateField('maritalStatus', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                        >
                          <option value="">Select</option>
                          {Object.values(MaritalStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Address</label>
                      <textarea 
                        rows={2}
                        value={record.address}
                        onChange={(e) => handleUpdateField('address', e.target.value)}
                        className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm resize-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Phone Number</label>
                        <input 
                          type="tel" 
                          value={record.phoneNumber}
                          onChange={(e) => handleUpdateField('phoneNumber', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Email</label>
                        <input 
                          type="email" 
                          value={record.email}
                          onChange={(e) => handleUpdateField('email', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest pt-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-3 pb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Contact Person</label>
                      <input 
                        type="text" 
                        value={record.emergencyContactName}
                        onChange={(e) => handleUpdateField('emergencyContactName', e.target.value)}
                        className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-subtle uppercase ml-1">Contact Number</label>
                      <input 
                        type="tel" 
                        value={record.emergencyContactNumber}
                        onChange={(e) => handleUpdateField('emergencyContactNumber', e.target.value)}
                        className="w-full p-3 bg-white rounded-xl border border-border-subtle ios-shadow focus:ring-1 focus:ring-primary focus:outline-none text-sm font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

              {profileTab === 'performance' && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Monthly Performance Detail</h3>
                  <div className="ios-card bg-white h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#BCCCDC" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#BCCCDC" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8 }} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="score" stroke="#BCCCDC" fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {logs.slice(0, 5).map(log => (
                      <div key={log.id} className="ios-card flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-primary">{log.category}</span>
                          <span className={`text-[10px] font-black ${log.amount > 0 ? 'text-primary' : 'text-accent-pink'}`}>
                            {log.amount > 0 ? '+' : ''}{log.amount}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-text-main">{log.criterion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profileTab === 'leave' && (
                <div className="space-y-6">
                  {/* Leave Dashboard Info */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Leave Balance & Quotas</h3>
                      <p className="text-[10px] text-text-dim">Apply and track leaves against your designated quotas</p>
                    </div>
                    <button
                      onClick={() => {
                        setErrorMessage('');
                        setLeaveForm({
                          type: 'annual',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: new Date().toISOString().split('T')[0],
                          remarks: '',
                          documentUrl: '',
                          documentName: ''
                        });
                        setShowApplyLeaveModal(true);
                      }}
                      className="px-4 py-2.5 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg ios-shadow hover:bg-opacity-90 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Apply for Leave
                    </button>
                  </div>

                  {/* Quotas grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'annual', name: 'Annual Leave', quota: 8, doc: 'Optional remarks' },
                      { type: 'medical', name: 'Medical Leave (MC)', quota: 14, doc: 'MC required' },
                      { type: 'unpaid', name: 'Unpaid Leave', quota: 8, doc: 'Justification letter' },
                      { type: 'maternity', name: 'Maternity Leave', quota: 98, doc: 'Certified medical report' },
                      { type: 'marriage', name: 'Marriage Leave', quota: 5, doc: 'Marriage cert / invitation' },
                      { type: 'compassionate', name: 'Compassionate Leave', quota: 2, doc: 'Death cert required' },
                      { type: 'umrah', name: 'Umrah Leave', quota: 14, doc: 'Itinerary required' },
                      { type: 'haji', name: 'Haji Leave', quota: 40, doc: 'Allocation letter' },
                      { type: 'birthday', name: 'Birthday Leave', quota: 1, doc: 'DOB validated' },
                      { type: 'halfday', name: 'Half Day Leave', quota: 2, doc: 'Resets monthly' }
                    ].map((spec) => {
                      const balance = getLeaveBalance(spec.type as LeaveType);
                      return (
                        <div key={spec.type} className="ios-card bg-white p-4 border border-border-subtle hover:scale-[1.01] transition-transform">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-text-main truncate pr-1" title={spec.name}>{spec.name}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-text-subtle uppercase truncate max-w-[80px]" title={spec.doc}>{spec.doc}</span>
                          </div>
                          
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-xl font-black text-primary">{balance.remaining}</span>
                            <span className="text-[10px] font-bold text-text-subtle">/ {spec.type === 'halfday' ? '2 max' : spec.quota} residual</span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 mt-3 pt-2 border-t border-stone-50 text-[8px] font-extrabold uppercase tracking-widest text-[#7A8A7A]">
                            <div>Taken: {balance.taken}d</div>
                            <div>Pending: {balance.pending}d</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Leave Application History */}
                  <div className="mt-8 space-y-4">
                    <h3 className="text-xs font-bold text-text-main uppercase tracking-widest">Application History ({leavesList.length})</h3>
                    
                    {leavesList.length === 0 ? (
                      <div className="text-center py-8 ios-card bg-stone-50/50">
                        <Calendar className="w-8 h-8 text-text-subtle/35 mx-auto mb-2" />
                        <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold">No Applications Filed Yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leavesList.map((leave) => (
                          <div key={leave.id} className="ios-card bg-white border border-border-subtle p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase text-primary">
                                {LEAVE_SPECS.find(s => s.type === leave.type)?.name || `${leave.type} Leave`}
                              </span>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                                leave.status === 'approved' ? 'bg-green-50 text-green-600' :
                                leave.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                'bg-yellow-50 text-yellow-600'
                              }`}>
                                {leave.status}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-text-main">
                              {leave.startDate} {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}
                            </p>
                            <p className="text-[10px] text-text-dim mt-1">
                              Duration: <span className="font-extrabold text-primary">{leave.duration} day(s)</span>
                            </p>

                            {leave.remarks && (
                              <p className="text-[10px] italic text-text-subtle mt-2 leading-relaxed bg-stone-50 p-2 rounded-lg">
                                &ldquo;{leave.remarks}&rdquo;
                              </p>
                            )}

                            {leave.documentName && (
                              <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg w-fit">
                                <FileText className="w-3.5 h-3.5" />
                                <a href={leave.documentUrl || '#'} target="_blank" rel="noreferrer" className="underline truncate max-w-[200px]">
                                  {leave.documentName}
                                </a>
                              </div>
                            )}

                            {leave.principalNotes && (
                              <div className="mt-3 pt-3 border-t border-stone-100">
                                <p className="text-[8px] font-black uppercase tracking-wider text-accent-pink">Principal Feedback</p>
                                <p className="text-[10px] font-bold text-text-dim mt-0.5 italic">&ldquo;{leave.principalNotes}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {profileTab === 'training' && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-text-subtle mb-4">
                    <ShieldCheck className="w-8 h-8 opacity-20" />
                  </div>
                  <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">No Training Records</h4>
                  <p className="text-[10px] text-text-dim mt-2 max-w-[200px]">CPD certifications and workshop attendance records for {new Date().getFullYear()} will be displayed here.</p>
                </div>
              )}

              {profileTab === 'kpi' && (
                <div className="space-y-4">
                   <div className="ios-card bg-stone-900 text-white overflow-hidden relative border-none">
                    <div className="absolute top-[-10px] right-[-10px] w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Final Yearly Assessment</h3>
                        <p className="text-2xl font-black mt-1">
                          {yearlyKpis.length > 0 ? yearlyKpis[0].rating : '--'}
                          <span className="text-xs font-bold text-stone-500 ml-2 uppercase">Rating</span>
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
                        <button 
                          onClick={() => pdfService.generateYearlyKpiReport(record, yearlyKpis[0])}
                          className="w-full py-3 bg-white text-stone-900 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5" /> Yearly Certificate PDF
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 font-medium relative z-10 italic">
                        Official assessment occurs at year-end. Maintain your current standing for a Distinction rating.
                      </p>
                    )}
                  </div>

                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest pt-4">Document Repository</h3>
                  <div className="space-y-3">
                    {(Object.values(record.documents) as TeacherDocument[]).map((doc) => (
                      <div key={doc.id} className="ios-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.status === 'uploaded' ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-text-main line-clamp-1">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {doc.status === 'uploaded' ? (
                            <div className="flex items-center gap-1">
                              <motion.button whileTap={{ scale: 0.9 }} className="p-1.5 bg-stone-50 rounded-lg text-text-dim hover:text-primary transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </motion.button>
                              <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { setSelectedDocId(doc.id); setShowUploadModal(true); }}
                                className="p-1.5 bg-stone-50 rounded-lg text-text-dim hover:text-primary transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5 text-blue-400" />
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleRemoveDoc(doc.id)} className="p-1.5 bg-stone-50 rounded-lg text-text-dim hover:text-red-500 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setSelectedDocId(doc.id); setShowUploadModal(true); }} className="p-1 px-3 bg-primary text-white rounded-lg text-[9px] font-bold uppercase">
                              Upload
                            </motion.button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setShowProfileModal(false)}
                className="w-full mt-10 py-4 bg-primary text-white rounded-2xl font-bold ios-shadow"
              >
                Save Record
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAssignment && (
          <DutyIndividualPage 
            assignment={selectedAssignment} 
            onBack={() => setSelectedAssignment(null)} 
            currentTeacherId={record.id}
            isAdmin={false}
            onUpdate={() => {
              dutyService.getAssignment(selectedAssignment.id).then(ass => ass && setSelectedAssignment(ass));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewingFullSchedule && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] bg-bg-light overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white border-b border-border-subtle ios-shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewingFullSchedule(false)} className="p-2 bg-stone-50 rounded-full ios-shadow-sm active:scale-90 transition-transform">
                  <ChevronLeft className="w-5 h-5 text-text-main" />
                </button>
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest text-text-main">Duty Schedule</h3>
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Global View</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                <button 
                  onClick={() => setDutyViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${dutyViewMode === 'list' ? 'bg-stone-900 text-white shadow-lg' : 'text-text-subtle'}`}
                >
                  <ClipboardList className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDutyViewMode('calendar')}
                  className={`p-1.5 rounded-lg transition-all ${dutyViewMode === 'calendar' ? 'bg-stone-900 text-white shadow-lg' : 'text-text-subtle'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-white border-b border-border-subtle flex items-center justify-center">
              <div className="flex items-center gap-4 bg-stone-50 px-4 py-2 rounded-2xl border border-border-subtle ios-shadow-sm">
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1"><ChevronLeft className="w-4 h-4 text-text-subtle" /></button>
                <span className="text-[11px] font-black w-32 text-center uppercase tracking-tight">{new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1"><ChevronRight className="w-4 h-4 text-text-subtle" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {dutyViewMode === 'list' ? (
                <div className="absolute inset-0 overflow-y-auto no-scrollbar p-6 space-y-3">
                  {allAssignments.map((ass) => (
                    <motion.div 
                      key={ass.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAssignment(ass)}
                      className={`bg-white p-5 rounded-2xl flex items-center justify-between ios-shadow border-l-4 ${ass.teacherIds.includes(record.id) ? 'border-primary' : 'border-stone-200'} border-y border-r border-border-subtle cursor-pointer`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-stone-50 text-text-subtle`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-text-main text-sm">{ass.taskName}</h4>
                          <p className="text-text-dim text-[10px] font-bold mt-1 flex items-center gap-2 uppercase tracking-wide">
                            <MapPin className="w-3 h-3 text-primary/60" /> {ass.locationName} • {ass.timeStart}
                          </p>
                        </div>
                      </div>
                      <div className="flex -space-x-1.5">
                        {ass.teacherIds.map((tId, idx) => (
                          <div key={idx} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black uppercase ${tId === record.id ? 'bg-primary text-white shadow-lg' : 'bg-stone-100 text-text-dim'}`}>
                            {tId.substring(0, 1)}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                  {allAssignments.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                      <ClipboardList className="w-12 h-12 mb-4" />
                      <p className="text-xs font-bold uppercase">No assignments found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0">
                  <TaskCalendar 
                    date={selectedDate}
                    assignments={allAssignments}
                    locations={locations}
                    teachers={teachers}
                    onSelectAssignment={setSelectedAssignment}
                    onAddLocation={() => {}}
                    onAddAssignment={() => {}}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6 space-y-6">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Quick Actions Shortcuts */}
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setActiveTab('reports')} 
                className="bg-white p-3.5 rounded-2xl ios-shadow border border-border-subtle flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] font-black uppercase text-text-main text-center leading-tight tracking-wider">File Report</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('leaves')} 
                className="bg-white p-3.5 rounded-2xl ios-shadow border border-border-subtle flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#E5ECE5] flex items-center justify-center text-primary">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] font-black uppercase text-text-main text-center leading-tight tracking-wider">Leaves</span>
              </button>

              <button 
                onClick={() => setIsViewingFullSchedule(true)} 
                className="bg-white p-3.5 rounded-2xl ios-shadow border border-border-subtle flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] font-black uppercase text-text-main text-center leading-tight tracking-wider">Schedules</span>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setActiveTab('leaves')}
                className="bg-white p-4 rounded-2xl ios-shadow border border-border-subtle cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider">Leave Balance</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                </div>
                <p className="text-xl font-bold text-primary">
                  {getLeaveBalance('annual').remaining + getLeaveBalance('medical').remaining} <span className="text-xs font-normal text-text-subtle">Days Left</span>
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl ios-shadow border border-border-subtle">
                <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mb-1">Monthly KPI Delta</p>
                <p className={`text-xl font-bold ${monthlyScoreSum >= 0 ? 'text-secondary' : 'text-accent-pink'}`}>
                  {monthlyScoreSum >= 0 ? '+' : ''}{monthlyScoreSum} <span className="text-xs font-normal text-text-subtle">Pts</span>
                </p>
              </div>
            </div>

            {/* Today's Tasks */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Upcoming Tasks</h3>
                <button 
                  onClick={() => {
                    setIsViewingFullSchedule(true);
                    setDutyViewMode('calendar');
                  }}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center gap-1"
                >
                  More <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-3">
                {assignments.length > 0 ? (
                  assignments.slice(0, 2).map((ass) => (
                    <motion.div 
                      key={ass.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAssignment(ass)}
                      className={`bg-white p-4 rounded-xl flex items-center justify-between ios-shadow border-l-4 border-primary border-y border-r border-border-subtle cursor-pointer ${ass.status === 'completed' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ass.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-stone-50 text-text-subtle'}`}>
                          {ass.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-main text-sm">{ass.taskName}</h4>
                          <p className="text-text-dim text-[10px] font-medium mt-0.5 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" /> {ass.locationName} • {ass.timeStart}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-subtle" />
                    </motion.div>
                  ))
                ) : (
                  <div className="py-8 bg-white rounded-3xl border border-dashed border-stone-200 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-[10px] font-black text-text-subtle uppercase">Zero assignments today</p>
                  </div>
                )}
              </div>
            </section>

            {/* Training Feature */}
            <section>
              <div className="bg-accent-tan p-5 rounded-3xl ios-shadow border border-white/20">
                <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-widest mb-2">Upcoming Training</h3>
                <p className="text-[11px] text-[#A69988] leading-relaxed font-medium">
                  Digital Curriculum Workshop tomorrow at 2:00 PM in the Main Auditorium.
                </p>
              </div>
            </section>

            {/* Notification Preview */}
            <section className="pb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Recent Update</h3>
              </div>
              <div className="bg-white p-4 rounded-2xl ios-shadow border border-border-subtle flex items-start gap-4">
                <div className="w-10 h-10 bg-accent-pink/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="text-accent-pink w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-text-main">Performance Update</h4>
                    <span className="text-[10px] text-text-subtle font-medium">Just now</span>
                  </div>
                  <p className="text-text-dim text-xs mt-0.5 line-clamp-1 italic">New merit marks awarded for Professionalism...</p>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-24"
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">Faculty Safety & Support</h3>
                <h2 className="text-2xl font-bold text-text-main tracking-tight">Incident Reporting</h2>
              </div>
            </div>

            {/* Sub Tabs Segment Control */}
            <div className="bg-stone-100 p-1 rounded-xl flex items-center justify-between border border-border-subtle">
              <button
                onClick={() => setReportsSubTab('create')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                  reportsSubTab === 'create'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-text-subtle hover:text-text-main'
                }`}
              >
                File a Report
              </button>
              <button
                onClick={() => setReportsSubTab('history')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                  reportsSubTab === 'history'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-text-subtle hover:text-text-main'
                }`}
              >
                Report History ({reportsList.length})
              </button>
            </div>

            {reportsSubTab === 'create' ? (
              <div className="space-y-5 bg-white p-5 rounded-2xl border border-border-subtle ios-shadow">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Select Report Category</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-border-subtle px-3 py-3 rounded-xl text-xs font-semibold text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
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

                {/* Description Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Provide specific details of the incident, including dates, locations, and any direct impact..."
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    rows={5}
                    className="w-full bg-stone-50 border border-border-subtle px-4 py-3 rounded-xl text-xs text-text-main placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* Photo Upload Area */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Attach Photo/Evidence</label>
                  
                  {reportPhoto ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border-subtle group">
                      <img src={reportPhoto} alt="Evidence" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => setReportPhoto(null)}
                          className="bg-accent-pink text-white p-2.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        onClick={() => setReportPhoto(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Real File Input Button */}
                      <label className="flex flex-col items-center justify-center p-6 border border-dashed border-border-subtle rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer text-center">
                        <Upload className="w-5 h-5 text-text-subtle mb-1.5 animate-pulse" />
                        <span className="text-[10px] font-bold text-text-main">From Gallery</span>
                        <span className="text-[8px] text-text-dim mt-0.5">Drag-and-drop or select</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setReportPhoto(event.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {/* Mock Simulated Photo Button */}
                      <button
                        type="button"
                        onClick={() => {
                          let mockUrl = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600';
                          if (reportCategory.includes('IT')) {
                            mockUrl = 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&q=80&w=600';
                          } else if (reportCategory.includes('Material')) {
                            mockUrl = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600';
                          } else if (reportCategory.includes('Safety')) {
                            mockUrl = 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=600';
                          } else if (reportCategory.includes('Stress') || reportCategory.includes('Staff')) {
                            mockUrl = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=600';
                          }
                          setReportPhoto(mockUrl);
                        }}
                        className="flex flex-col items-center justify-center p-6 border border-dashed border-border-subtle rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors text-center cursor-pointer"
                      >
                        <Camera className="w-5 h-5 text-primary mb-1.5" />
                        <span className="text-[10px] font-bold text-primary">Simulate Camera</span>
                        <span className="text-[8px] text-text-dim mt-0.5">High fidelity mock mock-up</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit Trigger Button */}
                <button
                  type="button"
                  disabled={!reportDesc.trim() || isSubmittingReport}
                  onClick={() => setShowSubmitConfirm(true)}
                  className={`w-full py-4 text-xs font-black text-white rounded-xl border border-transparent shadow-md flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${
                    !reportDesc.trim() || isSubmittingReport
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                      : 'bg-primary hover:opacity-95 active:scale-98 cursor-pointer'
                  }`}
                >
                  {isSubmittingReport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Submit Incident Report
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* History Scrollable View */}
                {reportsList.length > 0 ? (
                  reportsList.map((rep) => {
                    let statusColor = 'bg-stone-100 text-stone-600 border-stone-200/50';
                    if (rep.status === 'Under Review') {
                      statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (rep.status === 'Action Taken') {
                      statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (rep.status === 'Resolved') {
                      statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    }

                    let priorityColor = 'bg-gray-100 text-gray-600';
                    if (rep.priority === 'High') {
                      priorityColor = 'bg-accent-pink/10 text-accent-pink';
                    } else if (rep.priority === 'Medium') {
                      priorityColor = 'bg-primary/10 text-primary';
                    }

                    return (
                      <motion.div
                        key={rep.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-5 rounded-2xl border border-border-subtle ios-shadow space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-text-main leading-snug">{rep.category}</h4>
                            <p className="text-[9px] text-text-dim font-bold uppercase tracking-wider mt-1">
                              Submitted: {new Date(rep.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {rep.status}
                            </span>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor}`}>
                              {rep.priority} PRIORITY
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-text-dim whitespace-pre-wrap leading-relaxed">
                          {rep.description}
                        </p>

                        {rep.photoUrl && (
                          <div className="w-1/2 aspect-video rounded-lg overflow-hidden border border-border-subtle mt-2">
                            <img src={rep.photoUrl} alt="Incident Attachment" className="w-full h-full object-cover animate-fade-in" />
                          </div>
                        )}

                        {rep.managementNotes && (
                          <div className="bg-stone-50 border-l-4 border-primary p-3 rounded-r-xl space-y-1">
                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Principal Administration Note</p>
                            <p className="text-[11px] text-text-dim italic leading-relaxed font-semibold">
                              "{rep.managementNotes}"
                            </p>
                            <p className="text-[8px] text-text-dim/80 font-medium">
                              Last Action: {new Date(rep.lastUpdated).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-border-subtle p-12 text-center">
                    <FileText className="w-8 h-8 text-text-dim mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-text-main">No incident reports filed yet</p>
                    <p className="text-[10px] text-text-subtle mt-1">When you file an incident report, its status and history will appear here in real-time.</p>
                  </div>
                )}
              </div>
            )}

            {/* Confirmation Dialog Popup Modal */}
            <AnimatePresence>
              {showSubmitConfirm && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white w-full max-w-sm rounded-3xl p-6 ios-shadow border border-border-subtle space-y-4"
                  >
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-text-main">Submit Incident Report?</h3>
                      <p className="text-xs text-text-dim leading-relaxed">
                        Are you sure you want to finalize and submit this incident report to the administration? This will notify school leadership immediately.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowSubmitConfirm(false)}
                        className="flex-1 py-3 text-xs font-bold text-text-subtle bg-stone-50 border border-border-subtle rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setShowSubmitConfirm(false);
                          setIsSubmittingReport(true);
                          try {
                            const isHighPriority = 
                              reportCategory.includes('Safety') || 
                              reportCategory.includes('Harassment') || 
                              reportCategory.includes('Bullying');

                            await reportService.createReport({
                              teacherId: record.id,
                              teacherName: record.fullName,
                              category: reportCategory,
                              description: reportDesc,
                              photoUrl: reportPhoto,
                              status: 'Submitted',
                              priority: isHighPriority ? 'High' : 'Medium',
                              managementNotes: ''
                            });

                            setReportDesc('');
                            setReportPhoto(null);
                            setReportsSubTab('history');
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsSubmittingReport(false);
                          }
                        }}
                        className="flex-1 py-3 text-xs font-black text-white bg-primary rounded-xl hover:opacity-95 shadow-md cursor-pointer"
                      >
                        Yes, Submit
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'training' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">Faculty Connect & CPD</h3>
                <h2 className="text-2xl font-bold text-text-main tracking-tight">Postings & Training</h2>
              </div>
            </div>
            
            <TrainingModule 
              currentUserId={record.id}
              currentUserFullName={record.fullName}
              currentUserRole="teacher"
            />
          </motion.div>
        )}

        {activeTab === 'performance' && (
          <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="space-y-6"
          >
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">Assessment Year {new Date().getFullYear()}</h3>
                <h2 className="text-2xl font-bold text-text-main tracking-tight">KPI Dashboard</h2>
              </div>
              <button 
                onClick={() => pdfService.generatePerformanceReport(record, logs)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center ios-shadow text-primary"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>

            <div className="ios-card bg-stone-900 text-white border-none relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase opacity-80">Official Rating</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-4xl font-bold">{yearlyKpis.length > 0 ? yearlyKpis[0].rating : 'TBD'}</h4>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    {yearlyKpis.length > 0 ? `Score: ${yearlyKpis[0].finalScore.toFixed(1)}` : 'In Progress'}
                  </span>
                </div>
                <p className="text-[11px] mt-4 opacity-70 font-medium">
                  {yearlyKpis.length > 0 
                    ? `Your final assessment for ${yearlyKpis[0].year} has been finalized. Download for your record.`
                    : `Based on current data, your projected status is EXCELLENT. Final assessment occurs year-end.`}
                </p>
                {yearlyKpis.length > 0 && (
                  <button 
                    onClick={() => pdfService.generateYearlyKpiReport(record, yearlyKpis[0])}
                    className="mt-4 w-full py-3 bg-white text-stone-900 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Yearly Certificate
                  </button>
                )}
              </div>
              <Target className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
            </div>

            {/* Performance Chart */}
            <div className="ios-card bg-white h-[260px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">Monthly Performance Trend</h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-secondary" />
                  <span className="text-[9px] font-bold text-secondary">+12.4% THIS MONTH</span>
                </div>
              </div>
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#BCCCDC" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#BCCCDC" stopOpacity={0}/>
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
                    <Area type="monotone" dataKey="score" stroke="#BCCCDC" fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-bold text-text-main uppercase tracking-widest">Monthly Summaries</h3>
                <span className="text-[9px] font-bold text-text-dim">VIEW ALL</span>
              </div>
              {/* If no summaries yet, show example */}
              {(summaries.length > 0 ? summaries : [
                { month: '2026-04', totalScore: 88, status: 'Excellent' },
                { month: '2026-03', totalScore: 82, status: 'Good' }
              ]).map((summary, i) => (
                <div key={i} className="ios-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-text-dim font-bold text-xs">
                      {new Date(summary.month + '-01').toLocaleDateString(undefined, { month: 'short' })}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">Performance Report</p>
                      <p className="text-[10px] text-text-dim">Final Score: {summary.totalScore}% • {summary.status}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => pdfService.generatePerformanceReport(record, logs.filter(l => {
                      if (!l.timestamp) return false;
                      const d = new Date(l.timestamp.seconds * 1000);
                      const [y, m] = summary.month.split('-');
                      return d.getFullYear() === parseInt(y) && d.getMonth() === (parseInt(m) - 1);
                    }))}
                    className="p-2 hover:bg-stone-50 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 text-text-subtle" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pb-8">
               <h3 className="text-[10px] font-bold text-text-main uppercase tracking-widest mt-8 mb-4 px-1">Recent Merit Logs</h3>
               <div className="space-y-3">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="bg-white/60 p-4 rounded-2xl border border-border-subtle flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.amount > 0 ? 'bg-primary/10 text-primary' : 'bg-accent-pink/10 text-accent-pink'}`}>
                      {log.amount > 0 ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs text-text-main">{log.category}</h4>
                          <div className="flex items-center gap-2">
                             <p className="text-[9px] text-primary font-bold uppercase">{log.criterion}</p>
                             <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${log.severity === 'Critical' ? 'bg-accent-pink text-white' : 'bg-gray-100 text-text-dim'}`}>
                               {log.severity}
                             </span>
                          </div>
                        </div>
                        <span className="text-[9px] text-text-subtle font-medium">
                          {new Date(log.timestamp.seconds * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      {log.reason && <p className="text-text-dim text-[11px] mt-1 italic leading-relaxed">"{log.reason}"</p>}
                    </div>
                    <span className={`text-[11px] font-black ${log.amount > 0 ? 'text-primary' : 'text-accent-pink'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount}
                    </span>
                  </div>
                ))}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'notify' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold text-text-main">Your Alerts</h2>
            
            <div className="space-y-4">
              {[
                { id: '1', title: 'KPI Milestone', message: 'You have maintained an Excellent status for 3 consecutive months!', timestamp: { seconds: Date.now()/1000 }, type: 'performance' },
                { id: '2', title: 'System Update', message: 'Teacher Performance module has been updated with severity levels.', timestamp: { seconds: (Date.now()-86400000)/1000 }, type: 'admin' }
              ].map((notif) => (
                <div key={notif.id} className="ios-card bg-white p-4 border border-border-subtle flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'performance' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    {notif.type === 'performance' ? <Target className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-text-main">{notif.title}</h4>
                      <span className="text-[9px] text-text-subtle font-medium">
                        {new Date(notif.timestamp.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-text-dim text-[11px] mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <section className="bg-accent-tan/5 p-6 rounded-3xl border border-accent-tan/20 mt-8">
              <h3 className="text-xs font-bold text-[#8B7E6D] uppercase tracking-widest mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Professional Standings
              </h3>
              <p className="text-[11px] text-[#A69988] leading-relaxed font-medium italic">
                Your current professional ethics score remains in the top 10% of the faculty. Please continue to adhere to the school SOP.
              </p>
            </section>
          </motion.div>
        )}

        {activeTab === 'leaves' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-20"
          >
            {/* Leave Dashboard Info */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-text-main">Leave Balance & Quotas</h2>
                <p className="text-[10px] text-text-dim mt-0.5 uppercase tracking-wider font-bold">Apply and track leaves against your designated quotas</p>
              </div>
              <button
                onClick={() => {
                  setErrorMessage('');
                  setLeaveForm({
                    type: 'annual',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    remarks: '',
                    documentUrl: '',
                    documentName: ''
                  });
                  setShowApplyLeaveModal(true);
                }}
                className="px-4 py-2.5 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg ios-shadow hover:bg-opacity-90 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Apply for Leave
              </button>
            </div>

            {/* Quotas grid */}
            <div className="grid grid-cols-2 gap-3">
              {LEAVE_SPECS.map((spec) => {
                const balance = getLeaveBalance(spec.type as LeaveType);
                return (
                  <div key={spec.type} className="ios-card bg-white p-4 border border-[#E9ECE9] hover:scale-[1.01] transition-all">
                    <div className="flex justify-between items-start mb-1 gap-1">
                      <span className="text-[10px] font-black text-text-main truncate pr-1" title={spec.name}>{spec.name}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-text-subtle uppercase truncate max-w-[80px]" title={spec.docLabel}>{spec.docLabel}</span>
                    </div>
                    
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-black text-primary">{balance.remaining}</span>
                      <span className="text-[10px] font-bold text-text-subtle">/ {spec.type === 'halfday' ? '2 max' : spec.quota} residual</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-3 pt-2 border-t border-stone-100 text-[8px] font-extrabold uppercase tracking-widest text-[#7A8A7A]">
                      <div>Taken: {balance.taken}d</div>
                      <div>Pending: {balance.pending}d</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leave Application History */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Application History ({leavesList.length})
              </h3>
              
              {leavesList.length === 0 ? (
                <div className="text-center py-12 ios-card bg-stone-50/50 border border-dashed border-stone-200">
                  <Calendar className="w-10 h-10 text-text-subtle/35 mx-auto mb-2" />
                  <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold">No Applications Filed Yet</p>
                  <p className="text-[9px] text-text-subtle mt-1">If you apply for leave, your application status will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leavesList.map((leave) => (
                    <div key={leave.id} className="ios-card bg-white border border-[#E9ECE9] p-4 relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary/70"></div>
                      <div className="flex justify-between items-center mb-2 pl-1.5">
                        <span className="text-[10px] font-black uppercase text-primary">
                          {LEAVE_SPECS.find(s => s.type === leave.type)?.name || `${leave.type} Leave`}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          leave.status === 'approved' ? 'bg-green-50 text-green-600' :
                          leave.status === 'rejected' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {leave.status}
                        </span>
                      </div>

                      <div className="pl-1.5 space-y-1.5">
                        <p className="text-xs font-bold text-text-main">
                          Date Period: {leave.startDate} {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}
                        </p>
                        <p className="text-[10px] text-text-dim">
                          Duration: <span className="font-extrabold text-primary">{leave.duration} day(s)</span>
                        </p>

                        {leave.remarks && (
                          <p className="text-[10px] italic text-text-subtle mt-2 bg-stone-50 p-2 rounded-lg leading-relaxed border border-stone-100">
                            &ldquo;{leave.remarks}&rdquo;
                          </p>
                        )}

                        {leave.documentName && (
                          <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg w-fit">
                            <FileText className="w-3.5 h-3.5" />
                            <a href={leave.documentUrl || '#'} target="_blank" rel="noreferrer" className="underline truncate max-w-[200px]">
                              {leave.documentName}
                            </a>
                          </div>
                        )}

                        {leave.principalNotes && (
                          <div className="mt-3 pt-3 border-t border-stone-50">
                            <p className="text-[8px] font-black uppercase tracking-wider text-accent-pink">Principal Feedback</p>
                            <p className="text-[10px] font-bold text-text-dim mt-0.5 italic">&ldquo;{leave.principalNotes}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-main">Teacher Profile</h2>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="text-[10px] font-bold text-primary uppercase tracking-widest px-4 py-2 bg-primary/5 rounded-full"
              >
                Edit Complete Profile
              </button>
            </div>

            <div className="ios-card space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-accent-pink overflow-hidden border-2 border-white ios-shadow">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">{record.fullName}</h3>
                  <p className="text-xs text-text-dim uppercase tracking-wider font-bold">{record.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-stone-50 p-3 rounded-xl border border-border-subtle">
                  <p className="text-[9px] text-text-dim uppercase font-bold">Email</p>
                  <p className="text-xs font-medium text-text-main truncate">{record.email}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-border-subtle">
                  <p className="text-[9px] text-text-dim uppercase font-bold">Phone</p>
                  <p className="text-xs font-medium text-text-main">{record.phoneNumber || 'Not set'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-text-main uppercase tracking-widest px-1">Quick Overview</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="ios-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-main">Documents</p>
                      <p className="text-[10px] text-text-dim">{progress}% Verified</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-subtle" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {showApplyLeaveModal && (
          <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 ios-shadow border border-border-subtle max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-text-main">Apply for Leave</h3>
                  <p className="text-[9px] text-text-dim uppercase tracking-wider font-extrabold text-primary">New Application</p>
                </div>
                <button 
                  onClick={() => setShowApplyLeaveModal(false)}
                  className="p-2 bg-stone-50 rounded-full"
                >
                  <X className="w-4 h-4 text-text-dim" />
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
                {/* Leave Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-[#7A8A7A] uppercase tracking-wider block">Leave Type</label>
                  <select
                    value={leaveForm.type}
                    onChange={(e) => {
                      const val = e.target.value as LeaveType;
                      setLeaveForm(prev => ({
                        ...prev,
                        type: val,
                        endDate: val === 'halfday' ? prev.startDate : prev.endDate
                      }));
                    }}
                    className="w-full h-12 px-4 bg-bg-input rounded-xl border-none text-xs text-text-main focus:ring-1 focus:ring-primary focus:outline-none appearance-none font-bold"
                  >
                    {LEAVE_SPECS.map(spec => (
                      <option key={spec.type} value={spec.type}>
                        {spec.name} ({getLeaveBalance(spec.type as LeaveType).remaining} left)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#7A8A7A] uppercase tracking-wider block">
                      {leaveForm.type === 'halfday' ? 'Leave Date' : 'Start Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLeaveForm(prev => ({
                          ...prev,
                          startDate: val,
                          endDate: prev.type === 'halfday' ? val : prev.endDate
                        }));
                      }}
                      className="w-full h-12 px-3 bg-bg-input rounded-xl border-none text-xs text-text-main focus:ring-1 focus:ring-primary focus:outline-none font-bold"
                    />
                  </div>

                  {leaveForm.type !== 'halfday' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#7A8A7A] uppercase tracking-wider block">End Date</label>
                      <input
                        type="date"
                        required
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full h-12 px-3 bg-bg-input rounded-xl border-none text-xs text-text-main focus:ring-1 focus:ring-primary focus:outline-none font-bold"
                      />
                    </div>
                  )}
                </div>

                {/* Dynamic Calculated Duration */}
                <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-2xl flex justify-between items-center text-xs font-bold text-primary">
                  <span>Calculated Duration:</span>
                  <span className="font-extrabold uppercase tracking-wide">
                    {leaveForm.type === 'halfday' ? '0.5 Day' : (() => {
                      if (!leaveForm.startDate || !leaveForm.endDate) return '0 Days';
                      const start = new Date(leaveForm.startDate);
                      const end = new Date(leaveForm.endDate);
                      if (end < start) return 'Invalid Dates';
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      return `${days} Day(s)`;
                    })()}
                  </span>
                </div>

                {/* File Upload for Supporting Documents */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-[#7A8A7A] uppercase tracking-wider block">
                    Supporting Document
                    {LEAVE_SPECS.find(s => s.type === leaveForm.type)?.docRequired && (
                      <span className="text-accent-pink ml-1 font-bold">* Mandatory</span>
                    )}
                  </span>
                  
                  <div className="border-2 border-dashed border-stone-200 rounded-2xl p-4 text-center cursor-pointer hover:bg-stone-50/50 transition-colors relative">
                    <input
                      type="file"
                      id="leave-attachment-input"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLeaveForm(prev => ({
                            ...prev,
                            documentName: file.name,
                            documentUrl: `https://example.com/mock-attachments/${file.name}`
                          }));
                        }
                      }}
                    />
                    
                    {leaveForm.documentName ? (
                      <div className="space-y-1 text-primary">
                        <FileText className="w-8 h-8 mx-auto" />
                        <p className="text-xs font-bold truncate max-w-[200px] mx-auto">{leaveForm.documentName}</p>
                        <p className="text-[8px] uppercase tracking-widest text-text-subtle">Click or drag to change file</p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-text-subtle">
                        <Upload className="w-8 h-8 mx-auto opacity-40" />
                        <p className="text-[11px] font-bold">Upload MC / supporting files</p>
                        <p className="text-[8px] uppercase tracking-widest leading-relaxed">
                          {LEAVE_SPECS.find(s => s.type === leaveForm.type)?.docLabel || 'Optional remarks file'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-[#7A8A7A] uppercase tracking-wider block">Remarks / Justification</label>
                  <textarea
                    placeholder="Provide details/reasoning for your leave context..."
                    value={leaveForm.remarks}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full h-20 p-3 bg-bg-input rounded-xl border-none text-xs text-text-main focus:ring-1 focus:ring-primary focus:outline-none font-bold resize-none leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <button
                  type="submit"
                  disabled={isApplying}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest ios-shadow flex items-center justify-center gap-2 hover:bg-opacity-95 transition-all disabled:opacity-50"
                >
                  {isApplying ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </motion.div>
          </div>
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
