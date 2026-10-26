import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'staffsync-db.json');

// Interface definitions matching MongoDB models
export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'hr' | 'manager' | 'employee';
  employeeId: string; // Linked Employee _id
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  employeeCode: string; // e.g. EMP-101
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth?: string;
  departmentId: string;
  managerId?: string; // Reports to another Employee _id
  jobTitle: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  joiningDate: string;
  employmentStatus: 'Active' | 'On Leave' | 'Terminated' | 'Resigned';
  profileImage?: string;
  salary?: number;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  managerId?: string; // Employee _id
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  _id: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  checkIn: string; // ISO String
  checkOut?: string; // ISO String
  status: 'Present' | 'Late' | 'Half Day' | 'On Leave' | 'Absent';
  workedMinutes: number;
  source: 'Web Self-Service' | 'Biometric' | 'Manual HR Correction';
  correctionReason?: string;
  correctedBy?: string; // User _id
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  _id: string;
  employeeId: string;
  leaveTypeId: 'casual' | 'sick' | 'annual' | 'unpaid';
  leaveTypeName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: number; // Days (e.g. 1, 2.5, 3)
  reason: string;
  status: 'Pending Manager Approval' | 'Pending HR Approval' | 'Approved' | 'Rejected' | 'Cancelled';
  approvalHistory: {
    stage: 'Manager' | 'HR' | 'Employee Cancellation';
    actorId: string;
    actorName: string;
    action: 'Approved' | 'Rejected' | 'Cancelled' | 'Submitted';
    comment?: string;
    timestamp: string;
  }[];
  managerReviewerId?: string;
  hrReviewerId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  _id: string;
  employeeId: string;
  leaveTypeId: 'casual' | 'sick' | 'annual' | 'unpaid';
  leaveTypeName: string;
  periodYear: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  updatedAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  category: 'Company News' | 'HR Updates' | 'Events' | 'Policy Changes' | 'Training';
  authorId: string;
  authorName: string;
  authorRole: string;
  targetAudience: 'All' | 'Department' | 'Managers Only';
  departmentIds?: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  publishedAt: string;
  expiresAt?: string;
  status: 'Published' | 'Draft' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

export interface TrainingParticipant {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  completionDate?: string;
  progressPercent: number;
}

export interface Training {
  _id: string;
  title: string;
  description: string;
  trainer: string;
  startDate: string;
  endDate: string;
  deliveryMethod: 'Online' | 'In-Person' | 'Hybrid';
  location?: string;
  meetingUrl?: string;
  createdBy: string; // Employee or User _id
  createdByName: string;
  departmentIds: string[];
  participants: TrainingParticipant[];
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipientId: string; // User _id
  type: 'leave' | 'attendance' | 'announcement' | 'training' | 'profile' | 'system';
  title: string;
  message: string;
  relatedResourceType?: 'Leave' | 'Attendance' | 'Announcement' | 'Training' | 'Employee';
  relatedResourceId?: string;
  isRead: boolean;
  actionLink?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface DatabaseSchema {
  users: User[];
  employees: Employee[];
  departments: Department[];
  attendances: Attendance[];
  leaves: Leave[];
  leaveBalances: LeaveBalance[];
  announcements: Announcement[];
  trainings: Training[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

class JsonDatabase {
  private data: DatabaseSchema;
  private initialized = false;

  constructor() {
    this.data = {
      users: [],
      employees: [],
      departments: [],
      attendances: [],
      leaves: [],
      leaveBalances: [],
      announcements: [],
      trainings: [],
      notifications: [],
      auditLogs: [],
    };
  }

  public mongoStatus = {
    connected: false,
    uriConfigured: false,
    errorMessage: '',
  };

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Check if remote MongoDB URI is configured and test connection
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && !mongoUri.includes('127.0.0.1')) {
      this.mongoStatus.uriConfigured = true;
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
        this.mongoStatus.connected = true;
        console.log('✅ Successfully connected to MongoDB Atlas cluster!');
      } catch (err: any) {
        this.mongoStatus.connected = false;
        this.mongoStatus.errorMessage = err.message;
        console.log('ℹ️ MongoDB Atlas cluster reachable check: ' + err.message);
      }
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.initialized = true;
        return;
      } catch (err) {
        console.error('Failed to parse existing db file, reseeding:', err);
      }
    }

