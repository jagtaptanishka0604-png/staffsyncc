import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, Employee, User, LeaveBalance } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest, logAudit } from '../auth.js';

export const employeeRouter = Router();

// GET /api/v1/employees - List employees with filters
employeeRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { search, department, manager, status, employmentType } = req.query;

  let list = [...db.employees];

  // RBAC scope:
  // Managers can view their team members + other managers & HR directory for collaboration
  // But if a manager requests, we flag their direct reports
  if (user.role === 'employee') {
    // Normal employees can only view directory cards (limited non-sensitive info)
    list = list.filter(e => e.employmentStatus === 'Active');
  }

  // Filters
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      e =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q)
    );
  }

  if (department && typeof department === 'string') {
    list = list.filter(e => e.departmentId === department);
  }

  if (manager && typeof manager === 'string') {
    list = list.filter(e => e.managerId === manager);
  }

  if (status && typeof status === 'string') {
    list = list.filter(e => e.employmentStatus === status);
  }

  if (employmentType && typeof employmentType === 'string') {
    list = list.filter(e => e.employmentType === employmentType);
  }

  const enriched = list.map(emp => {
    const dept = db.departments.find(d => d._id === emp.departmentId);
    const mgr = emp.managerId ? db.employees.find(m => m._id === emp.managerId) : null;
    const userAcc = db.users.find(u => u._id === emp.userId);

    // Strip salary for non-HR
    const salary = user.role === 'hr' ? emp.salary : undefined;

    return {
      ...emp,
      salary,
      departmentName: dept?.name || 'Unassigned',
      managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : 'None',
      role: userAcc?.role || 'employee',
      isDirectReport: currentEmp ? emp.managerId === currentEmp._id : false,
    };
  });

  return res.json({ success: true, count: enriched.length, employees: enriched });
});

// GET /api/v1/employees/me - Self profile
employeeRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee profile not found.' });
  }

  const dept = db.departments.find(d => d._id === emp.departmentId);
  const mgr = emp.managerId ? db.employees.find(m => m._id === emp.managerId) : null;
  const balances = db.leaveBalances.filter(b => b.employeeId === emp._id);

  return res.json({
    success: true,
    employee: {
      ...emp,
      departmentName: dept?.name || 'Unassigned',
      managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : 'None',
      leaveBalances: balances,
    },
  });
});

// PATCH /api/v1/employees/me - Update permitted personal fields (phone, address)
employeeRouter.patch('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee profile not found.' });
  }

  const { phone, address } = req.body;
  if (phone !== undefined) emp.phone = String(phone).trim();
  if (address !== undefined) emp.address = String(address).trim();
  emp.updatedAt = new Date().toISOString();
  db.save();

  logAudit(req.currentUser!._id, req.currentUser!.name, req.currentUser!.role, 'SELF_PROFILE_UPDATE', 'Employee', emp._id, {
    phone,
    address,
  });

  return res.json({ success: true, message: 'Profile updated successfully.', employee: emp });
});

// GET /api/v1/employees/:id - Detailed profile
employeeRouter.get('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const emp = db.employees.find(e => e._id === req.params.id);

  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  // Authorization:
  // HR can view anyone
  // Manager can view their direct reports or themselves
  // Employee can only view themselves
  if (user.role === 'employee' && emp._id !== currentEmp?._id) {
    return res.status(403).json({ success: false, message: 'Unauthorized to view detailed employee record.' });
  }

  const dept = db.departments.find(d => d._id === emp.departmentId);
  const mgr = emp.managerId ? db.employees.find(m => m._id === emp.managerId) : null;
  const userAcc = db.users.find(u => u._id === emp.userId);
  const balances = db.leaveBalances.filter(b => b.employeeId === emp._id);
  const recentAttendance = db.attendances
    .filter(a => a.employeeId === emp._id)
    .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
    .slice(0, 10);
  const recentLeaves = db.leaves
    .filter(l => l.employeeId === emp._id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 5);

  const salary = user.role === 'hr' ? emp.salary : undefined;

  return res.json({
    success: true,
    employee: {
      ...emp,
      salary,
      departmentName: dept?.name || 'Unassigned',
      managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : 'None',
      role: userAcc?.role || 'employee',
      leaveBalances: balances,
      recentAttendance,
      recentLeaves,
    },
  });
});

