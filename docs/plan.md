
### 1. The Gateway Route: `login_screen.dart`

```markdown
Role: Specialist Flutter/Dart UI Engineer
Task: Create the gateway 'LoginScreen' widget representing a high-fidelity gateway matching our school administration interface.

Aesthetic Guidelines:
- Base color system: Ambient off-white backgrounds (#F5F5F3), using pure white (#FFFFFF) accent elements.
- Main layout borders: Use delicate #F0EFEC divider frames, and iOS-style card shadows:
  boxShadow: [
    BoxShadow(color: Colors.black.withOpacity(0.03), offset: Offset(0, 4), blurRadius: 12)
  ]
- Typography: Clear sans-serif font pairing utilizing bold uppercase labels.

Functional Mock Credential Flow:
1. Centered welcome illustration inside an elegant card panel with generous vertical negative space (padding: 24).
2. Role toggler segment control with premium fade and scale animation: "Campus Staff" vs. "Administration".
3. Inside "Campus Staff" list, render scrollable interactive teacher card list to select mock personnel:
   - "Sarah Jenkins" (Primary Grade Teacher, email: sarah@school.edu)
   - "David Kim" (Science Coordinator, email: david@school.edu)
   - "Michael Lee" (Languages Educator, email: michael@school.edu)
4. Inside "Administration" list, render the principal profile selector card:
   - "Dr. Evelyn Carter" (Principal, email: principal@school.edu).
5. Clicking a staff card must animate with a responsive scale tap gesture, trigger 'onLogin(selectedUser)' state callback, and transition to the target dashboard with a clean sliding Hero page route.
```

---

### 2. The Core Portal: `teacher_dashboard.dart`

```markdown
Role: Senior Flutter State Architect
Task: Generate the complete 'TeacherDashboard' screen featuring an iOS-styled bottom TabBar containing five distinct functional views (Home, Training, Performance, Alerts, Profile).

State Requirements:
- Bind real-time stream streams ('StreamBuilder') targeting Firestore collections: 'teachers/teacher_id', 'notifications', and 'duty_assignments' on the active date.
- Bottom TabBar Navigation Icons:
  - Home: LucideIcons.home (Label: "Home")
  - Training: LucideIcons.bookOpen (Label: "Training") - Replaces legacy reporting tab
  - Performance: LucideIcons.barChart (Label: "Performance")
  - Alerts: LucideIcons.bell (Active badge counts overlays)
  - Profile: LucideIcons.user (Label: "Profile")

Detailed Tab Specifications:

A. Home Tab Views:
1. Dynamic Radial KPI Gauge Widget: Renders an elegant ring visualizing the teacher's current month evaluation score (e.g., 85/100 pts) matching secondary theme colored graphics (#BCCCDC).
2. Shortcuts Grid Panel: Three interactive high-contrast action shortcuts styled with rounded containers:
   - "File Report": Navigates to a sliding overlay form to report facility complaints (Broken furniture, leak, etc.) with priority indicators (Low, Med, High) and file attachment.
   - "Leaves": Opens leave list and new holiday request dialog.
   - "Schedules": Displays a weekly calendar.
3. Daily Duty Roster Checklist: Displays assigned tasks on the selected calendar day (e.g., "Arrival: Main Gate", "Break: Canteen").
   - Checking a checklist item must enforce camera or image picker action.
   - When a valid image proof is provided, record its URL into Firestore, mark sub-item status, and update parent assignment status to 'in-progress' or 'completed' (when all items check 100% finished).

B. Training Tab Views:
1. Top Search Header: Search bar filtering posts by content, training title, or authors.
2. Form Creator Expandable Header: Clicking "Plus" icon slides down a posting tool.
   - Modifiers section: Dropdown selecting custom fonts ('sans', 'serif', 'mono', 'playful italic', 'elegant warm').
   - Formatting buttons: List (appends "• " bullet marker), Link (prompt URL popup and appends markdown "[Link](url)" format).
   - Attachment button: Triggers standard image picker to upload photos.
3. Social Feed: Renders LinkedIn-style chronological feeds:
   - Convert custom bullets and "[label](url)" markdown expressions into interactive links & rich paragraphs inside standard widgets.
   - Interactive Like Button: Toggles current user ID in 'likes' array in real-time.
   - Comments Panel Drawer: Toggling the comment count opens a sliding bottom panel, querying nested comment streams and featuring a message entry action.
   - Professional CPD Banner (when isTraining is true): If the post is a Principal-authored CPD course:
     - Shows Seats limit (e.g., 5 trainees max) and enrollee counts.
     - Present enrollment controls: Volunteer courses present dynamic "Apply to Become Trainee" button. If clicked, inserts 'pending' document in Firestore collection 'training_applications' notifying admin; state switches to "⏳ Application Under Review". If seats are full, locks actions with "🚫 All seats are fully booked".

C. Performance Tab Views:
1. Core Linear Graphics Chart (Using fl_chart): Monthly tracking graph showing progress trends across last 6 months.
2. Disciplinary Warnings Box: Table listing written warning warnings, severity categories, issued date, and messages.

D. Alerts Tab Views:
1. List view showing unread administrative notifications. Left slide-swipe action toggles status read to 'true' in Firestore.

E. Profile Tab Views:
1. Dynamic Completion Board: Dynamic bar reflecting checklist items (10 profile input fields + 6 professional file attachments).
2. Forms Section: Text fields updating Name, address, phone numbers, emergency contact details in Firestore.
3. Corporate Documents Uploaders: 6 cards demonstrating document upload state (MyKad, resume, medical checkup etc.) with file Picker triggers and verification labels.
```

