# StaffSync HRMS — Phase-Wise Implementation Documentation

## Executive Overview
**StaffSync** is an enterprise-grade Human Resource Management System (HRMS) built on a modern full-stack TypeScript architecture (React 19, Tailwind CSS v4, Vite, Express, and Mongoose/Dual-Engine storage). This document details each phase of the project's inception, design, engineering, integration, and verification.

---

## Table of Phases

| Phase | Phase Name | Primary Objectives & Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Architecture & Data Modeling | Domain entities, TypeScript schemas, API contracts | Completed |
| **Phase 2** | Dual Storage Engine | MongoDB Atlas cloud driver + resilient in-memory fallback | Completed |
| **Phase 3** | Authentication & RBAC | JWT auth, bcrypt password hashing, 3 role personas | Completed |
| **Phase 4** | Attendance & Timesheets | Punch clock, shift tracking, attendance audits, manual corrections | Completed |
| **Phase 5** | Multi-Tier Leave Workflow | Leave balances, manager pre-approval, HR final sign-off, cancellation | Completed |
| **Phase 6** | Workforce Directory & Ops | Department units, employee profiles, training modules, announcements | Completed |
| **Phase 7** | Audit Trail & Analytics | Immutable compliance logging, CSV reports, department metrics | Completed |
| **Phase 8** | Theme Engine & Dark Mode | CSS variable mapping, dark mode toggle, zero-contrast defect polish | Completed |
| **Phase 9** | Quality Assurance & Testing | Automated 17-point test suite, edge-case validation, health checks | Completed |

---

## Phase 1: Architecture & Data Modeling

### 1.1 Objectives
Define the core business entities for modern human resource operations, ensuring strict separation of concerns, strong TypeScript typings, and normalized relationship models.

### 1.2 Core Data Schemas
1. **User Account (`User`)**:
   - `_id`, `email`, `passwordHash`, `role` (`'hr' | 'manager' | 'employee'`), `employeeId`, `isActive`, `createdAt`, `updatedAt`.
2. **Employee Profile (`Employee`)**:
   - `_id`, `employeeCode` (e.g., `EMP-1001`), `firstName`, `lastName`, `email`, `departmentId`, `designation`, `jobTitle`, `role`, `managerId`, `joiningDate`, `employmentType` (`Full-Time`, `Contract`, `Intern`), `salary`, `phone`, `address`, `employmentStatus`.
3. **Department (`Department`)**:
   - `_id`, `name`, `code`, `headEmployeeId`, `budget`, `description`, `location`.
4. **Attendance Record (`Attendance`)**:
   - `_id`, `employeeId`, `date`, `checkIn`, `checkOut`, `workedMinutes`, `status` (`Present`, `Late`, `Half Day`, `Absent`, `On Leave`), `remarks`, `correctionReason`, `isCorrected`, `correctedBy`.
5. **Leave Request (`Leave`)**:
   - `_id`, `employeeId`, `leaveTypeId` (`casual`, `sick`, `annual`, `unpaid`), `startDate`, `endDate`, `totalDays`, `reason`, `status` (`Pending Manager Approval`, `Pending HR Approval`, `Approved`, `Rejected`, `Cancelled`), `approvalHistory` array with manager/HR review timestamps, comments, and decision audit.
6. **Leave Balance (`LeaveBalance`)**:
   - `_id`, `employeeId`, `leaveTypeId`, `allocatedDays`, `usedDays`, `pendingDays`, `year`.
7. **Training Workshop (`Training`)**:
   - `_id`, `title`, `description`, `departmentId`, `instructor`, `startDate`, `endDate`, `capacity`, `participants` array with progress tracking, completion status, and scores.
8. **Announcement (`Announcement`)**:
   - `_id`, `title`, `content`, `priority` (`Low`, `Medium`, `High`, `Urgent`), `authorId`, `targetDepartmentId`, `expiresAt`, `isActive`.
9. **Audit Trail Log (`AuditLog`)**:
   - `_id`, `action`, `performedBy`, `userRole`, `entityType`, `entityId`, `details`, `ipAddress`, `timestamp`.

---

## Phase 2: Dual Storage Database Architecture

### 2.1 Objectives
Eliminate local runtime blocking due to missing cloud credentials or network IP whitelisting restrictions while providing seamless production MongoDB Atlas persistence.

### 2.2 Implementation
- **Cloud Driver Connection**:
  - Connects to remote MongoDB Atlas clusters using `mongoose.connect(process.env.MONGODB_URI)`.
  - Configures a 3-second non-blocking timeout with automatic reconnection handling.
- **In-Memory Seeded Fallback**:
  - Automatically activates if Atlas is unreachable or IP is not whitelisted.
  - Seeds pre-populated organizations, departments, roles, active staff, leave histories, attendance timestamps, and audit events.
  - Zero disruption to frontend interfaces; queries and mutations reflect in runtime state.
- **Health Diagnostic Endpoint (`/api/v1/health`)**:
  - Exposes realtime status: `activeEngine` (`'mongodb'` vs `'in-memory'`), collection counts, server uptime, and timestamp.

---

## Phase 3: Authentication & Role-Based Access Control (RBAC)

### 3.1 Objectives
Deliver enterprise-grade JWT-based authentication paired with role-based routing and permissions for three distinct organizational personas.

### 3.2 Role Hierarchy
1. **HR Administrator (`hr`)**:
   - Full organizational oversight.
   - Employee onboarding, salary viewing, department budgets, final leave approval, company announcements, audit trails, and data exports.
2. **Team Manager (`manager`)**:
   - Supervisory control over assigned direct reports.
   - Stage 1 leave approvals, team attendance monitoring, team training oversight.
