# StaffSync — Enterprise Human Resource Management System

```
   _____ _             __  ____                  
  / ___/| |           / / / __/_  ______  _____
  \__ \ | | /| / / _ \/ /_/ /_/ / / / __ \/ ___/
 ___/ / | |/ |/ /  __/ __/\__, / /_/ / / / / /__  
/____/  |__/|__/\___/_/  /____/\__, /_/_/ /_/\___/  
                              /____/              
```

## Welcome to StaffSync
**StaffSync** is an enterprise-grade Human Resource Management System (HRMS) designed to power the complete employee lifecycle—from onboarding and organizational structuring to attendance tracking, multi-tier leave approval pipelines, employee training, and compliance auditing.

---

## Project Structure (`staffsync/`)

StaffSync is structured into modular client and server divisions:

### 1. `staffsync/client/` — Frontend Application
Contains all client-facing UI components, views, context providers, API connectors, and theme styles:
- **`views/`**: Complete modular feature views:
  - `LoginView.tsx`: Multi-persona and email authentication portal with theme toggle.
  - `DashboardView.tsx`: Role-aware workspaces (HR Operations, Manager Leadership, Employee Self-Service).
  - `EmployeesView.tsx`: Searchable workforce directory with comprehensive profile modals.
  - `AttendanceView.tsx`: One-click punch clock, shift status, and audit timesheet editor.
  - `LeavesView.tsx`: Multi-tiered leave submission, balance deductions, and approval pipeline.
  - `DepartmentsView.tsx`: Organizational unit management and budget allocation.
  - `TrainingsView.tsx`: Professional development catalog, enrollment, and scoring.
  - `AnnouncementsView.tsx`: Company-wide announcements with priority indicators.
  - `ReportsView.tsx`: Workforce metrics and one-click authorized CSV exports.
  - `AuditLogsView.tsx`: Immutable regulatory compliance activity logs.
  - `ProfileView.tsx`: Personal details and password change security.
- **`components/`**: Navigation Header (with role switcher and dark mode toggle), Sidebar, and atomic UI widgets (`Badge`, `Modal`, `StatCard`).
- **`context/`**: `AuthContext` (JWT & session state), `ThemeContext` (Light/Dark mode), `ToastContext` (In-app notifications).
- **`api/client.ts`**: Unified HTTP client connecting to backend endpoints.

### 2. `staffsync/server/` — Backend Application
Contains the core backend architecture, controllers, models, and database engine:
- **`routes/`**: Dedicated Express REST route controllers (`authRoutes.ts`, `employeeRoutes.ts`, `attendanceRoutes.ts`, `leaveRoutes.ts`, `departmentRoutes.ts`, `trainingRoutes.ts`, `announcementRoutes.ts`, `reportRoutes.ts`, `auditLogRoutes.ts`).
- **`db.ts`**: Dual storage database engine supporting MongoDB Atlas cloud connectivity with automatic in-memory fallback.
- **`auth.ts`**: JWT cryptographic token verification and role-based route guard middleware.
- **`server.ts`**: Express backend entrypoint mounting all API routes under `/api/v1` and serving static assets.

---

## Quick Reference & Seeded Demo Personas

On fresh sessions, the app opens directly to the **StaffSync Login Portal**. You can either sign in with standard credentials or click any of the 1-click persona buttons:

| Persona Name | Role | Email | Title | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Jenkins** | `hr` | `hr@staffsync.io` | Head of People & Culture | `Password123!` |
| **Marcus Vance** | `manager` | `marcus.vance@staffsync.io` | Engineering Manager | `Password123!` |
| **Elena Rostova** | `manager` | `elena.rostova@staffsync.io` | Marketing Director | `Password123!` |
| **Alex Rivera** | `employee` | `alex.rivera@staffsync.io` | Senior Frontend Engineer | `Password123!` |
| **Priya Sharma** | `employee` | `priya.sharma@staffsync.io` | Backend Systems Engineer | `Password123!` |

---

## Associated Documentation Files

- **`PHASE_WISE_DOCUMENTATION.md`**: Complete step-by-step breakdown of all 9 engineering phases, architectural milestones, and delivery timelines.
- **`PROJECT_DOCUMENTATION.md`**: In-depth technical guide covering API endpoint contracts, database schemas, role permission matrices, and deployment runbooks.

---

## Key Commands

```bash
# Start local development server on port 3000
npm run dev

# Run automated 17-point quality assurance test suite
npm test

# Run TypeScript compiler syntax and type checking
npm run lint

# Compile production bundle
npm run build
```