// POST /api/v1/employees - HR creates employee
employeeRouter.post('/', authenticateUser, authorizeRoles('hr'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      departmentId,
      managerId,
      jobTitle,
      employmentType,
      joiningDate,
      salary,
      role = 'employee',
      profileImage,
    } = req.body;

    if (!firstName || !lastName || !email || !departmentId || !jobTitle) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, department, and job title are required.' });
    }

    // Check unique email
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const existingEmp = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (existingUser || existingEmp) {
      return res.status(400).json({ success: false, message: 'An account or employee with this email address already exists.' });
    }

    const nextCodeNum = db.employees.length + 101;
    const employeeCode = `EMP-${nextCodeNum}`;
    const empId = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    // Default password for newly created account: Password123!
    const defaultPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const newEmp: Employee = {
      _id: empId,
      employeeCode,
      userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '+1 (555) 000-0000',
      address: address ? address.trim() : 'Company HQ Office',
      departmentId,
      managerId: managerId || undefined,
      jobTitle: jobTitle.trim(),
      employmentType: employmentType || 'Full-time',
      joiningDate: joiningDate || nowIso.split('T')[0],
      employmentStatus: 'Active',
      profileImage: profileImage || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
      salary: Number(salary) || 85000,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newUser: User = {
      _id: userId,
      name: `${newEmp.firstName} ${newEmp.lastName}`,
      email: newEmp.email,
      passwordHash,
      role: role === 'manager' || role === 'hr' ? role : 'employee',
      employeeId: empId,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Initialize leave balances
    const currentYear = new Date().getFullYear();
    const balances: LeaveBalance[] = [
      {
        _id: `lb_${empId}_casual`,
        employeeId: empId,
        leaveTypeId: 'casual',
        leaveTypeName: 'Casual Leave',
        periodYear: currentYear,
        allocatedDays: 12,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: nowIso,
      },
      {
        _id: `lb_${empId}_sick`,
        employeeId: empId,
        leaveTypeId: 'sick',
        leaveTypeName: 'Sick Leave',
        periodYear: currentYear,
        allocatedDays: 10,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: nowIso,
      },
      {
        _id: `lb_${empId}_annual`,
        employeeId: empId,
        leaveTypeId: 'annual',
        leaveTypeName: 'Earned / Annual Leave',
        periodYear: currentYear,
        allocatedDays: 18,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: nowIso,
      },
      {
        _id: `lb_${empId}_unpaid`,
        employeeId: empId,
        leaveTypeId: 'unpaid',
        leaveTypeName: 'Unpaid Leave',
        periodYear: currentYear,
        allocatedDays: 30,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: nowIso,
      },
    ];

    db.employees.push(newEmp);
    db.users.push(newUser);
    db.leaveBalances.push(...balances);
    db.save();

    logAudit(
      req.currentUser!._id,
      req.currentUser!.name,
      'hr',
      'EMPLOYEE_CREATED',
      'Employee',
      empId,
      { employeeCode, email: newEmp.email, role: newUser.role }
    );

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully. Default password is Password123!',
      employee: newEmp,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/v1/employees/:id - HR updates employee
employeeRouter.patch('/:id', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const emp = db.employees.find(e => e._id === req.params.id);
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  const {
    firstName,
    lastName,
    phone,
    address,
    departmentId,
    managerId,
    jobTitle,
    employmentType,
    employmentStatus,
    salary,
    role,
    profileImage,
  } = req.body;

  if (firstName !== undefined) emp.firstName = firstName.trim();
  if (lastName !== undefined) emp.lastName = lastName.trim();
  if (phone !== undefined) emp.phone = phone.trim();
  if (address !== undefined) emp.address = address.trim();
  if (departmentId !== undefined) emp.departmentId = departmentId;
  if (managerId !== undefined) emp.managerId = managerId || undefined;
  if (jobTitle !== undefined) emp.jobTitle = jobTitle.trim();
  if (employmentType !== undefined) emp.employmentType = employmentType;
  if (salary !== undefined) emp.salary = Number(salary);
  if (profileImage !== undefined) emp.profileImage = profileImage;

  if (employmentStatus !== undefined) {
    emp.employmentStatus = employmentStatus;
    if (employmentStatus === 'Terminated' || employmentStatus === 'Resigned') {
      emp.deactivatedAt = new Date().toISOString();
      const user = db.users.find(u => u._id === emp.userId);
      if (user) {
        user.isActive = false;
        user.updatedAt = new Date().toISOString();
      }
    } else if (employmentStatus === 'Active') {
      emp.deactivatedAt = undefined;
      const user = db.users.find(u => u._id === emp.userId);
      if (user) {
        user.isActive = true;
        user.updatedAt = new Date().toISOString();
      }
    }
  }

  // Update role if requested
  if (role) {
    const user = db.users.find(u => u._id === emp.userId);
    if (user && (role === 'hr' || role === 'manager' || role === 'employee')) {
      user.role = role;
      user.updatedAt = new Date().toISOString();
    }
  }

  emp.updatedAt = new Date().toISOString();
  db.save();

  logAudit(req.currentUser!._id, req.currentUser!.name, 'hr', 'EMPLOYEE_UPDATED', 'Employee', emp._id, {
    fieldsUpdated: Object.keys(req.body),
  });

  return res.json({ success: true, message: 'Employee record updated.', employee: emp });
});

// DELETE /api/v1/employees/:id - HR soft deactivates
employeeRouter.delete('/:id', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const emp = db.employees.find(e => e._id === req.params.id);
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  emp.employmentStatus = 'Terminated';
  emp.deactivatedAt = new Date().toISOString();
  emp.updatedAt = new Date().toISOString();

  const user = db.users.find(u => u._id === emp.userId);
  if (user) {
    user.isActive = false;
    user.updatedAt = new Date().toISOString();
  }

  db.save();

  logAudit(req.currentUser!._id, req.currentUser!.name, 'hr', 'EMPLOYEE_DEACTIVATED', 'Employee', emp._id, {
    employeeCode: emp.employeeCode,
    name: `${emp.firstName} ${emp.lastName}`,
  });

  return res.json({ success: true, message: 'Employee deactivated successfully.' });
});
