import { useState, useRef } from 'react';
import { 
  Users, 
  MapPin, 
  Plus,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { DutyAssignment, DutyLocation, TeacherRecord } from '../types';

interface TaskCalendarProps {
  date: string;
  assignments: DutyAssignment[];
  locations: DutyLocation[];
  teachers: TeacherRecord[];
  onSelectAssignment: (assignment: DutyAssignment) => void;
  onAddLocation: () => void;
  onAddAssignment: (time: string, headerId: string) => void;
}

export function TaskCalendar({ assignments, locations, teachers, onSelectAssignment, onAddLocation, onAddAssignment }: TaskCalendarProps) {
  const [viewMode, setViewMode] = useState<'location' | 'teacher'>('location');
  const scrollRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 7pm
  const headers = viewMode === 'location' ? locations : teachers;

  const getAssignmentsForCell = (headerId: string, hour: number) => {
    return assignments.filter(a => {
      const startHour = parseInt(a.timeStart.split(':')[0]);
      const headerMatch = viewMode === 'location' ? a.locationId === headerId : a.teacherIds.includes(headerId);
      return headerMatch && startHour === hour;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl ios-shadow overflow-hidden border border-border-subtle">
      {/* Calendar Header */}
      <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-stone-50">
        <div className="flex bg-white p-1 rounded-xl ios-shadow-sm border border-border-subtle">
          <button 
            onClick={() => setViewMode('location')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'location' ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' : 'text-text-subtle'}`}
          >
            <MapPin className="w-3 h-3" /> Locations
          </button>
          <button 
            onClick={() => setViewMode('teacher')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'teacher' ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' : 'text-text-subtle'}`}
          >
            <Users className="w-3 h-3" /> Teachers
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto no-scrollbar relative" ref={scrollRef}>
        <div className="inline-grid min-w-full">
          {/* Header Row */}
          <div className="flex min-w-max sticky top-0 z-30 bg-stone-50 border-b border-border-subtle h-12">
            <div className="sticky left-0 z-40 bg-stone-50 border-r border-border-subtle w-[60px] flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-text-subtle uppercase">Time</span>
            </div>
            <div className="flex">
              {headers.map(h => (
                <div key={h.id} className="w-[120px] border-r border-border-subtle flex items-center justify-center px-2 shrink-0">
                  <span className="text-[9px] font-black text-text-main uppercase tracking-tight text-center truncate">
                    {'fullName' in h ? (h as TeacherRecord).fullName : (h as DutyLocation).name}
                  </span>
                </div>
              ))}
              {viewMode === 'location' && (
                <button 
                  onClick={onAddLocation}
                  className="w-[60px] flex items-center justify-center hover:bg-stone-100 transition-colors shrink-0 text-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Time Rows */}
          {hours.map(hour => (
            <div key={hour} className="flex min-w-max h-28">
              {/* Vertical Time Label */}
              <div className="sticky left-0 z-20 bg-stone-50 border-r border-b border-border-subtle w-[60px] flex items-start justify-center pt-3 shrink-0">
                <span className="text-[10px] font-black text-text-dim uppercase">
                  {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'pm' : 'am'}
                </span>
              </div>

              {/* Cells */}
              <div className="flex border-b border-border-subtle min-w-max">
                {headers.map(h => {
                  const cellAssignments = getAssignmentsForCell(h.id, hour);
                  return (
                    <div 
                      key={`${h.id}-${hour}`} 
                      className="w-[120px] border-r border-border-subtle p-1.5 relative hover:bg-stone-50/50 transition-colors shrink-0"
                      onClick={() => cellAssignments.length === 0 && onAddAssignment(`${hour}:00`, h.id)}
                    >
                      {cellAssignments.map(ass => (
                        <motion.div
                          key={ass.id}
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => { e.stopPropagation(); onSelectAssignment(ass); }}
                          className={`absolute inset-1.5 rounded-xl p-2.5 text-white overflow-hidden shadow-sm select-none border-l-4 ${ass.status === 'completed' ? 'opacity-40' : 'opacity-100'}`}
                          style={{ 
                            backgroundColor: viewMode === 'location' ? '#BCCCDC' : '#B2C2B2',
                            borderLeftColor: viewMode === 'location' ? '#8E9EAE' : '#92A292'
                          }}
                        >
                          <p className="text-[10px] font-black uppercase leading-tight line-clamp-2">{ass.taskName}</p>
                          <div className="flex items-center gap-1 mt-1 opacity-80">
                            <CheckCircle2 className={`w-2.5 h-2.5 ${ass.status === 'completed' ? 'text-white' : 'text-transparent'}`} />
                            <span className="text-[8px] font-bold">{ass.timeStart}</span>
                          </div>
                          
                          {/* Teacher Avatars in bubble */}
                          <div className="absolute bottom-2 right-2 flex -space-x-1.5">
                            {ass.teacherIds.slice(0, 2).map((tid, idx) => (
                              <div key={idx} className="w-4 h-4 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[7px] font-black uppercase">
                                {tid.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })}
                {/* Pad if location add button is present in header */}
                {viewMode === 'location' && <div className="w-[60px] border-r border-border-subtle shrink-0"></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
