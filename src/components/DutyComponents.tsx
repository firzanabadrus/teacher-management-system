import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Camera, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight,
  ArrowLeftRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Copy,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DutyAssignment, DutyChecklistItem, DutyTask, DutyLocation, TeacherRecord } from '../types';
import { dutyService } from '../lib/dutyService';

interface ChecklistItemProps {
  item: DutyChecklistItem;
  assignmentId: string;
  canComplete: boolean;
  onUpdate: () => void;
  [key: string]: any; // Allow React key
}

export function ChecklistItem({ item, assignmentId, canComplete, onUpdate }: ChecklistItemProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const handleComplete = async () => {
    if (!canComplete) return;
    if (item.isCompleted) return;
    
    // Simulate photo capture for demo, in real app it opens camera
    setIsCapturing(true);
    setTimeout(async () => {
      await dutyService.updateChecklistItem(assignmentId, item.id, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=300');
      setIsCapturing(false);
      onUpdate();
    }, 1500);
  };

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${item.isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-white border-border-subtle shadow-sm'}`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={handleComplete}
          className={`flex-shrink-0 ${item.isCompleted ? 'text-primary' : canComplete ? 'text-text-subtle hover:text-primary' : 'text-gray-200 cursor-not-allowed'}`}
        >
          {item.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </button>
        <div>
          <p className={`text-sm font-bold ${item.isCompleted ? 'text-primary line-through opacity-70' : 'text-text-main'}`}>
            {item.description}
          </p>
          {item.completedAt && (
            <p className="text-[9px] font-bold text-text-dim uppercase mt-0.5">
              DONE AT {new Date(item.completedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
      
      {item.isCompleted ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary/20">
          <img src={item.photoUrl} alt="Proof" className="w-full h-full object-cover" />
        </div>
      ) : isCapturing ? (
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <Camera className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
      ) : canComplete && (
        <button onClick={handleComplete} className="p-2 bg-stone-50 rounded-lg text-text-subtle">
          <Camera className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function DutyIndividualPage({ assignment, onBack, currentTeacherId, onUpdate, isAdmin }: { assignment: DutyAssignment, onBack: () => void, currentTeacherId: string, onUpdate: () => void, isAdmin?: boolean }) {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  
  const now = new Date();
  const startTime = new Date(`${assignment.date}T${assignment.timeStart}`);
  const endTime = new Date(`${assignment.date}T${assignment.timeEnd}`);
  
  // Can complete photo 30m before until 30m after
  const canCompleteStart = new Date(startTime.getTime() - 30 * 60000);
  const canCompleteEnd = new Date(endTime.getTime() + 30 * 60000);
  const canComplete = now >= canCompleteStart && now <= canCompleteEnd;
  
  // Can swap up to 30m before
  const canSwapEnd = new Date(startTime.getTime() - 30 * 60000);
  const canSwap = now <= canSwapEnd;

  const todos = assignment.checklist.filter(i => !i.isCompleted);
  const completed = assignment.checklist.filter(i => i.isCompleted);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      await dutyService.updateAssignment(assignment.id, { status: 'pending' }); // For demo, let's just delete
      await dutyService.deleteAssignment(assignment.id);
      onBack();
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-bg-light z-[150] overflow-y-auto no-scrollbar"
    >
      <div className="px-6 pt-12 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-white rounded-full ios-shadow">
              <ArrowLeftRight className="w-5 h-5 text-text-dim rotate-180" />
            </button>
            <h2 className="text-xl font-bold text-text-main line-clamp-1">{assignment.taskName}</h2>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => {}} // TODO: Edit
                className="p-3 bg-white rounded-full ios-shadow text-text-subtle"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {}} // TODO: Duplicate
                className="p-3 bg-white rounded-full ios-shadow text-text-subtle"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-3 bg-white rounded-full ios-shadow text-accent-pink"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="ios-card bg-stone-900 text-white mb-8 border-none overflow-hidden relative">
          <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{assignment.locationName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-lg font-bold">{assignment.timeStart} - {assignment.timeEnd}</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${assignment.status === 'completed' ? 'bg-primary text-white' : 'bg-white/10 text-white/50'}`}>
                {assignment.status}
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex -space-x-2">
                {assignment.teacherIds.map((tId, idx) => (
                  <div key={idx} className="w-8 h-8 rounded-full bg-stone-700 border-2 border-stone-900 flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden">
                    {tId.substring(0, 2)}
                  </div>
                ))}
              </div>
              {canSwap && (
                <button 
                  onClick={() => setShowSwapModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  <ArrowLeftRight className="w-3 h-3" /> Swap Duty
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {todos.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3 ml-1">To Do ({todos.length})</h3>
              <div className="grid gap-3">
                {todos.map(item => (
                  <ChecklistItem key={item.id} item={item} assignmentId={assignment.id} canComplete={canComplete} onUpdate={onUpdate} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3 ml-1">Completed ({completed.length})</h3>
              <div className="grid gap-3">
                {completed.map(item => (
                  <ChecklistItem key={item.id} item={item} assignmentId={assignment.id} canComplete={canComplete} onUpdate={onUpdate} />
                ))}
              </div>
            </section>
          )}

          {!canComplete && todos.length > 0 && (
            <div className="p-4 bg-accent-tan/30 rounded-2xl border border-accent-tan/50 mt-4">
              <p className="text-[11px] text-[#8B7E6D] leading-relaxed font-medium text-center italic">
                Photo uploads are only available from 30 minutes before until 30 minutes after the task.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
