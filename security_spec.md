# Security Specification for Teacher Management System

## 1. Data Invariants
- **Profile Integrity**: A teacher profile cannot be edited by another teacher. Only the owner of the template or a Principal can read/write. Moreover, a teacher is strictly forbidden from changing their own `role` (to `principal`), `currentScore`, `yearlyKpi`, or `status`.
- **Administrative Monopoly (Performance Logs, Warnings, Summaries, KPIs)**: Performance records, formal warnings, monthly summaries, and yearly KPI assessments can only be written, updated, or deleted by an authenticated user with `role == 'principal'`.
- **System-only Collections (Duty Tasks & Locations)**: General duty configurations (`duty_tasks`, `duty_locations`) can only be modified (created, updated, deleted) by a Principal. Logged-in teachers can only read them.
- **Controlled Assignments**: Only a Principal can assign duties (`duty_assignments`). Teachers assigned to a duty can ONLY modify the checklist completion status, proof photo URL, and overall assignment status, but never change task identifiers, dates, locations, or assigned teacher IDs.
- **Relational Swap Guards**: Swap requests (`duty_swaps`) can only be initiated by the assigned teacher (`fromTeacherId` must match current user). The recipient (`toTeacherId`) or a principal are the only ones allowed to respond, and the fields must be limited using `hasOnly`.
- **Incident Safe-Guards (Reports)**: Any signed-in teacher can file a safety report (`reports`), setting its status strictly to `Submitted`. Once filed, they cannot alter the description, priority, category, or photo. Only a Principal is allowed to update status, priority, and `managementNotes`.
- **PII Protection**: Teacher records contain sensitive PII (phone number, address, IC number, marital status). Reads of these records are strictly confined to the teacher themselves or the Principal. No blanket public lists are permitted.

---

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: Privilege Escalation
*   **Path**: `/teachers/teacher_1`
*   **Target User**: `teacher_1` (signed in as teacher)
*   **Action**: Attempting to set `role` to `principal`.
*   **Payload**:
    ```json
    {
      "role": "principal"
    }
    ```

### Payload 2: Score Boosting
*   **Path**: `/teachers/teacher_1`
*   **Target User**: `teacher_1`
*   **Action**: Attempting to raise `currentScore` to bypass merit evaluations.
*   **Payload**:
    ```json
    {
      "currentScore": 100
    }
    ```

### Payload 3: Orphaned Performance Log Creator
*   **Path**: `/performance_logs/fake_log_123`
*   **Target User**: `teacher_1`
*   **Action**: Attempting to insert a positive performance mark without being Principal.
*   **Payload**:
    ```json
    {
      "teacherId": "teacher_1",
      "principalId": "null",
      "amount": 5,
      "reason": "Exemplary work",
      "category": "Teaching",
      "timestamp": "2026-06-10T23:45:00Z"
    }
    ```

### Payload 4: Overwriting Other's Profile
*   **Path**: `/teachers/teacher_2`
*   **Target User**: `teacher_1`
*   **Action**: Attempting to edit another teacher's profile details.
*   **Payload**:
    ```json
    {
      "fullName": "Malicious Attacker"
    }
    ```

### Payload 5: Slandering with Warning
*   **Path**: `/warnings/unauthorized_warn_1`
*   **Target User**: `teacher_1`
*   **Action**: Attempting to issue a written warning to `teacher_2`.
*   **Payload**:
    ```json
    {
      "teacherId": "teacher_2",
      "issuedBy": "teacher_1",
      "message": "Poor performance",
      "severity": "Written",
      "issueDate": "2026-06-10T23:45:00Z"
    }
    ```

### Payload 6: Stealing PII Records
*   **Path**: `/teachers/teacher_2`
*   **Target User**: `teacher_1`
*   **Action**: Reading another teacher's private profile.
*   **Security Barrier**: Read access restricted to Owner or Principal.

### Payload 7: Self-Approved Leave
*   **Path**: `/leaves/leave_1`
*   **Target User**: `teacher_1`
*   **Action**: Writing directly to the approved leaves collection to skip work.
*   **Payload**:
    ```json
    {
      "teacherId": "teacher_1",
      "startDate": "2026-06-11",
      "endDate": "2026-06-12",
      "status": "approved",
      "type": "sick"
    }
    ```

### Payload 8: Hijacking Duty Assignments
*   **Path**: `/duty_assignments/assignment_1`
*   **Target User**: `teacher_1`
*   **Action**: Attempting to change `teacherIds` to remove themselves from a scheduled shift.
*   **Payload**:
    ```json
    {
      "teacherIds": ["teacher_2"]
    }
    ```

### Payload 9: Unauthorized Swap Request Approval
*   **Path**: `/duty_swaps/swap_123`
*   **Target User**: `teacher_3` (Neither requester nor recipient)
*   **Action**: Approving a swap request between `teacher_1` and `teacher_2`.
*   **Payload**:
    ```json
    {
      "status": "approved"
    }
    ```

### Payload 10: Toxic Incident Manipulation
*   **Path**: `/reports/report_456`
*   **Target User**: `teacher_1` (The complainant)
*   **Action**: Trying to override management notes or alter a reported incident from "Resolved" back to "Submitted" or delete the complaint.
*   **Payload**:
    ```json
    {
      "managementNotes": "I did nothing wrong!",
      "status": "Submitted"
    }
    ```

### Payload 11: Unauthorized Notification Modification
*   **Path**: `/notifications/notif_789`
*   **Target User**: `teacher_2`
*   **Action**: Teacher A tries to mark Teacher B's bell alerts as read.
*   **Payload**:
    ```json
    {
      "read": true
    }
    ```

### Payload 12: Destroying Duty Configs
*   **Path**: `/duty_tasks/task_assembly`
*   **Target User**: `teacher_1`
*   **Action**: Trying to delete or modify the assembly schedule.
*   **Security Barrier**: Principal-only delete access.

---

## 3. Test Cases (Mock Unit Test Structure)
The unit tests in Firestore are implemented using the Security Rules emulator to ensure all "Dirty Dozen" payloads yield a rejection:

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

// Standard TDD cases checking:
// 1. Role-change updates fail on teacher records.
// 2. Read operations on private teacher documents by non-owners fail.
// 3. Principal creations of warnings succeed.
// 4. Client delete or create on duty_tasks fails for non-principals.
```
