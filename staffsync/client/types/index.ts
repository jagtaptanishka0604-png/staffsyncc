export type UserRole = 'hr' | 'manager' | 'employee';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  lastLoginAt?: string;
}

export interface Employee {
  _id: string;
  employeeCode: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  departmentId: string;
  departmentName?: string;
  managerId?: string;
  managerName?: string;
  jobTitle: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  joiningDate: string;
  employmentStatus: 'Active' | 'On Leave' | 'Terminated' | 'Resigned';
  profileImage?: string;
  salary?: number;
  role?: UserRole;
  isDirectReport?: boolean;
  leaveBalances?: LeaveBalance[];
  recentAttendance?: Attendance[];
  recentLeaves?: Leave[];
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  managerId?: string;
  managerName?: string;
  employeeCount?: number;
  isActive: boolean;
}

export interface Attendance {
  _id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  profileImage?: string;
  attendanceDate: string; // YYYY-MM-DD
  checkIn: string; // ISO
  checkOut?: string; // ISO
  status: 'Present' | 'Late' | 'Half Day' | 'On Leave' | 'Absent';
  workedMinutes: number;
  source: 'Web Self-Service' | 'Biometric' | 'Manual HR Correction';
  correctionReason?: string;
  correctedByName?: string;
}

export interface LeaveApprovalHistory {
  stage: 'Manager' | 'HR' | 'Employee Cancellation';
  actorId: string;
  actorName: string;
  action: 'Approved' | 'Rejected' | 'Cancelled' | 'Submitted';
  comment?: string;
  timestamp: string;
}

export interface Leave {
  _id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  managerName?: string;
  profileImage?: string;
  leaveTypeId: 'casual' | 'sick' | 'annual' | 'unpaid';
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  status: 'Pending Manager Approval' | 'Pending HR Approval' | 'Approved' | 'Rejected' | 'Cancelled';
  approvalHistory: LeaveApprovalHistory[];
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
  availableDays: number;
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
  status: 'Published' | 'Draft' | 'Archived';
  createdAt: string;
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
  createdBy: string;
  createdByName: string;
  departmentIds: string[];
  participants: TrainingParticipant[];
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  recipientId: string;
  type: 'leave' | 'attendance' | 'announcement' | 'training' | 'profile' | 'system';
  title: string;
  message: string;
  relatedResourceType?: string;
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
}