---

### 3. The Coordinated Administrator: `principal_dashboard.dart`

```markdown
Role: Senior Flutter Full-Stack Engineer
Task: Create the 'PrincipalDashboard' featuring persistent tabs: Home, Training, Schedule, KPI, Alerts, Leaves, Reports.

State Requirements:
- Bind streams reading all faculty records, incoming duty swap approvals request collections, leave files notifications, and structural reports.

Tab Layout Mappings:

A. Home Tab (Faculty Directory):
1. Stats Bento-Grid: Quick totals counters (Total Teachers, Active Leaves, Resolved Incidents, Duty Completion %).
2. Shortcuts Section: Row featuring: "View Tasks" (switches tab), "Incidents Inbox", "Leave Approval", and "Overall KPI".
3. Scrollable Faculty Cards List: Displays each teacher's name, primary role, completion progress %, and active KPI score.
   - Clicking a card launches a beautiful, detailed modal displaying their profile information, emergency contacts, profile files verification status.

B. Training Tab (CPD Architecture):
1. Top posting engine with exclusive principal access tools:
   - Checkbox options: "Is this a Training/CPD Session?"
   - When active, reveals fields: Course Title input, Max capacity seats selector, and Recruitment type dropdown ("Open for Volunteers" or "Assign Trainees").
   - If recruitment selection is "Assign Trainees", render a horizontal tag selector containing all teachers. Toggling tags pushes teacher IDs into the 'traineeIds' array.
2. Active Registrations Table: List of all volunteer leave applications.
   - Render "Approve" and "Decline" actions for applications matching CPD courses.
   - Clicking "Approve" sets application state to 'approved' in Firestore, appends teacher ID into the root post's 'traineeIds' array, and triggers a success notification alert to the teacher.

C. Schedule Tab (Checklist Administrator):
1. Standard calendar grid showing dates.
2. Tasks List view matching date: Shows location, assigned staff, and completion status. Clicking a task pulls up itemized checklists showing proof photographs submitted by teachers.
3. Negociation Swaps Panel: List incoming swaps in 'pending' status. Shows: "Teacher A wants to swap with Teacher B". Render accept/reject buttons. Clicking accept replaces A with B inside duty assignment in Firestore and alerts both users.

D. KPI Performance Tab:
1. Point Allocator Card: Dropdown selecting teacher, point amount slider (+10 to -30), and feedback remarks. Sends log to 'performance_logs'.
2. Warnings Dispatcher: Create formal written, verbal, or final notifications targeting teachers.

E. Leaves Tab:
1. Directory showing all leave requests (annual, unpaid, medical).
2. Hovering or tapping a request allows downloading/viewing MC documents, writing 'principalNotes' feedback, and clicking "Approve Leave" or "Decline Leave" triggers.

F. Reports Tab (Triaging Dashboard):
1. Columns or lists grouping institutional repair reports by priority (High, Med, Low).
2. Expandable view reveals category, description, and attached proof photo.
3. Triaging controls options: Dropdown updating status (Under Review -> Action Taken -> Resolved) and custom memo notes field.
```

---

## Technical Conversion Reminders

*   **Firebase Authentication & Cloud Storage Mocking**: While transitioning to Dart, ensure that local camera photos selected via `image_picker` convert to Base64 strings to simulate file URLs inside firestore until standard Cloud Storage is integrated.
*   **Font Styles mapping**: Customize `RichText` configurations inside Dart to parse the selected typography styles cleanly:
    - `sans`: System sans-serif.
    - `serif`: Georgia styled serif fonts.
    - `mono`: Monospace fonts.
    - `playful`: Blue italicized fonts.
    - `elegant`: Deep gold serif italics fonts.