    // Seed initial data
    await this.seed();
    this.save();
    this.initialized = true;
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // Accessors
  public get users() { return this.data.users; }
  public get employees() { return this.data.employees; }
  public get departments() { return this.data.departments; }
  public get attendances() { return this.data.attendances; }
  public get leaves() { return this.data.leaves; }
  public get leaveBalances() { return this.data.leaveBalances; }
  public get announcements() { return this.data.announcements; }
  public get trainings() { return this.data.trainings; }
  public get notifications() { return this.data.notifications; }
  public get auditLogs() { return this.data.auditLogs; }

  private async seed(): Promise<void> {
    const defaultPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Departments
    const deptEngineering: Department = {
      _id: 'dept_eng',
      name: 'Engineering',
      code: 'ENG',
      description: 'Core software development, infrastructure, and platform systems.',
      managerId: 'emp_marcus',
      isActive: true,
      createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    };

    const deptMarketing: Department = {
      _id: 'dept_mkt',
      name: 'Marketing & Growth',
      code: 'MKT',
      description: 'Brand awareness, digital growth, market research, and communication.',
      managerId: 'emp_elena',
      isActive: true,
      createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    };

    const deptHR: Department = {
      _id: 'dept_hr',
      name: 'Human Resources',
      code: 'HR',
      description: 'People operations, recruitment, talent development, and organizational policy.',
      managerId: 'emp_sarah',
      isActive: true,
      createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    };

    const deptDesign: Department = {
      _id: 'dept_des',
      name: 'Product & Design',
      code: 'DES',
      description: 'User experience research, UI design, prototyping, and product strategy.',
      managerId: 'emp_marcus',
      isActive: true,
      createdAt: new Date(Date.now() - 300 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 300 * 86400000).toISOString(),
    };

    this.data.departments = [deptEngineering, deptMarketing, deptHR, deptDesign];

    // 2. Employees & Users
    // A. HR Administrator: Sarah Jenkins
    const empSarah: Employee = {
      _id: 'emp_sarah',
      employeeCode: 'EMP-001',
      userId: 'usr_sarah',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'hr@staffsync.io',
      phone: '+1 (555) 234-5678',
      address: '742 Evergreen Terrace, San Francisco, CA 94107',
      departmentId: 'dept_hr',
      jobTitle: 'Head of People & Culture',
      employmentType: 'Full-time',
      joiningDate: '2023-01-15',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      salary: 135000,
      createdAt: '2023-01-15T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrSarah: User = {
      _id: 'usr_sarah',
      name: 'Sarah Jenkins',
      email: 'hr@staffsync.io',
      passwordHash,
      role: 'hr',
      employeeId: 'emp_sarah',
      isActive: true,
      lastLoginAt: now.toISOString(),
      createdAt: '2023-01-15T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    // B. Manager 1: Marcus Vance (Engineering)
    const empMarcus: Employee = {
      _id: 'emp_marcus',
      employeeCode: 'EMP-002',
      userId: 'usr_marcus',
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'marcus.vance@staffsync.io',
      phone: '+1 (555) 345-6789',
      address: '1088 Howard Street, San Francisco, CA 94103',
      departmentId: 'dept_eng',
      jobTitle: 'Engineering Manager',
      employmentType: 'Full-time',
      joiningDate: '2023-03-01',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      salary: 155000,
      createdAt: '2023-03-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrMarcus: User = {
      _id: 'usr_marcus',
      name: 'Marcus Vance',
      email: 'marcus.vance@staffsync.io',
      passwordHash,
      role: 'manager',
      employeeId: 'emp_marcus',
      isActive: true,
      lastLoginAt: now.toISOString(),
      createdAt: '2023-03-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    // C. Manager 2: Elena Rostova (Marketing)
    const empElena: Employee = {
      _id: 'emp_elena',
      employeeCode: 'EMP-003',
      userId: 'usr_elena',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@staffsync.io',
      phone: '+1 (555) 456-7890',
      address: '450 Mission Street, San Francisco, CA 94105',
      departmentId: 'dept_mkt',
      jobTitle: 'Marketing Director',
      employmentType: 'Full-time',
      joiningDate: '2023-05-10',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      salary: 140000,
      createdAt: '2023-05-10T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrElena: User = {
      _id: 'usr_elena',
      name: 'Elena Rostova',
      email: 'elena.rostova@staffsync.io',
      passwordHash,
      role: 'manager',
      employeeId: 'emp_elena',
      isActive: true,
      lastLoginAt: now.toISOString(),
      createdAt: '2023-05-10T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    // D. Employees
    const empAlex: Employee = {
      _id: 'emp_alex',
      employeeCode: 'EMP-101',
      userId: 'usr_alex',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex.rivera@staffsync.io',
      phone: '+1 (555) 567-8901',
      address: '320 Folsom Street, San Francisco, CA 94105',
      departmentId: 'dept_eng',
      managerId: 'emp_marcus',
      jobTitle: 'Senior Frontend Engineer',
      employmentType: 'Full-time',
      joiningDate: '2023-08-01',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      salary: 125000,
      createdAt: '2023-08-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrAlex: User = {
      _id: 'usr_alex',
      name: 'Alex Rivera',
      email: 'alex.rivera@staffsync.io',
      passwordHash,
      role: 'employee',
      employeeId: 'emp_alex',
      isActive: true,
      lastLoginAt: now.toISOString(),
      createdAt: '2023-08-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const empPriya: Employee = {
      _id: 'emp_priya',
      employeeCode: 'EMP-102',
      userId: 'usr_priya',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@staffsync.io',
      phone: '+1 (555) 678-9012',
      address: '210 King Street, San Francisco, CA 94107',
      departmentId: 'dept_eng',
      managerId: 'emp_marcus',
      jobTitle: 'Backend Systems Engineer',
      employmentType: 'Full-time',
      joiningDate: '2023-09-15',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      salary: 128000,
      createdAt: '2023-09-15T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrPriya: User = {
      _id: 'usr_priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@staffsync.io',
      passwordHash,
      role: 'employee',
      employeeId: 'emp_priya',
      isActive: true,
      createdAt: '2023-09-15T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const empJordan: Employee = {
      _id: 'emp_jordan',
      employeeCode: 'EMP-103',
      userId: 'usr_jordan',
      firstName: 'Jordan',
      lastName: 'Lee',
      email: 'jordan.lee@staffsync.io',
      phone: '+1 (555) 789-0123',
      address: '890 Market Street, San Francisco, CA 94102',
      departmentId: 'dept_mkt',
      managerId: 'emp_elena',
      jobTitle: 'Content Strategist',
      employmentType: 'Full-time',
      joiningDate: '2023-11-01',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      salary: 92000,
      createdAt: '2023-11-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrJordan: User = {
      _id: 'usr_jordan',
      name: 'Jordan Lee',
      email: 'jordan.lee@staffsync.io',
      passwordHash,
      role: 'employee',
      employeeId: 'emp_jordan',
      isActive: true,
      createdAt: '2023-11-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const empChloe: Employee = {
      _id: 'emp_chloe',
      employeeCode: 'EMP-104',
      userId: 'usr_chloe',
      firstName: 'Chloe',
      lastName: 'Dupont',
      email: 'chloe.dupont@staffsync.io',
      phone: '+1 (555) 890-1234',
      address: '600 Townsend Street, San Francisco, CA 94103',
      departmentId: 'dept_des',
      managerId: 'emp_marcus',
      jobTitle: 'UI/UX Designer',
      employmentType: 'Full-time',
      joiningDate: '2024-02-01',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      salary: 110000,
      createdAt: '2024-02-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrChloe: User = {
      _id: 'usr_chloe',
      name: 'Chloe Dupont',
      email: 'chloe.dupont@staffsync.io',
      passwordHash,
      role: 'employee',
      employeeId: 'emp_chloe',
      isActive: true,
      createdAt: '2024-02-01T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const empDev: Employee = {
      _id: 'emp_dev',
      employeeCode: 'EMP-105',
      userId: 'usr_dev',
      firstName: 'Dev',
      lastName: 'Patel',
      email: 'dev.patel@staffsync.io',
      phone: '+1 (555) 901-2345',
      address: '150 4th Street, San Francisco, CA 94103',
      departmentId: 'dept_mkt',
      managerId: 'emp_elena',
      jobTitle: 'Growth Marketing Specialist',
      employmentType: 'Contract',
      joiningDate: '2024-03-10',
      employmentStatus: 'Active',
      profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      salary: 85000,
      createdAt: '2024-03-10T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    const usrDev: User = {
      _id: 'usr_dev',
      name: 'Dev Patel',
      email: 'dev.patel@staffsync.io',
      passwordHash,
      role: 'employee',
      employeeId: 'emp_dev',
      isActive: true,
      createdAt: '2024-03-10T09:00:00.000Z',
      updatedAt: now.toISOString(),
    };

    this.data.employees = [empSarah, empMarcus, empElena, empAlex, empPriya, empJordan, empChloe, empDev];
    this.data.users = [usrSarah, usrMarcus, usrElena, usrAlex, usrPriya, usrJordan, usrChloe, usrDev];

    // 3. Initialize Leave Balances for all employees (Casual 12, Sick 10, Annual 18, Unpaid)
    const currentYear = new Date().getFullYear();
    const allEmployees = this.data.employees;
    const balances: LeaveBalance[] = [];

    allEmployees.forEach(emp => {
      balances.push(
        {
          _id: `lb_${emp._id}_casual`,
          employeeId: emp._id,
          leaveTypeId: 'casual',
          leaveTypeName: 'Casual Leave',
          periodYear: currentYear,
          allocatedDays: 12,
          usedDays: emp._id === 'emp_alex' ? 2 : 1,
          pendingDays: emp._id === 'emp_alex' ? 1 : 0,
          updatedAt: now.toISOString(),
        },
        {
          _id: `lb_${emp._id}_sick`,
          employeeId: emp._id,
          leaveTypeId: 'sick',
          leaveTypeName: 'Sick Leave',
          periodYear: currentYear,
          allocatedDays: 10,
          usedDays: emp._id === 'emp_priya' ? 2 : 0,
          pendingDays: 0,
          updatedAt: now.toISOString(),
        },
        {
          _id: `lb_${emp._id}_annual`,
          employeeId: emp._id,
          leaveTypeId: 'annual',
          leaveTypeName: 'Earned / Annual Leave',
          periodYear: currentYear,
          allocatedDays: 18,
          usedDays: emp._id === 'emp_jordan' ? 3 : 0,
          pendingDays: 0,
          updatedAt: now.toISOString(),
        },
        {
          _id: `lb_${emp._id}_unpaid`,
          employeeId: emp._id,
          leaveTypeId: 'unpaid',
          leaveTypeName: 'Unpaid Leave',
          periodYear: currentYear,
          allocatedDays: 30,
          usedDays: 0,
          pendingDays: 0,
          updatedAt: now.toISOString(),
        }
      );
    });
    this.data.leaveBalances = balances;

    // 4. Sample Attendances
    // Alex Rivera: checked in today at 8:55 AM, active
    const today855 = new Date();
    today855.setHours(8, 55, 0, 0);

    const today905 = new Date();
    today905.setHours(9, 5, 0, 0);

    const today945 = new Date(); // Late check in
    today945.setHours(9, 45, 0, 0);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

    this.data.attendances = [
      // Today
      {
        _id: 'att_today_alex',
        employeeId: 'emp_alex',
        attendanceDate: todayStr,
        checkIn: today855.toISOString(),
        status: 'Present',
        workedMinutes: 180,
        source: 'Web Self-Service',
        createdAt: today855.toISOString(),
        updatedAt: today855.toISOString(),
      },
      {
        _id: 'att_today_marcus',
        employeeId: 'emp_marcus',
        attendanceDate: todayStr,
        checkIn: today855.toISOString(),
        status: 'Present',
        workedMinutes: 200,
        source: 'Web Self-Service',
        createdAt: today855.toISOString(),
        updatedAt: today855.toISOString(),
      },
      {
        _id: 'att_today_sarah',
        employeeId: 'emp_sarah',
        attendanceDate: todayStr,
        checkIn: today905.toISOString(),
        status: 'Present',
        workedMinutes: 190,
        source: 'Web Self-Service',
        createdAt: today905.toISOString(),
        updatedAt: today905.toISOString(),
      },
      {
        _id: 'att_today_priya',
        employeeId: 'emp_priya',
        attendanceDate: todayStr,
        checkIn: today945.toISOString(),
        status: 'Late',
        workedMinutes: 140,
        source: 'Web Self-Service',
        createdAt: today945.toISOString(),
        updatedAt: today945.toISOString(),
      },
      {
        _id: 'att_today_chloe',
        employeeId: 'emp_chloe',
        attendanceDate: todayStr,
        checkIn: today905.toISOString(),
        status: 'Present',
        workedMinutes: 180,
        source: 'Web Self-Service',
        createdAt: today905.toISOString(),
        updatedAt: today905.toISOString(),
      },
      // Yesterday records
      {
        _id: 'att_yest_alex',
        employeeId: 'emp_alex',
        attendanceDate: yesterday,
        checkIn: `${yesterday}T09:00:00.000Z`,
        checkOut: `${yesterday}T17:30:00.000Z`,
        status: 'Present',
        workedMinutes: 510,
        source: 'Web Self-Service',
        createdAt: `${yesterday}T09:00:00.000Z`,
        updatedAt: `${yesterday}T17:30:00.000Z`,
      },
      {
        _id: 'att_yest_priya',
        employeeId: 'emp_priya',
        attendanceDate: yesterday,
        checkIn: `${yesterday}T08:50:00.000Z`,
        checkOut: `${yesterday}T17:00:00.000Z`,
        status: 'Present',
        workedMinutes: 490,
        source: 'Web Self-Service',
        createdAt: `${yesterday}T08:50:00.000Z`,
        updatedAt: `${yesterday}T17:00:00.000Z`,
      },
      {
        _id: 'att_yest_marcus',
        employeeId: 'emp_marcus',
        attendanceDate: yesterday,
        checkIn: `${yesterday}T08:45:00.000Z`,
        checkOut: `${yesterday}T18:00:00.000Z`,
        status: 'Present',
        workedMinutes: 555,
        source: 'Web Self-Service',
        createdAt: `${yesterday}T08:45:00.000Z`,
        updatedAt: `${yesterday}T18:00:00.000Z`,
      },
      {
        _id: 'att_yest_jordan',
        employeeId: 'emp_jordan',
        attendanceDate: yesterday,
        checkIn: `${yesterday}T09:15:00.000Z`,
        checkOut: `${yesterday}T13:15:00.000Z`,
        status: 'Half Day',
        workedMinutes: 240,
        source: 'Web Self-Service',
        createdAt: `${yesterday}T09:15:00.000Z`,
        updatedAt: `${yesterday}T13:15:00.000Z`,
      },
      // 2 Days ago with a manual HR correction example
      {
        _id: 'att_2d_alex',
        employeeId: 'emp_alex',
        attendanceDate: twoDaysAgo,
        checkIn: `${twoDaysAgo}T09:00:00.000Z`,
        checkOut: `${twoDaysAgo}T17:15:00.000Z`,
        status: 'Present',
        workedMinutes: 495,
        source: 'Manual HR Correction',
        correctionReason: 'Employee badge scanner misread on entry, confirmed by manager log.',
        correctedBy: 'usr_sarah',
        createdAt: `${twoDaysAgo}T09:00:00.000Z`,
        updatedAt: `${twoDaysAgo}T18:00:00.000Z`,
      },
      {
        _id: 'att_2d_priya',
        employeeId: 'emp_priya',
        attendanceDate: twoDaysAgo,
        checkIn: `${twoDaysAgo}T09:05:00.000Z`,
        checkOut: `${twoDaysAgo}T17:35:00.000Z`,
        status: 'Present',
        workedMinutes: 510,
        source: 'Web Self-Service',
        createdAt: `${twoDaysAgo}T09:05:00.000Z`,
        updatedAt: `${twoDaysAgo}T17:35:00.000Z`,
      },
    ];

    // 5. Sample Leaves & Approval Workflow
    const nextWeekStart = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const nextWeekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const inTwoWeeksStart = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const inTwoWeeksEnd = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    this.data.leaves = [
      // 1. Pending Manager Approval (Alex Rivera requesting 1 day casual leave)
      {
        _id: 'leave_alex_1',
        employeeId: 'emp_alex',
        leaveTypeId: 'casual',
        leaveTypeName: 'Casual Leave',
        startDate: nextWeekStart,
        endDate: nextWeekStart,
        duration: 1,
        reason: 'Attending family celebration and personal errands.',
        status: 'Pending Manager Approval',
        approvalHistory: [
          {
            stage: 'Manager',
            actorId: 'usr_alex',
            actorName: 'Alex Rivera',
            action: 'Submitted',
            comment: 'Submitted leave request.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      // 2. Pending HR Approval (Chloe Dupont approved by manager Marcus Vance, awaiting HR Sarah)
      {
        _id: 'leave_chloe_1',
        employeeId: 'emp_chloe',
        leaveTypeId: 'annual',
        leaveTypeName: 'Earned / Annual Leave',
        startDate: inTwoWeeksStart,
        endDate: inTwoWeeksEnd,
        duration: 2,
        reason: 'Short vacation trip to Yosemite National Park.',
        status: 'Pending HR Approval',
        managerReviewerId: 'usr_marcus',
        approvalHistory: [
          {
            stage: 'Manager',
            actorId: 'usr_chloe',
            actorName: 'Chloe Dupont',
            action: 'Submitted',
            comment: 'Submitted annual leave request.',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            stage: 'Manager',
            actorId: 'usr_marcus',
            actorName: 'Marcus Vance',
            action: 'Approved',
            comment: 'Design sprint deliverables are on schedule, approved from engineering/product team perspective.',
            timestamp: new Date(Date.now() - 43200000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
      },
      // 3. Approved Leave (Priya Sharma took 2 days sick leave last week)
      {
        _id: 'leave_priya_1',
        employeeId: 'emp_priya',
        leaveTypeId: 'sick',
        leaveTypeName: 'Sick Leave',
        startDate: threeDaysAgo,
        endDate: twoDaysAgo,
        duration: 2,
        reason: 'Fever and viral infection, doctor prescribed rest.',
        status: 'Approved',
        managerReviewerId: 'usr_marcus',
        hrReviewerId: 'usr_sarah',
        approvalHistory: [
          {
            stage: 'Manager',
            actorId: 'usr_priya',
            actorName: 'Priya Sharma',
            action: 'Submitted',
            timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
          },
          {
            stage: 'Manager',
            actorId: 'usr_marcus',
            actorName: 'Marcus Vance',
            action: 'Approved',
            comment: 'Get well soon Priya.',
            timestamp: new Date(Date.now() - 4 * 86400000 + 3600000).toISOString(),
          },
          {
            stage: 'HR',
            actorId: 'usr_sarah',
            actorName: 'Sarah Jenkins',
            action: 'Approved',
            comment: 'Approved under regular sick policy.',
            timestamp: new Date(Date.now() - 4 * 86400000 + 7200000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 86400000 + 7200000).toISOString(),
      },
    ];

    // 6. Announcements
    this.data.announcements = [
      {
        _id: 'ann_1',
        title: 'All-Hands Company Meeting & Q4 Strategy Kickoff',
        content: 'Join us this Thursday at 2:00 PM PST in the Town Hall room or via Google Meet for our quarterly retrospective, executive updates, and roadmap announcements. Refreshments will be served at the headquarters!',
        category: 'Company News',
        authorId: 'usr_sarah',
        authorName: 'Sarah Jenkins',
        authorRole: 'Head of People & Culture',
        targetAudience: 'All',
        priority: 'High',
        publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: 'Published',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        _id: 'ann_2',
        title: 'Updated Health & Wellness Benefits Package for 2026',
        content: 'We are thrilled to expand our health coverage! Starting this quarter, every employee receives an additional $750 annual mental health and wellness stipend, along with flexible gym membership coverage. Please check your HR Portal under Benefits.',
        category: 'Policy Changes',
        authorId: 'usr_sarah',
        authorName: 'Sarah Jenkins',
        authorRole: 'Head of People & Culture',
        targetAudience: 'All',
        priority: 'Medium',
        publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        status: 'Published',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        _id: 'ann_3',
        title: 'Engineering Architecture Review: React 19 & Cloud Migration',
        content: 'Engineering & Design team members: Marcus will be hosting a special deep-dive workshop on upcoming architectural shifts and CI/CD pipelines. Please review the design document before Wednesday.',
        category: 'Training',
        authorId: 'usr_marcus',
        authorName: 'Marcus Vance',
        authorRole: 'Engineering Manager',
        targetAudience: 'Department',
        departmentIds: ['dept_eng', 'dept_des'],
        priority: 'Medium',
        publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: 'Published',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ];

    // 7. Training Programs
    this.data.trainings = [
      {
        _id: 'trn_1',
        title: 'Enterprise Cybersecurity & Data Privacy Compliance 2026',
        description: 'Mandatory annual training covering zero-trust security standards, phishing detection, role-based database access, and SOC-2 / GDPR compliance protocols.',
        trainer: 'CipherGuard Academy',
        startDate: '2026-10-01',
        endDate: '2026-11-15',
        deliveryMethod: 'Online',
        meetingUrl: 'https://learning.staffsync.io/security-2026',
        createdBy: 'usr_sarah',
        createdByName: 'Sarah Jenkins',
        departmentIds: ['dept_eng', 'dept_mkt', 'dept_hr', 'dept_des'],
        status: 'In Progress',
        participants: [
          { employeeId: 'emp_alex', employeeName: 'Alex Rivera', departmentName: 'Engineering', status: 'Completed', progressPercent: 100, completionDate: '2026-10-10' },
          { employeeId: 'emp_priya', employeeName: 'Priya Sharma', departmentName: 'Engineering', status: 'In Progress', progressPercent: 65 },
          { employeeId: 'emp_jordan', employeeName: 'Jordan Lee', departmentName: 'Marketing & Growth', status: 'In Progress', progressPercent: 40 },
          { employeeId: 'emp_chloe', employeeName: 'Chloe Dupont', departmentName: 'Product & Design', status: 'Not Started', progressPercent: 0 },
          { employeeId: 'emp_dev', employeeName: 'Dev Patel', departmentName: 'Marketing & Growth', status: 'Completed', progressPercent: 100, completionDate: '2026-10-12' },
        ],
        createdAt: '2026-09-25T10:00:00.000Z',
        updatedAt: now.toISOString(),
      },
      {
        _id: 'trn_2',
        title: 'Modern Cloud Architecture & High-Performance Microservices',
        description: 'In-depth engineering workshop exploring container orchestration, event-driven systems, and database optimization for sub-millisecond query execution.',
        trainer: 'CloudScale Consulting (Senior Architect Dave Miller)',
        startDate: '2026-10-20',
        endDate: '2026-11-05',
        deliveryMethod: 'Hybrid',
        location: 'HQ Conference Room Alpha & Zoom',
        meetingUrl: 'https://meet.google.com/xyz-arch-train',
        createdBy: 'usr_marcus',
        createdByName: 'Marcus Vance',
        departmentIds: ['dept_eng'],
        status: 'Upcoming',
        participants: [
          { employeeId: 'emp_alex', employeeName: 'Alex Rivera', departmentName: 'Engineering', status: 'Not Started', progressPercent: 0 },
          { employeeId: 'emp_priya', employeeName: 'Priya Sharma', departmentName: 'Engineering', status: 'Not Started', progressPercent: 0 },
        ],
        createdAt: '2026-10-10T14:00:00.000Z',
        updatedAt: now.toISOString(),
      },
      {
        _id: 'trn_3',
        title: 'Effective Product Leadership & Inclusive Management',
        description: 'Executive leadership coaching program for managers and team leads on performance feedback, mentoring, and psychological safety in high-velocity teams.',
        trainer: 'LeadForward Institute',
        startDate: '2026-09-10',
        endDate: '2026-10-05',
        deliveryMethod: 'Online',
        createdBy: 'usr_sarah',
        createdByName: 'Sarah Jenkins',
        departmentIds: ['dept_eng', 'dept_mkt', 'dept_hr'],
        status: 'Completed',
        participants: [
          { employeeId: 'emp_marcus', employeeName: 'Marcus Vance', departmentName: 'Engineering', status: 'Completed', progressPercent: 100, completionDate: '2026-10-04' },
          { employeeId: 'emp_elena', employeeName: 'Elena Rostova', departmentName: 'Marketing & Growth', status: 'Completed', progressPercent: 100, completionDate: '2026-10-05' },
        ],
        createdAt: '2026-08-20T10:00:00.000Z',
        updatedAt: '2026-10-05T18:00:00.000Z',
      },
    ];

    // 8. Notifications
    this.data.notifications = [
      {
        _id: 'notif_1',
        recipientId: 'usr_marcus',
        type: 'leave',
        title: 'New Leave Request from Alex Rivera',
        message: 'Alex Rivera has requested 1 day of Casual Leave starting on next week. Review required.',
        relatedResourceType: 'Leave',
        relatedResourceId: 'leave_alex_1',
        isRead: false,
        actionLink: '/leaves',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: 'notif_2',
        recipientId: 'usr_sarah',
        type: 'leave',
        title: 'Manager Approved Leave: Chloe Dupont',
        message: 'Marcus Vance approved Chloe Dupont’s request for 2 days Annual Leave. Final HR decision required.',
        relatedResourceType: 'Leave',
        relatedResourceId: 'leave_chloe_1',
        isRead: false,
        actionLink: '/leaves',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        _id: 'notif_3',
        recipientId: 'usr_alex',
        type: 'training',
        title: 'Training Assigned: Cloud Architecture',
        message: 'You have been enrolled in "Modern Cloud Architecture & High-Performance Microservices" starting soon.',
        relatedResourceType: 'Training',
        relatedResourceId: 'trn_2',
        isRead: false,
        actionLink: '/trainings',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        _id: 'notif_4',
        recipientId: 'usr_alex',
        type: 'attendance',
        title: 'Check-In Confirmed',
        message: 'You successfully clocked in today at 8:55 AM (Present). Have a productive day!',
        relatedResourceType: 'Attendance',
        relatedResourceId: 'att_today_alex',
        isRead: true,
        actionLink: '/attendance',
        createdAt: today855.toISOString(),
      },
    ];

    // 9. Audit Logs
    this.data.auditLogs = [
      {
        _id: 'aud_1',
        actorId: 'usr_sarah',
        actorName: 'Sarah Jenkins',
        actorRole: 'hr',
        action: 'ATTENDANCE_CORRECTION',
        resourceType: 'Attendance',
        resourceId: 'att_2d_alex',
        timestamp: `${twoDaysAgo}T18:00:00.000Z`,
        metadata: {
          employeeId: 'emp_alex',
          employeeCode: 'EMP-101',
          date: twoDaysAgo,
          reason: 'Employee badge scanner misread on entry, confirmed by manager log.',
          oldStatus: 'Incomplete',
          newStatus: 'Present',
        },
      },
      {
        _id: 'aud_2',
        actorId: 'usr_sarah',
        actorName: 'Sarah Jenkins',
        actorRole: 'hr',
        action: 'LEAVE_HR_APPROVAL',
        resourceType: 'Leave',
        resourceId: 'leave_priya_1',
        timestamp: new Date(Date.now() - 4 * 86400000 + 7200000).toISOString(),
        metadata: {
          employeeId: 'emp_priya',
          duration: 2,
          type: 'sick',
          comment: 'Approved under regular sick policy.',
        },
      },
      {
        _id: 'aud_3',
        actorId: 'usr_sarah',
        actorName: 'Sarah Jenkins',
        actorRole: 'hr',
        action: 'ANNOUNCEMENT_PUBLISH',
        resourceType: 'Announcement',
        resourceId: 'ann_1',
        timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        metadata: {
          title: 'All-Hands Company Meeting & Q4 Strategy Kickoff',
          targetAudience: 'All',
        },
      },
    ];
  }
}

export const db = new JsonDatabase();
