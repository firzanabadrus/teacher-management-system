You are working inside an existing Flutter + Firebase project.

You MUST use and extend the existing codebase without restructuring the project unnecessarily.

Existing architecture:
- models/training.dart (already implemented: TrainingPost, TrainingComment, TrainingApplication)
- providers/training_provider.dart
- screens/admin_training_screen.dart
- screens/teacher_training.dart
- services/training_service.dart

Firebase is already configured and initialized. Cloud Firestore is the backend.

---

## 🎯 GOAL
Build a fully functional “CPD Training Social Feed Module” with LinkedIn-style interaction + training workflow system for teachers and principals.

This is NOT a mock UI. It must be fully functional with Firestore read/write + real-time updates.

---

# 🧠 CORE FEATURE REQUIREMENTS

## 1. Social Feed System (LinkedIn-style CPD feed)

Implement a real-time feed using Firestore snapshots:

Each TrainingPost should support:
- authorId, authorName, authorRole
- content (rich formatted text)
- photoUrl (optional media)
- likes (array of userIds)
- comments subcollection
- createdAt (timestamp)
- fontStyle presets (Console Mono, Book Serif, Playful Blue, Warm Gold)
- isTraining flag

UI requirements:
- real-time stream feed (StreamBuilder or provider stream)
- like button toggle (optimistic UI allowed)
- comment section per post
- display formatting styles visually

---

## 2. Rich Post Formatting System

Extend posting system to support:
- bullet points formatting (store as markdown-like text or structured string)
- clickable links
- typography presets:
  - Console Mono
  - Book Serif
  - Playful Blue
  - Warm Gold

Ensure formatting renders correctly in UI using Flutter widgets (RichText or markdown renderer if needed).

---

## 3. Training Post System (Principal/Admin Side)

Admins can create training posts with:

Required fields:
- trainingTitle
- trainingDescription
- maxTrainees (seat cap)
- enrollmentMode:
  - "open_volunteer"
  - "assigned"

Behavior:
- If open_volunteer → teachers can apply
- If assigned → principal selects trainees directly

Training posts must display:
- remaining seats (real-time calculated from traineeIds.length)
- enrollment mode badge
- apply/join button logic based on mode

---

## 4. Teacher Application Workflow

Teachers can:
- view training posts in teacher screen
- see seat availability
- click “Apply” if open_volunteer mode

Application flow:
1. Teacher submits TrainingApplication to Firestore
2. Status = pending
3. Stored in trainingApplications collection

---

## 5. Principal Approval System (Admin Screen)

Admin screen must:
- show all pending applications grouped by training post
- allow approve / reject

When action is taken:
- update TrainingApplication.status → approved / rejected
- if approved:
  - add teacherId into TrainingPost.traineeIds array
  - update seat count automatically

---

## 6. Real-time Updates & Notifications

Everything must be real-time:
- feed updates instantly
- application status updates instantly
- trainee list updates instantly

Also implement a basic notification trigger system:
- when application approved → teacher sees status update in UI immediately

(No external push notification required unless already supported)

---

## 7. Faculty Profile Overlay Feature

When clicking any post author avatar:
- open modal bottom sheet or dialog
- fetch faculty profile from Firestore using authorId
- display:
  - name
  - role
  - school info (if available)
  - ethics points (placeholder field if not implemented)
  - emergency contact (if available)

---

# 🧩 SERVICE LAYER REQUIREMENTS

Use services/training_service.dart as SINGLE source of truth for Firestore operations.

It must include:
- createPost
- streamPosts
- toggleLike
- addComment
- applyTraining
- approveApplication
- rejectApplication
- assignTraineeToTraining

NO Firestore logic should be inside UI or provider directly.

---

# 📦 PROVIDER REQUIREMENTS

training_provider.dart must:
- expose stream of TrainingPosts
- manage loading states
- handle optimistic updates for likes
- expose applications stream for admin screen
- handle filtering:
  - teacher view
  - admin view

Use ChangeNotifier or Riverpod depending on existing setup (match project style).

---

# 📱 SCREENS

## teacher_training.dart
Must include:
- feed view
- apply button
- comment interaction
- real-time updates

## admin_training_screen.dart
Must include:
- create training post form
- applications review panel
- approve/reject workflow
- trainee assignment UI

---

# ⚠️ CONSTRAINTS

- Do NOT redesign folder structure
- Do NOT remove existing model file (training.dart)
- Must use Firestore as backend
- Must use real-time streams (no fake state)
- Must reuse existing models exactly
- Must ensure null safety
- Must avoid duplicated service logic

---

# 🎯 FINAL OUTPUT EXPECTATION

After implementation:
- Teachers can see training feed
- Teachers can apply to trainings
- Principals can create trainings
- Principals can approve/reject applications
- Approved teachers appear in trainee list instantly
- All updates sync in real-time via Firestore

Build this as a production-ready module, not a demo.