3. **Employee (`employee`)**:
   - Self-service portal: Punch-in/out, personal timesheets, leave balance viewing, leave application, assigned training completion, profile management.

### 3.3 Security Implementation
- Passwords hashed using `bcryptjs` with salt rounds.
- Signed JWT tokens (`staffsync_token`) stored securely in client state and passed via HTTP `Authorization: Bearer <token>` headers.
- Route protection middleware (`authenticateToken`, `requireRole(['hr', 'manager'])`).

---

## Phase 4: Attendance & Real-Time Punch-Clock Engine

### 4.1 Objectives
Provide an accurate, tamper-resistant system for employee daily attendance, shift duration calculation, and supervisor oversight.

### 4.2 Features Delivered
- **One-Click Check-In / Check-Out**:
  - Prevents duplicate punches for the same calendar date.
  - Automatically calculates total minutes worked upon check-out.
- **Dynamic Shift Status**:
  - Flags punches after 9:30 AM as `Late`.
  - Flags shifts under 240 minutes as `Half Day`.
- **Manager/HR Timesheet Auditing**:
  - View organization-wide timesheets by date range and department.
  - Manual correction feature with compulsory audit reason logging and supervisor signature.

---

## Phase 5: Multi-Tier Leave Request & Lifecycle Workflow

### 5.1 Objectives
Prevent leave conflicts and policy violations through automated balance checks and structured two-tier manager/HR approval pipelines.

### 5.2 Workflow Pipeline
```
[Employee Submits Request]
           │
           ▼
[Check Balance: allocated - (used + pending)]
           │
           ▼
[Status: Pending Manager Approval]
           │
     ┌─────┴────────────────────────┐
     ▼                              ▼
[Manager Rejects]         [Manager Approves]
(Balance refunded)                  │
                                    ▼
                         [Status: Pending HR Approval]
                                    │
                              ┌─────┴──────────────┐
                              ▼                    ▼
                        [HR Rejects]         [HR Approves]
                     (Balance refunded)      (Pending -> Used)
```

### 5.3 Cancellation Lifecycle
- Employees can cancel unapproved pending leaves at any time, immediately releasing the allocated days back to their available pool.

---

## Phase 6: Workforce Directory & Operational Modules

### 6.1 Objectives
Centralize employee records, organizational divisions, skill building, and corporate communications.

### 6.2 Modules
- **Employee Directory**:
  - Searchable by name, email, department, role, or status.
  - Modal view for personal contact info, joining date, reporting manager, and allocated compensation.
- **Department Units**:
  - Engineering, Marketing, Human Resources, Product & Design, Sales.
  - Head of department linking and allocated operating budgets.
- **Training Workshops**:
  - Course enrollment, progress percentage tracking, instructor tracking, and pass/fail certificates.
- **Corporate Announcements**:
  - Priority badging (`High`, `Urgent`, `General`), target department filtering, and expiry dates.

---

## Phase 7: Compliance, Audit Trails & CSV Reporting

### 7.1 Objectives
Ensure regulatory compliance (SOX, GDPR internal controls) and operational visibility through immutable logs and one-click data exports.

### 7.2 Features
- **Audit Trail Logging**:
  - Automatically records every security-sensitive mutation (logins, leave reviews, attendance adjustments, profile updates).
  - Displays user ID, role, action, target entity, timestamp, and metadata diffs.
- **Authorized CSV Exports**:
  - One-click downloads for Workforce Roster, Attendance Records, Leave Utilization, and Audit Event Logs.

---

## Phase 8: Theme Engine & Dark Mode

### 8.1 Objectives
Provide an accessible, eye-friendly dark mode experience that adheres to modern WCAG contrast ratios across all dashboards, tables, dialogs, and navigation controls.

### 8.2 Deliverables
- **Tailwind CSS v4 Integration**:
  - Configured `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css`.
- **State Management**:
  - Created `ThemeContext` persisting state to `localStorage.staffsync_theme` and toggling `.dark` on `document.documentElement`.
- **Universal Semantic Styling**:
  - Mapped slate background and border utilities (`bg-white` -> `bg-slate-900`, `bg-slate-50` -> `bg-slate-950`).
  - Added dedicated theme toggle controls to both the **Top Navigation Bar** and **Login Screen**.
  - Contrast polish on all badges, tables, inputs, stat cards, and action buttons.

---

## Phase 9: Quality Assurance & Automated Testing

### 9.1 Objectives
Verify system integrity, deterministic seed state, cryptographic password hashing, role boundaries, and leave calculations across automated test runners.

### 9.2 Test Suite Execution (`tests/api.test.ts`)
17 automated integration assertions:
- `PASS`: Initial database contains seeded users
- `PASS`: Initial database contains seeded employees
- `PASS`: Departments initialized correctly
- `PASS`: HR user account exists
- `PASS`: HR password hash verifies correctly
- `PASS`: Invalid password is rejected
- `PASS`: Sarah Jenkins has HR role
- `PASS`: Marcus Vance has Manager role
- `PASS`: Alex Rivera has Employee role
- `PASS`: Employee Alex Rivera has recorded attendance history
- `PASS`: Leave balance for Alex Rivera (casual) exists
- `PASS`: Casual leave has 12 allocated days
- `PASS`: Chloe Dupont leave record exists
- `PASS`: Chloe leave is at Pending HR Approval stage after Manager approved it
- `PASS`: Approval history logs Manager stage approval
- `PASS`: Audit trail contains recorded events
- `PASS`: Attendance correction audit log is present with metadata

**Result**: 17 Passed, 0 Failed (100% Passing).
