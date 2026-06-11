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
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  DutyTask, 
  DutyAssignment, 
  DutyLocation, 
  TeacherRecord, 
  LeaveRecord,
  DutySwapRequest,
  DutyFrequency,
  Gender,
  INITIAL_DOCUMENTS
} from '../types';

export const dutyService = {
  // Locations
  getLocations(callback: (locations: DutyLocation[]) => void) {
    const q = query(collection(db, 'duty_locations'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DutyLocation)));
    });
  },

  async addLocation(name: string, description?: string) {
    const docRef = await addDoc(collection(db, 'duty_locations'), { name, description: description || '' });
    return { id: docRef.id, name, description };
  },

  async deleteLocation(id: string) {
    await deleteDoc(doc(db, 'duty_locations', id));
  },

  // Tasks
  async getTasks(): Promise<DutyTask[]> {
    const snap = await getDocs(collection(db, 'duty_tasks'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DutyTask));
  },

  async addTask(task: Omit<DutyTask, 'id'>) {
    const docRef = await addDoc(collection(db, 'duty_tasks'), task);
    return { id: docRef.id, ...task };
  },

  async updateTask(id: string, task: Partial<DutyTask>) {
    await updateDoc(doc(db, 'duty_tasks', id), task);
  },

  async deleteAssignment(id: string) {
    await deleteDoc(doc(db, 'duty_assignments', id));
  },

  async deleteTask(id: string) {
    await deleteDoc(doc(db, 'duty_tasks', id));
  },

  // Assignments
  getAssignments(date: string, callback: (assignments: DutyAssignment[]) => void) {
    const q = query(
      collection(db, 'duty_assignments'),
      where('date', '==', date)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DutyAssignment)));
    });
  },

  async getAssignment(id: string): Promise<DutyAssignment | null> {
    const snap = await getDoc(doc(db, 'duty_assignments', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } as DutyAssignment : null;
  },

  async updateAssignment(id: string, data: Partial<DutyAssignment>) {
    await updateDoc(doc(db, 'duty_assignments', id), data);
  },

  async updateChecklistItem(assignmentId: string, itemId: string, photoUrl: string) {
    const assRef = doc(db, 'duty_assignments', assignmentId);
    const snap = await getDoc(assRef);
    if (!snap.exists()) return;
    
    const data = snap.data() as DutyAssignment;
    const newChecklist = data.checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          isCompleted: true,
          photoUrl,
          completedAt: Timestamp.now()
        };
      }
      return item;
    });

    const allCompleted = newChecklist.every(i => i.isCompleted);
    await updateDoc(assRef, { 
      checklist: newChecklist,
      status: allCompleted ? 'completed' : 'in-progress'
    });
  },

  // Swap Requests
  async createSwapRequest(request: Omit<DutySwapRequest, 'id'>) {
    const docRef = await addDoc(collection(db, 'duty_swaps'), {
      ...request,
      timestamp: Timestamp.now()
    });
    
    // Add notification for the other teacher
    await addDoc(collection(db, 'notifications'), {
      userId: request.toTeacherId,
      title: 'Duty Swap Request',
      message: `A colleague has requested to swap a duty with you.`,
      read: false,
      timestamp: Timestamp.now(),
      type: 'duty_swap'
    });

    return docRef.id;
  },

  async respondToSwapRequest(id: string, approved: boolean) {
    const snap = await getDoc(doc(db, 'duty_swaps', id));
    if (!snap.exists()) return;
    const request = snap.data() as DutySwapRequest;

    if (approved) {
      // Update the assignment
      const assRef = doc(db, 'duty_assignments', request.assignmentId);
      const assSnap = await getDoc(assRef);
      if (assSnap.exists()) {
        const assData = assSnap.data() as DutyAssignment;
        const newTeacherIds = assData.teacherIds.map(tId => 
          tId === request.fromTeacherId ? request.toTeacherId : tId
        );
        await updateDoc(assRef, { teacherIds: newTeacherIds });
      }
    }

    await updateDoc(doc(db, 'duty_swaps', id), {
      status: approved ? 'approved' : 'rejected'
    });

    // Notify requester
    await addDoc(collection(db, 'notifications'), {
      userId: request.fromTeacherId,
      title: `Swap Request ${approved ? 'Approved' : 'Rejected'}`,
      message: `Your duty swap request has been ${approved ? 'approved' : 'rejected'}.`,
      read: false,
      timestamp: Timestamp.now(),
      type: 'duty_swap'
    });
  },

  // Automated generation and absence handling
  async seedInitialData() {
    const locSnap = await getDocs(collection(db, 'duty_locations'));
    const teacherSnap = await getDocs(collection(db, 'teachers'));

    if (teacherSnap.empty) {
      const initialTeachers = [
        {
          username: 'sarah_j',
          email: 'sarah.jenkins@school.edu',
          fullName: 'Sarah Jenkins',
          role: 'teacher',
          gender: Gender.FEMALE,
          status: 'active',
          currentScore: 82,
          yearlyKpi: 88,
          icNumber: '880101-14-1234',
          phoneNumber: '012-3456789',
          address: '123 School Street',
          maritalStatus: 'Married',
          emergencyContactName: 'John Doe',
          emergencyContactNumber: '012-9876543',
          documents: INITIAL_DOCUMENTS,
          completionProgress: 100
        },
        {
          username: 'david_kim',
          email: 'david.kim@school.edu',
          fullName: 'David Kim',
          role: 'teacher',
          gender: Gender.MALE,
          status: 'active',
          currentScore: 78,
          yearlyKpi: 82,
          icNumber: '900202-14-5678',
          phoneNumber: '012-4455667',
          address: '456 Education Lane',
          maritalStatus: 'Single',
          emergencyContactName: 'Mary Kim',
          emergencyContactNumber: '012-1122334',
          documents: INITIAL_DOCUMENTS,
          completionProgress: 100
        },
        {
          username: 'michael_lee',
          email: 'michael.lee@school.edu',
          fullName: 'Michael Lee',
          role: 'teacher',
          gender: Gender.MALE,
          status: 'active',
          currentScore: 65,
          yearlyKpi: 74,
          icNumber: '920303-14-9012',
          phoneNumber: '012-8899001',
          address: '789 Learning Ave',
          maritalStatus: 'Married',
          emergencyContactName: 'Grace Lee',
          emergencyContactNumber: '012-3344556',
          documents: INITIAL_DOCUMENTS,
          completionProgress: 100
        }
      ];
      for (const t of initialTeachers) {
        await addDoc(collection(db, 'teachers'), t);
      }
    }

    if (!locSnap.empty) return;

    // 1. Create all locations
    const locNames = [
      'Assembly Hall', 'Dining Area', 'Nap Room & Stairs', 'Toilet',
      'Main Door', 'Stairs', 'Hall 1st Floor', 'Hall 2nd Floor',
      'Shoes Rack', 'Classroom (Boys)', 'Classroom (Girls)', 'Classroom (6yo)', 'Kitchen',
      'Main Entrance', 'School Canteen', 'Science Wing', 'Sports Field'
    ];
    const locs: Record<string, string> = {};
    for (const name of locNames) {
      const loc = await this.addLocation(name);
      locs[name] = loc.id;
    }

    const tasks: Omit<DutyTask, 'id'>[] = [
      // Cleaning Duty (4:30 - 5:00pm)
      { name: 'Cleaning: Assembly Hall', timeStart: '16:30', timeEnd: '17:00', frequency: DutyFrequency.DAILY, locations: [locs['Assembly Hall']], minPeople: 1, checklistTemplates: ['Sweep floor', 'Sanitize tables'] },
      { name: 'Cleaning: Dining Area', timeStart: '16:30', timeEnd: '17:00', frequency: DutyFrequency.DAILY, locations: [locs['Dining Area']], minPeople: 2, checklistTemplates: ['Mop floor', 'Clear trash', 'Sanitize surfaces'] },
      { name: 'Cleaning: Nap Room & Stairs', timeStart: '16:30', timeEnd: '17:00', frequency: DutyFrequency.DAILY, locations: [locs['Nap Room & Stairs']], minPeople: 1, checklistTemplates: ['Vacuum area', 'Disinfect railings'] },
      { name: 'Cleaning: Toilet', timeStart: '16:30', timeEnd: '17:00', frequency: DutyFrequency.DAILY, locations: [locs['Toilet']], minPeople: 1, checklistTemplates: ['Scrub floor', 'Refill soap/toiletries'] },

      // Arrival duty (7:30 - 8:00am)
      { name: 'Arrival: Main Door', timeStart: '07:30', timeEnd: '08:00', frequency: DutyFrequency.DAILY, locations: [locs['Main Door']], minPeople: 1, checklistTemplates: ['Greet students', 'Verify ID'] },
      { name: 'Arrival: Stairs', timeStart: '07:30', timeEnd: '08:00', frequency: DutyFrequency.DAILY, locations: [locs['Stairs']], minPeople: 1, checklistTemplates: ['Safety monitoring'] },
      { name: 'Arrival: Hall 1st Floor', timeStart: '07:30', timeEnd: '08:00', frequency: DutyFrequency.DAILY, locations: [locs['Hall 1st Floor']], minPeople: 1, checklistTemplates: ['Line management'] },
      { name: 'Arrival: Hall 2nd Floor', timeStart: '07:30', timeEnd: '08:00', frequency: DutyFrequency.DAILY, locations: [locs['Hall 2nd Floor']], minPeople: 1, checklistTemplates: ['Line management'] },

      // Dismissal duty (12:00-12:30pm)
      { name: 'Dismissal (Noon): Main Door', timeStart: '12:00', timeEnd: '12:30', frequency: DutyFrequency.DAILY, locations: [locs['Main Door']], minPeople: 1, checklistTemplates: ['Check parent ID'] },
      { name: 'Dismissal (Noon): Stairs', timeStart: '12:00', timeEnd: '12:30', frequency: DutyFrequency.DAILY, locations: [locs['Stairs']], minPeople: 1, checklistTemplates: ['Stair safety'] },
      { name: 'Dismissal (Noon): Shoes Rack', timeStart: '12:00', timeEnd: '12:30', frequency: DutyFrequency.DAILY, locations: [locs['Shoes Rack']], minPeople: 1, checklistTemplates: ['Organize shoes'] },

      // Dismissal duty (5:00-5:15pm)
      { name: 'Dismissal (Evening): Main Door', timeStart: '17:00', timeEnd: '17:15', frequency: DutyFrequency.DAILY, locations: [locs['Main Door']], minPeople: 1, checklistTemplates: ['Final student handout'] },
      { name: 'Dismissal (Evening): Stairs', timeStart: '17:00', timeEnd: '17:15', frequency: DutyFrequency.DAILY, locations: [locs['Stairs']], minPeople: 1, checklistTemplates: ['Safety sweep'] },

      // half-full day transition duty (12:00-2:30pm)
      { name: 'Transition: Boys (Full Day)', timeStart: '12:00', timeEnd: '14:30', frequency: DutyFrequency.DAILY, locations: [locs['Classroom (Boys)']], minPeople: 1, checklistTemplates: ['Lunch supervision', 'Nap prep'] },
      { name: 'Transition: Girls (Full Day)', timeStart: '12:00', timeEnd: '14:30', frequency: DutyFrequency.DAILY, locations: [locs['Classroom (Girls)']], minPeople: 1, genderRequirement: Gender.FEMALE, checklistTemplates: ['Lunch supervision', 'Nap prep'] },
      { name: 'Transition: 6yo (Full Day)', timeStart: '12:00', timeEnd: '14:30', frequency: DutyFrequency.DAILY, locations: [locs['Classroom (6yo)']], minPeople: 1, checklistTemplates: ['Activity monitoring'] },
      { name: 'Transition: Cook Rice', timeStart: '12:00', timeEnd: '14:30', frequency: DutyFrequency.DAILY, locations: [locs['Kitchen']], minPeople: 1, checklistTemplates: ['Clean kitchen', 'Start rice cookers'] },

      // Assembly duty (every monday)
      { 
        name: 'Assembly (Monday)', timeStart: '08:00', timeEnd: '09:00', frequency: DutyFrequency.WEEKLY, dayOfWeek: 1, 
        locations: [locs['Assembly Hall']], minPeople: 4, 
        checklistTemplates: ['Introduction', 'Song', 'Islamic Content', 'Words of the Week', 'Sight Words'] 
      },
    ];

    for (const t of tasks) {
      await addDoc(collection(db, 'duty_tasks'), t);
    }
  },

  async ensureAssignmentsForDate(date: string) {
    const tasks = await this.getTasks();
    const locations = await new Promise<DutyLocation[]>((resolve) => this.getLocations(resolve));
    
    const q = query(
      collection(db, 'duty_assignments'),
      where('date', '==', date)
    );
    const existingSnap = await getDocs(q);
    const existingAssignments = existingSnap.docs.map(d => d.data() as DutyAssignment);

    const teachersSnap = await getDocs(query(collection(db, 'teachers'), where('status', '==', 'active')));
    const allTeachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherRecord));

    const leavesSnap = await getDocs(query(collection(db, 'leaves'), where('status', '==', 'approved')));
    const leaves = leavesSnap.docs.map(d => d.data() as LeaveRecord);
    const absentTeacherIds = new Set(
      leaves
        .filter(l => date >= l.startDate && date <= l.endDate)
        .map(l => l.teacherId)
    );

    const availableTeachers = allTeachers.filter(t => !absentTeacherIds.has(t.id));
    if (availableTeachers.length === 0) return;

    const workload: Record<string, number> = {};
    availableTeachers.forEach(t => workload[t.id] = 0);

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();

    for (const task of tasks) {
      if (task.frequency === 'Weekly' && task.dayOfWeek !== dayOfWeek) continue;
      if (task.frequency === 'Monthly' && task.dayOfMonth !== dayOfMonth) continue;

      for (const locId of task.locations) {
        // Check if already assigned for this task-location pair on this date
        const alreadyExists = existingAssignments.some(a => a.taskId === task.id && a.locationId === locId);
        if (alreadyExists) continue;

        const location = locations.find(l => l.id === locId) || { id: locId, name: locId };
        const suitable = availableTeachers
          .filter(t => !task.genderRequirement || t.gender === task.genderRequirement)
          .sort((a, b) => workload[a.id] - workload[b.id]);

        const numToAssign = Math.max(1, task.minPeople);
        const assigned = suitable.slice(0, numToAssign);
        assigned.forEach(t => workload[t.id]++);

        if (assigned.length === 0) continue;

        await addDoc(collection(db, 'duty_assignments'), {
          taskId: task.id,
          taskName: task.name,
          date,
          locationId: locId,
          locationName: location.name,
          teacherIds: assigned.map(t => t.id),
          status: 'pending',
          timeStart: task.timeStart,
          timeEnd: task.timeEnd,
          checklist: task.checklistTemplates.map(desc => ({
            id: Math.random().toString(36).substr(2, 9),
            description: desc,
            isCompleted: false
          }))
        });
      }
    }
  },

};
