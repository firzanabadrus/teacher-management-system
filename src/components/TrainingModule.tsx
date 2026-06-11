import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Heart, 
  MessageSquare, 
  Plus, 
  Check, 
  Send, 
  X, 
  BookOpen, 
  GraduationCap, 
  Link, 
  Type, 
  Image, 
  List, 
  Users, 
  AlertCircle, 
  User,
  Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trainingService } from '../lib/trainingService';
import { doc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TrainingPost, TrainingComment, TrainingApplication, TeacherRecord, Gender, MaritalStatus } from '../types';

interface TrainingModuleProps {
  currentUserId: string;
  currentUserFullName: string;
  currentUserRole: 'teacher' | 'principal';
}

export default function TrainingModule({ 
  currentUserId, 
  currentUserFullName, 
  currentUserRole 
}: TrainingModuleProps) {
  const [posts, setPosts] = useState<TrainingPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Post Creator Form States
  const [showCreator, setShowCreator] = useState(false);
  const [content, setContent] = useState('');
  const [postPhoto, setPostPhoto] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState<'sans' | 'serif' | 'mono' | 'playful' | 'elegant'>('sans');
  
  // Custom Training Post Fields
  const [isTraining, setIsTraining] = useState(false);
  const [trainingTitle, setTrainingTitle] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [maxTrainees, setMaxTrainees] = useState<number>(5);
  const [trainingType, setTrainingType] = useState<'volunteer' | 'assigned'>('volunteer');

  // Comments and active UI state
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<TrainingComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Profile Viewer Overlay
  const [selectedProfile, setSelectedProfile] = useState<TeacherRecord | null>(null);
  
  // Applications management for Principal/Admin
  const [applications, setApplications] = useState<TrainingApplication[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>([]);
  const [selectedAssignedTeachers, setSelectedAssignedTeachers] = useState<string[]>([]);
  
  // Real-time updates active subscriptions
  useEffect(() => {
    const unsubPosts = trainingService.getPosts(setPosts);
    const unsubApps = trainingService.getApplications(setApplications);
    
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherRecord)));
    });

    return () => {
      unsubPosts();
      unsubApps();
      unsubTeachers();
    };
  }, []);

  // Sync specific comments when a post is active
  useEffect(() => {
    if (!activeCommentsPostId) {
      setComments([]);
      return;
    }
    const unsubComments = trainingService.getComments(activeCommentsPostId, setComments);
    return () => unsubComments();
  }, [activeCommentsPostId]);

  // Insert bullet point markup or formatting helper
  const handleFormattingInsert = (type: 'bullet' | 'link') => {
    if (type === 'bullet') {
      setContent(prev => prev + '\n• ');
    } else if (type === 'link') {
      const url = prompt('Enter link URL (e.g., https://school.edu):');
      if (url) {
        setContent(prev => prev + ` [Link](${url}) `);
      }
    }
  };

  // Convert markdown links e.g. [Link](url) and bullet points into HTML
  const formatContentHTML = (text: string) => {
    if (!text) return '';
    // Bullet points conversion
    let transformed = text.replace(/• (.*)/g, '<li class="ml-4 list-disc">$1</li>');
    
    // Markdown link conversion
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    transformed = transformed.replace(linkRegex, '<a href="$2" target="_blank" class="text-secondary underline font-semibold">$1</a>');
    
    // Newline replacement
    transformed = transformed.replace(/\n/g, '<br />');
    
    return <span dangerouslySetInnerHTML={{ __html: transformed }} />;
  };

  // Profile click view popup
  const handleViewProfileClick = async (authorId: string, authorRole: 'teacher' | 'principal') => {
    try {
      if (authorRole === 'principal') {
        // Mock Principal profile view
        const mockPrincipal: TeacherRecord = {
          id: 'admin-id',
          fullName: 'Dr. Evelyn Carter',
          email: 'principal@school.edu',
          username: 'principal_evelyn',
          role: 'principal',
          icNumber: '750101-14-1111',
          gender: Gender.FEMALE,
          dob: '1975-01-01',
          address: '42 Admin Heights, School Campus',
          phoneNumber: '+6011223344',
          maritalStatus: MaritalStatus.MARRIED,
          emergencyContactName: 'Dr. James Carter',
          emergencyContactNumber: '+6011998877',
          documents: {} as any,
          completionProgress: 100,
          currentScore: 100,
          yearlyKpi: 100,
          status: 'active'
        };
        setSelectedProfile(mockPrincipal);
        return;
      }
      
      const teacherDoc = await getDoc(doc(db, 'teachers', authorId));
      if (teacherDoc.exists()) {
        setSelectedProfile({ id: teacherDoc.id, ...teacherDoc.data() } as TeacherRecord);
      } else {
        alert("Teacher profile not found inside database.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post Submission Handler
  const handlePostSumit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !postPhoto && !trainingTitle) return;

    try {
      const parsedPost: any = {
        authorId: currentUserId,
        authorName: currentUserFullName,
        authorRole: currentUserRole,
        content: content.trim(),
        fontStyle,
        photoUrl: postPhoto,
        isTraining: currentUserRole === 'principal' ? isTraining : false
      };

      if (parsedPost.isTraining) {
        parsedPost.trainingTitle = trainingTitle.trim() || 'Professional CPD Training';
        parsedPost.trainingDescription = trainingDescription.trim() || content.trim();
        parsedPost.maxTrainees = maxTrainees;
        parsedPost.type = trainingType;
        parsedPost.traineeIds = trainingType === 'assigned' ? selectedAssignedTeachers : [];
      }

      await trainingService.createPost(parsedPost);
      
      // Reset form states
      setContent('');
      setPostPhoto(null);
      setFontStyle('sans');
      setIsTraining(false);
      setTrainingTitle('');
      setTrainingDescription('');
      setMaxTrainees(5);
      setSelectedAssignedTeachers([]);
      setShowCreator(false);
    } catch (err) {
      console.error(err);
      alert('Failed to publish training post.');
    }
  };

  // Like Toggle
  const handleToggleLike = async (postId: string) => {
    await trainingService.toggleLike(postId, currentUserId);
  };

  // Apply Volunteer
  const handleApplyVolunteer = async (post: TrainingPost) => {
    try {
      await trainingService.applyForTraining(
        post.id, 
        currentUserId, 
        currentUserFullName, 
        post.trainingTitle || 'Training Session'
      );
      alert('Application sent successfully! School administration has been notified.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit application.');
    }
  };

  // Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      await trainingService.addComment(postId, {
        authorId: currentUserId,
        authorName: currentUserFullName,
        authorRole: currentUserRole,
        text: newCommentText.trim()
      });
      setNewCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(q) ||
      (post.trainingTitle && post.trainingTitle.toLowerCase().includes(q)) ||
      post.authorName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Search Header Container */}
      <div className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search posts or training sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-white rounded-xl border border-gray-200 ios-shadow focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-subtle text-xs font-semibold"
          />
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreator(prev => !prev)}
          className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center ios-shadow cursor-pointer"
        >
          {showCreator ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </motion.button>
      </div>

      {/* Real-time Post Creator form */}
      <AnimatePresence>
        {showCreator && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-5 rounded-2xl border border-border-subtle ios-shadow space-y-4"
          >
            <form onSubmit={handlePostSumit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-50 pb-3 justify-between">
                <span className="text-[10px] font-black uppercase text-text-dim tracking-widest">Create New Post</span>
                
                {/* Font selector */}
                <div className="flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-text-subtle" />
                  <select 
                    value={fontStyle}
                    onChange={(e) => setFontStyle(e.target.value as any)}
                    className="bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-bold p-1 px-2 focus:outline-none text-text-main cursor-pointer"
                  >
                    <option value="sans">Sans Serif</option>
                    <option value="serif">Book Serif</option>
                    <option value="mono">Console Mono</option>
                    <option value="playful">Playful Blue</option>
                    <option value="elegant">Warm Gold</option>
                  </select>
                </div>
              </div>

              {/* Rich input area */}
              <textarea 
                rows={3}
                required={!isTraining}
                placeholder="Share your thoughts, teaching methods or training info..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full bg-stone-50 p-4 rounded-xl border-none text-sm placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary/20 leading-relaxed font-bold ${fontStyle === 'sans' ? 'font-sans' : fontStyle === 'serif' ? 'font-serif' : fontStyle === 'mono' ? 'font-mono' : fontStyle === 'playful' ? 'font-sans italic text-indigo-700' : 'font-serif italic text-[#8B7E6D]'}`}
              />

              {/* Extra input modifiers for principal side */}
              {currentUserRole === 'principal' && (
                <div className="bg-[#FAF9F5]/80 p-4 rounded-xl border border-amber-200/40 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isTraining}
                      onChange={(e) => setIsTraining(e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary/10 rounded"
                    />
                    <span className="text-[10px] font-black uppercase text-text-main tracking-wider">Is this a Training/CPD Session?</span>
                  </label>

                  {isTraining && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-2 border-t border-stone-100"
                    >
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Training Title *</label>
                        <input 
                          type="text" 
                          required={isTraining}
                          placeholder="e.g. Early Childhood Pedagogy"
                          value={trainingTitle}
                          onChange={(e) => setTrainingTitle(e.target.value)}
                          className="w-full bg-white p-3 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Seats / Trainees *</label>
                          <input 
                            type="number" 
                            min={1}
                            required={isTraining}
                            value={maxTrainees}
                            onChange={(e) => setMaxTrainees(parseInt(e.target.value) || 1)}
                            className="w-full bg-white p-3 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Trainees Mode *</label>
                          <select 
                            value={trainingType}
                            onChange={(e) => setTrainingType(e.target.value as any)}
                            className="w-full bg-white p-3 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="volunteer">Open for Volunteers</option>
                            <option value="assigned">Assign Trainees</option>
                          </select>
                        </div>
                      </div>

                      {trainingType === 'assigned' && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider block">Select Staff to Assign</label>
                          <div className="flex flex-wrap gap-2 p-2 bg-white rounded-lg border border-stone-200 max-h-24 overflow-y-auto no-scrollbar">
                            {teachersList.map((teacher) => {
                              const isChecked = selectedAssignedTeachers.includes(teacher.id);
                              return (
                                <button
                                  type="button"
                                  key={teacher.id}
                                  onClick={() => {
                                    setSelectedAssignedTeachers(prev => {
                                      if (isChecked) return prev.filter(id => id !== teacher.id);
                                      return [...prev, teacher.id];
                                    });
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase border tracking-tight transition-all flex items-center gap-1 ${isChecked ? 'bg-primary border-primary text-white' : 'bg-stone-50 border-stone-100 text-text-subtle'}`}
                                >
                                  {teacher.fullName}
                                  {isChecked && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Photo Input Indicator */}
              {postPhoto && (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-border-subtle group">
                  <img src={postPhoto} alt="Upload" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setPostPhoto(null)}
                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Post formatting & actions footer bar */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-50">
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => handleFormattingInsert('bullet')}
                    title="Insert bullet point form"
                    className="p-2 hover:bg-stone-50 text-text-dim rounded-lg transition-colors border border-stone-100"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleFormattingInsert('link')}
                    title="Insert custom web links"
                    className="p-2 hover:bg-stone-50 text-text-dim rounded-lg transition-colors border border-stone-100"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                  <label className="p-2 hover:bg-stone-50 text-text-dim rounded-lg transition-colors border border-stone-100 cursor-pointer flex items-center justify-center">
                    <Image className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setPostPhoto(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-lg ios-shadow cursor-pointer hover:opacity-95 flex items-center gap-2"
                >
                  Publish <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Postings Feed */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isLiked = post.likes?.includes(currentUserId);
          const isTrainee = post.traineeIds?.includes(currentUserId);
          const pendingApp = applications.find(app => app.postId === post.id && app.teacherId === currentUserId && app.status === 'pending');
          const approvedApp = applications.find(app => app.postId === post.id && app.teacherId === currentUserId && app.status === 'approved');
          const statusLabel = pendingApp ? 'Pending Review' : approvedApp ? 'Enrolled' : null;

          return (
            <motion.div 
              key={post.id}
              layout
              className="bg-white p-5 rounded-3xl ios-shadow border border-border-subtle mt-1 flex flex-col gap-3"
            >
              {/* Post Header with profile links */}
              <div className="flex items-center justify-between">
                <div 
                  onClick={() => handleViewProfileClick(post.authorId, post.authorRole)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E8D1D1] text-white flex items-center justify-center font-bold text-xs">
                    {post.authorName.split(' ')[0][0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-text-main group-hover:text-primary transition-colors">{post.authorName}</h4>
                    <p className="text-[8px] text-text-dim uppercase tracking-wider font-extrabold">{post.authorRole}</p>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-text-subtle uppercase">
                  {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Special CPD training panel banner */}
              {post.isTraining && (
                <div className="bg-[#FAF9F5] border border-amber-200/40 p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5 text-primary">
                      <GraduationCap className="w-4.5 h-4.5" />
                      <span className="text-[10px] font-black uppercase text-primary tracking-wider">CPD Training Course</span>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${post.type === 'assigned' ? 'bg-[#FAF5F5] text-rose-400' : 'bg-primary/10 text-primary'}`}>
                      {post.type}
                    </span>
                  </div>
                  
                  <h3 className="text-xs font-black text-[#5A5A5A] uppercase leading-snug">{post.trainingTitle}</h3>
                  <p className="text-[10px] font-semibold text-text-dim italic leading-relaxed">
                    {post.trainingDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-[9px] font-black text-text-dim uppercase tracking-wide">
                    <div>Limit Trainees: {post.maxTrainees} max</div>
                    <div>Applied Trainees: {post.traineeIds?.length || 0} enrolled</div>
                  </div>

                  {/* Actions based on role and application status */}
                  {currentUserRole === 'teacher' ? (
                    <div className="pt-2">
                      {post.type === 'assigned' ? (
                        <div className="text-[9px] font-bold text-text-subtle leading-normal">
                          {isTrainee ? '✅ You are assigned to this session by the administration.' : 'This session is only for assigned staff.'}
                        </div>
                      ) : (
                        post.traineeIds && post.traineeIds.includes(currentUserId) ? (
                          <div className="bg-green-50 text-green-600 rounded-xl p-2.5 text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1">
                            <Check className="w-4 h-4" /> Enrolled & Selected
                          </div>
                        ) : pendingApp ? (
                          <div className="bg-yellow-50 text-yellow-600 rounded-xl p-2.5 text-[9px] font-black uppercase tracking-wider text-center">
                            ⏳ Application Under Review
                          </div>
                        ) : (post.traineeIds?.length || 0) >= (post.maxTrainees || 5) ? (
                          <div className="bg-stone-50 text-text-subtle rounded-xl p-2.5 text-[9px] font-black uppercase tracking-wider text-center">
                            🚫 All seats are fully booked
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApplyVolunteer(post)}
                            className="w-full py-2.5 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-wider ios-shadow cursor-pointer hover:bg-opacity-95"
                          >
                            Apply to Become Trainee
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    // Principal can see applications specifically for this session
                    <div className="pt-2 border-t border-stone-50 space-y-2">
                      <div className="text-[9px] font-black text-text-dim uppercase tracking-wider">Trainee Registrations:</div>
                      {applications.filter(app => app.postId === post.id).length === 0 ? (
                        <p className="text-[9px] text-text-subtle italic">No volunteer applications or trainees enrolled yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pt-1">
                          {applications.filter(app => app.postId === post.id).map((app) => (
                            <div key={app.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-100 text-[10px] font-bold">
                              <div>{app.teacherName} <span className="text-[8px] uppercase text-text-subtle">({app.status})</span></div>
                              {app.status === 'pending' && (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => trainingService.updateApplicationStatus(app.id, post.id, 'approved', app.teacherId, post.trainingTitle || 'Training')}
                                    className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-[8px] font-black uppercase"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => trainingService.updateApplicationStatus(app.id, post.id, 'rejected', app.teacherId, post.trainingTitle || 'Training')}
                                    className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-[8px] font-black uppercase"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Main formatted content body */}
              {post.content && (
                <div className={`text-xs font-medium text-[#4A4A4A] leading-relaxed break-words whitespace-pre-wrap ${post.fontStyle === 'serif' ? 'font-serif' : post.fontStyle === 'mono' ? 'font-mono' : post.fontStyle === 'playful' ? 'font-sans italic text-indigo-700' : post.fontStyle === 'elegant' ? 'font-serif italic text-[#8B7E6D]' : 'font-sans'}`}>
                  {formatContentHTML(post.content)}
                </div>
              )}

              {/* Custom photo attachment */}
              {post.photoUrl && (
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border-subtle cursor-pointer select-none">
                  <img src={post.photoUrl} alt="Attachments" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Interactivity counts & footer buttons */}
              <div className="flex items-center justify-between border-t border-stone-50 pt-3">
                <button 
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${isLiked ? 'text-rose-500' : 'text-text-subtle'}`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-text-subtle'}`} />
                  <span>{post.likes?.length || 0} Likes</span>
                </button>

                <button 
                  onClick={() => setActiveCommentsPostId(prev => prev === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-text-subtle text-[10px] font-black uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentsCount || 0} Comments</span>
                </button>
              </div>

              {/* Comments drawer layout inside feed */}
              <AnimatePresence>
                {activeCommentsPostId === post.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-stone-50/50 p-4 rounded-2xl border border-stone-100 flex flex-col gap-3 mt-2"
                  >
                    <div className="text-[9px] font-black text-text-dim uppercase tracking-wider mb-1">Remarks ({comments.length})</div>
                    
                    {/* List comments recursively */}
                    <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                      {comments.map((comm) => (
                        <div key={comm.id} className="bg-white p-3 rounded-xl border border-stone-100 text-[11px] font-bold">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-primary uppercase tracking-tight text-[8px] font-extrabold">{comm.authorName} ({comm.authorRole})</span>
                            <span className="text-[7px] text-text-subtle font-medium uppercase">{new Date(comm.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[#5A5A5A] leading-normal font-sans">{comm.text}</p>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <p className="text-[10px] text-text-subtle italic text-center py-2">No comments published yet.</p>
                      )}
                    </div>

                    {/* Quick post comment form */}
                    <form 
                      onSubmit={(e) => handleCommentSubmit(e, post.id)}
                      className="flex items-center gap-2 mt-1 pt-2 border-t border-stone-100/40"
                    >
                      <input 
                        type="text" 
                        required
                        placeholder="Write constructive comment..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-1 bg-white h-9 px-3 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent placeholder:text-text-subtle"
                      />
                      <button 
                        type="submit"
                        className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filteredPosts.length === 0 && (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-200 p-8">
            <BookOpen className="w-10 h-10 text-text-subtle/40 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">No Postings Found</h4>
            <p className="text-[10px] text-text-dim mt-1">Be the first to share CPD workshops, suggestions, or staff thoughts!</p>
          </div>
        )}
      </div>

      {/* Profile Modal Overlay */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 border border-border-subtle ios-shadow flex flex-col gap-4 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-stone-50 pb-3">
                <div className="flex items-center gap-1.5 text-primary">
                  <User className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Account Faculty Record</span>
                </div>
                <button onClick={() => setSelectedProfile(null)} className="p-1.5 bg-stone-50 rounded-full">
                  <X className="w-4 h-4 text-text-dim" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-pink/10 text-accent-pink flex items-center justify-center font-bold font-sans text-sm">
                  {selectedProfile.fullName.split(' ')[0][0]}
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-main uppercase">{selectedProfile.fullName}</h3>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider font-extrabold">{selectedProfile.role}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center text-xs font-bold">
                  <span className="text-text-subtle uppercase text-[9px] tracking-wide">Primary Email:</span>
                  <span className="text-text-main">{selectedProfile.email}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center text-xs font-bold">
                  <span className="text-text-subtle uppercase text-[9px] tracking-wide">Phone Number:</span>
                  <span className="text-text-main">{selectedProfile.phoneNumber || 'Unavailable'}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl flex justify-between items-center text-xs font-bold">
                  <span className="text-text-subtle uppercase text-[9px] tracking-wide">Staff Sex:</span>
                  <span className="text-text-main">{selectedProfile.gender || 'Not specified'}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl flex flex-col gap-1 text-xs font-bold">
                  <span className="text-text-subtle uppercase text-[9px] tracking-wide">School Address:</span>
                  <span className="text-text-main leading-relaxed mt-0.5">{selectedProfile.address || 'Unavailable'}</span>
                </div>

                {selectedProfile.role === 'teacher' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-primary/5 p-3 rounded-xl text-center border border-primary/10">
                      <p className="text-[8px] font-black uppercase text-primary tracking-wider">Work Status</p>
                      <p className="text-xs font-black text-primary mt-1 uppercase">{selectedProfile.status}</p>
                    </div>
                    <div className="bg-secondary/5 p-3 rounded-xl text-center border border-secondary/10">
                      <p className="text-[8px] font-black uppercase text-secondary tracking-wider">Ethics Score</p>
                      <p className="text-xs font-black text-secondary mt-1">{selectedProfile.currentScore || 0} pts</p>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedProfile(null)}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-text-main font-bold rounded-xl text-xs uppercase"
              >
                Close Record
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
