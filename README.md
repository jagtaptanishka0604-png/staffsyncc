# StaffSync — Modern Human Resource Management System

StaffSync is an enterprise-grade, full-stack Human Resource Management System (HRMS) built on the MERN stack architecture (Node.js, Express, React, TypeScript, and MongoDB/JSON Document Store). It centralizes workforce directory management, daily clock-in/attendance tracking, a rigorous multi-stage leave approval workflow, internal company announcements, employee training & certification programs, security compliance audit logging, and interactive workforce analytics with CSV export capabilities.

---

## 1. Role-Based Access Control (RBAC)

StaffSync enforces strict server-side authorization on every API endpoint:

| Role | Target Persona | Key Capabilities & Boundaries |
| :--- | :--- | :--- |
| **HR Administrator** | Sarah Jenkins (`hr@staffsync.io`) | Administrative control over workforce records, create/deactivate employees, assign managers and departments, review organizational attendance, perform authorized attendance corrections with mandatory audit reasons, execute final HR leave determinations, broadcast company-wide bulletins, review system audit trail, and export reports. |
| **Manager** | Marcus Vance (`marcus.vance@staffsync.io`), Elena Rostova (`elena.rostova@staffsync.io`) | Lead assigned teams, review direct report attendance rosters, execute Stage 1 leave reviews (Approve or Reject with comments), create departmental training programs, track participant progress, and view team analytics. *Security restriction: Cannot approve their own leaves or modify employees outside their team.* |
| **Employee** | Alex Rivera (`alex.rivera@staffsync.io`), Priya Sharma (`priya.sharma@staffsync.io`), Jordan Lee (`jordan.lee@staffsync.io`) | Clock in and out with live session timers, view personal timesheets, apply for leave with automatic duration and balance calculation, track multi-stage request history, cancel eligible requests, update self-service personal contact info, and track training courses. |

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts analytics.
- **Backend**: Node.js, Express.js REST API (`/api/v1/*`), JSON Web Tokens (JWT), bcryptjs password hashing, CORS.
- **Data Persistence**: High-performance persistent JSON document store with MongoDB-compatible schema models (`data/staffsync-db.json`) and automated seed bootstrapping.
- **Testing**: Automated Quality Assurance test runner covering auth, RBAC, leave approvals, and audit compliance.

---

## 3. Seed Accounts & One-Click Persona Switcher

StaffSync comes pre-loaded with realistic organizational seed data. You can switch between any role instantly using the **Persona Switcher** in the top navigation header or sign in manually:

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Sarah Jenkins** | HR Administrator | `hr@staffsync.io` | `Password123!` |
| **Marcus Vance** | Engineering Manager | `marcus.vance@staffsync.io` | `Password123!` |
| **Elena Rostova** | Marketing Director | `elena.rostova@staffsync.io` | `Password123!` |
| **Alex Rivera** | Senior Frontend Engineer | `alex.rivera@staffsync.io` | `Password123!` |
| **Priya Sharma** | Backend Systems Engineer | `priya.sharma@staffsync.io` | `Password123!` |
| **Chloe Dupont** | UI/UX Designer | `chloe.dupont@staffsync.io` | `Password123!` |

---

## 4. Key Workflows & Features

### A. Employee Directory & Onboarding
- Search by name, employee code, email, and job title.
- Filter by department, status (Active, On Leave, Terminated), and employment type.
- HR Onboarding: Creates employee profile, provisions user account with temporary credentials, and initializes standard leave allocations.
- Detailed dossier drawer displaying personal contact, reporting manager, leave balances, and timesheets.

### B. Daily Attendance Tracking & HR Correction
- Server-authoritative timestamp recording in UTC.
- Duplicate check-in prevention and check-out validation.
- Automatic late arrival detection (> 09:30 AM) and half-day classification (< 4 hours worked).
- HR Manual Attendance Correction modal: Requires a documented audit justification that is permanently written to the audit log.

### C. Two-Stage Leave Approval Engine
1. **Employee Application**: Selects leave category (Casual, Sick, Annual, Unpaid) with date range picker, optional half-day toggle, balance check, and overlap validation. Atomically reserves `pendingDays` to prevent double-deductions.
2. **Manager Review (Stage 1)**: Assigned manager approves (advancing request to HR) or rejects (restoring pending balance with required comment). Self-approval is blocked by the API.
3. **HR Determination (Stage 2)**: HR grants final approval (converting pending days to used days) or rejects with justification.
4. **Cancellation**: Eligible pending or upcoming requests can be cancelled by the employee or HR, immediately restoring balances.
5. **Timeline Audit**: Complete interactive timeline for every request recording reviewer IDs, timestamps, and comments.

### D. Training & Development
- Delivery format selection: Online (virtual meeting URL), In-Person, or Hybrid.
- Target department cohorts and participant tracking.
- Interactive progress slider (0% to 100%) and completion date certification.

### E. Announcements & Communication
- Categorized feeds (Company News, HR Updates, Policy Changes, Events, Training) with priority levels (Low, Medium, High, Urgent).
- Target audience scoping (Company-wide, Department-only, Managers-only).

### F. Reports & CSV Export Center
- Real-time Recharts visualizations: 7-day attendance adherence, department headcount, leave request status distribution, and leave category utilization.
- 4 One-click authorized CSV export streams:
  - Employee Master Roster
  - Daily Attendance & Timesheets
  - Leave Request Applications
  - Training Workshop Rosters

### G. Compliance Audit Trail
- HR-only inspection of sensitive administrative events, recording actor identity, action type, resource IDs, timestamps, and full JSON payload metadata.

---

## 5. Development & Testing Commands

```bash
# Start full-stack dev server (Express backend + Vite middleware on Port 3000)
npm run dev

# Run automated quality assurance tests
npm test

# Run TypeScript linter
npm run lint

# Compile production bundle
npm run build
```

---

## 6. Environment Configuration

Defined in `.env.example`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET="staffsync_jwt_secure_development_secret_key_2026"
MONGODB_URI="mongodb://127.0.0.1:27017/staffsync"
VITE_API_URL=""
```
