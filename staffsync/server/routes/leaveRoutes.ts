import { Router, Response } from 'express';
import { db, Leave, Notification, LeaveBalance } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest, logAudit } from '../auth.js';

export const leaveRouter = Router();

// Helper to calculate business or calendar days between two dates
function calculateDays(start: string, end: string, isHalfDay = false): number {
  if (isHalfDay) return 0.5;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

// GET /api/v1/leaves/balances/me - Employee's own leave balances
leaveRouter.get('/balances/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  const currentYear = new Date().getFullYear();
  let balances = db.leaveBalances.filter(b => b.employeeId === emp._id && b.periodYear === currentYear);

  // If none exists, initialize default
  if (balances.length === 0) {
    balances = [
      {
        _id: `lb_${emp._id}_casual`,
        employeeId: emp._id,
        leaveTypeId: 'casual',
        leaveTypeName: 'Casual Leave',
        periodYear: currentYear,
        allocatedDays: 12,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        _id: `lb_${emp._id}_sick`,
        employeeId: emp._id,
        leaveTypeId: 'sick',
        leaveTypeName: 'Sick Leave',
        periodYear: currentYear,
        allocatedDays: 10,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        _id: `lb_${emp._id}_annual`,
        employeeId: emp._id,
        leaveTypeId: 'annual',
        leaveTypeName: 'Earned / Annual Leave',
        periodYear: currentYear,
        allocatedDays: 18,
        usedDays: 0,
        pendingDays: 0,
        updatedAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString(),
      },
    ];
    db.leaveBalances.push(...balances);
    db.save();
  }

  const enriched = balances.map(b => ({
    ...b,
    availableDays: Math.max(0, b.allocatedDays - (b.usedDays + b.pendingDays)),
  }));

  return res.json({ success: true, balances: enriched });
});

// GET /api/v1/leaves/balances - HR & Manager view balances
leaveRouter.get('/balances', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { employeeId, departmentId } = req.query;

  let employees = [...db.employees];

  if (user.role === 'manager' && currentEmp) {
    employees = employees.filter(e => e.managerId === currentEmp._id || e._id === currentEmp._id);
  } else if (user.role === 'employee' && currentEmp) {
    employees = employees.filter(e => e._id === currentEmp._id);
  }

  if (employeeId && typeof employeeId === 'string') {
    employees = employees.filter(e => e._id === employeeId);
  }

  if (departmentId && typeof departmentId === 'string') {
    employees = employees.filter(e => e.departmentId === departmentId);
  }

  const results = employees.map(emp => {
    const dept = db.departments.find(d => d._id === emp.departmentId);
    const empBalances = db.leaveBalances.filter(b => b.employeeId === emp._id);
    return {
      employeeId: emp._id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.employeeCode,
      departmentName: dept?.name || 'Unassigned',
      balances: empBalances.map(b => ({
        ...b,
        availableDays: Math.max(0, b.allocatedDays - (b.usedDays + b.pendingDays)),
      })),
    };
  });

  return res.json({ success: true, count: results.length, data: results });
});

// GET /api/v1/leaves/me - Current user's leave requests
leaveRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  const requests = db.leaves
    .filter(l => l.employeeId === emp._id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json({ success: true, count: requests.length, leaves: requests });
});

// GET /api/v1/leaves - Organizational or team leave requests
leaveRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { status, employeeId, departmentId, leaveType } = req.query;

  let leaves = [...db.leaves];

  // RBAC scope
  if (user.role === 'manager' && currentEmp) {
    const teamEmpIds = db.employees
      .filter(e => e.managerId === currentEmp._id || e._id === currentEmp._id)
      .map(e => e._id);
    leaves = leaves.filter(l => teamEmpIds.includes(l.employeeId));
  } else if (user.role === 'employee' && currentEmp) {
    leaves = leaves.filter(l => l.employeeId === currentEmp._id);
  }

  // Filters
  if (status && typeof status === 'string') {
    leaves = leaves.filter(l => l.status === status);
  }

  if (employeeId && typeof employeeId === 'string') {
    leaves = leaves.filter(l => l.employeeId === employeeId);
  }

  if (leaveType && typeof leaveType === 'string') {
    leaves = leaves.filter(l => l.leaveTypeId === leaveType);
  }

  if (departmentId && typeof departmentId === 'string') {
    const deptEmpIds = db.employees.filter(e => e.departmentId === departmentId).map(e => e._id);
    leaves = leaves.filter(l => deptEmpIds.includes(l.employeeId));
  }

  const enriched = leaves
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(leave => {
      const emp = db.employees.find(e => e._id === leave.employeeId);
      const dept = emp ? db.departments.find(d => d._id === emp.departmentId) : null;
      const mgr = emp?.managerId ? db.employees.find(m => m._id === emp.managerId) : null;

      return {
        ...leave,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || '',
        departmentName: dept?.name || 'Unassigned',
        managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Direct HR',
        profileImage: emp?.profileImage || '',
      };
    });

  // Calculate summary metrics for dashboard tabs
  const pendingCount = enriched.filter(
    l => l.status === 'Pending Manager Approval' || l.status === 'Pending HR Approval'
  ).length;
  const approvedCount = enriched.filter(l => l.status === 'Approved').length;
  const rejectedCount = enriched.filter(l => l.status === 'Rejected').length;

  return res.json({
    success: true,
    count: enriched.length,
    leaves: enriched,
    summary: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: enriched.length,
    },
  });
});

// POST /api/v1/leaves - Submit leave application
leaveRouter.post('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  const user = req.currentUser!;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee record not found.' });
  }

  const { leaveTypeId, startDate, endDate, reason, isHalfDay } = req.body;

  if (!leaveTypeId || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, message: 'Leave type, start date, end date, and reason are required.' });
  }

  if (endDate < startDate) {
    return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
  }

  const duration = calculateDays(startDate, endDate, Boolean(isHalfDay));

  // Check overlapping active leaves
  const hasOverlap = db.leaves.some(
    l =>
      l.employeeId === emp._id &&
      (l.status === 'Pending Manager Approval' || l.status === 'Pending HR Approval' || l.status === 'Approved') &&
      !(endDate < l.startDate || startDate > l.endDate)
  );

  if (hasOverlap) {
    return res.status(400).json({
      success: false,
      message: 'You already have a pending or approved leave request overlapping with the selected dates.',
    });
  }

  // Check balance
  const balance = db.leaveBalances.find(
    b => b.employeeId === emp._id && b.leaveTypeId === leaveTypeId && b.periodYear === new Date().getFullYear()
  );

  if (!balance) {
    return res.status(400).json({ success: false, message: 'No leave balance record found for this leave type.' });
  }

  const available = balance.allocatedDays - (balance.usedDays + balance.pendingDays);
  if (leaveTypeId !== 'unpaid' && duration > available) {
    return res.status(400).json({
      success: false,
      message: `Insufficient leave balance. Requested ${duration} day(s), but only ${available} day(s) available.`,
    });
  }

  // Deduct atomically into pendingDays
  balance.pendingDays += duration;
  balance.updatedAt = new Date().toISOString();

  const nowIso = new Date().toISOString();

  // Determine starting status:
  // If applicant is manager, or has no assigned manager, skips to HR approval directly
  const hasManager = Boolean(emp.managerId && emp.managerId !== emp._id);
  const initialStatus: Leave['status'] =
    user.role === 'manager' || !hasManager ? 'Pending HR Approval' : 'Pending Manager Approval';

  const leaveTypeNameMap: Record<string, string> = {
    casual: 'Casual Leave',
    sick: 'Sick Leave',
    annual: 'Earned / Annual Leave',
    unpaid: 'Unpaid Leave',
  };

  const newLeave: Leave = {
    _id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId: emp._id,
    leaveTypeId,
    leaveTypeName: leaveTypeNameMap[leaveTypeId] || 'General Leave',
    startDate,
    endDate,
    duration,
    reason: reason.trim(),
    status: initialStatus,
    approvalHistory: [
      {
        stage: initialStatus === 'Pending HR Approval' ? 'HR' : 'Manager',
        actorId: user._id,
        actorName: user.name,
        action: 'Submitted',
        comment: `Leave application submitted for ${duration} day(s).`,
        timestamp: nowIso,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.leaves.unshift(newLeave);

  // Send notifications:
  // 1. If Pending Manager Approval, notify the manager
  if (initialStatus === 'Pending Manager Approval' && emp.managerId) {
    const mgrEmp = db.employees.find(e => e._id === emp.managerId);
    if (mgrEmp) {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: mgrEmp.userId,
        type: 'leave',
        title: `New Leave Request: ${emp.firstName} ${emp.lastName}`,
        message: `${emp.firstName} ${emp.lastName} requested ${duration} day(s) of ${newLeave.leaveTypeName} (${startDate} to ${endDate}).`,
        relatedResourceType: 'Leave',
        relatedResourceId: newLeave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    }
  } else {
    // Notify HR
    const hrUsers = db.users.filter(u => u.role === 'hr' && u.isActive);
    hrUsers.forEach(hr => {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: hr._id,
        type: 'leave',
        title: `Leave Request Awaiting HR Decision: ${emp.firstName} ${emp.lastName}`,
        message: `${emp.firstName} requested ${duration} day(s) of ${newLeave.leaveTypeName}.`,
        relatedResourceType: 'Leave',
        relatedResourceId: newLeave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    });
  }

  db.save();

  logAudit(user._id, user.name, user.role, 'LEAVE_SUBMITTED', 'Leave', newLeave._id, {
    employeeId: emp._id,
    duration,
    type: leaveTypeId,
    startDate,
    endDate,
  });

  return res.status(201).json({
    success: true,
    message: 'Leave application submitted successfully.',
    leave: newLeave,
  });
});

// PATCH /api/v1/leaves/:id/manager-decision - Manager approves or rejects
leaveRouter.patch('/:id/manager-decision', authenticateUser, authorizeRoles('manager', 'hr'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const leave = db.leaves.find(l => l._id === req.params.id);

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Leave request not found.' });
  }

  // Prevent self-approval (strict rule: "Managers cannot approve their own leave requests")
  if (leave.employeeId === currentEmp?._id) {
    return res.status(403).json({ success: false, message: 'Security restriction: You cannot review or approve your own leave request.' });
  }

  if (leave.status !== 'Pending Manager Approval') {
    return res.status(400).json({
      success: false,
      message: `Invalid stage. Current status is '${leave.status}', expecting 'Pending Manager Approval'.`,
    });
  }

  const { decision, comment, rejectionReason } = req.body; // decision: 'approve' | 'reject'
  if (!decision || (decision !== 'approve' && decision !== 'reject')) {
    return res.status(400).json({ success: false, message: "Decision must be 'approve' or 'reject'." });
  }

  if (decision === 'reject' && !rejectionReason && !comment) {
    return res.status(400).json({ success: false, message: 'A rejection reason is required when rejecting a leave request.' });
  }

  const nowIso = new Date().toISOString();
  const balance = db.leaveBalances.find(
    b => b.employeeId === leave.employeeId && b.leaveTypeId === leave.leaveTypeId
  );

  const empApplicant = db.employees.find(e => e._id === leave.employeeId);

  if (decision === 'approve') {
    leave.status = 'Pending HR Approval';
    leave.managerReviewerId = user._id;
    leave.approvalHistory.push({
      stage: 'Manager',
      actorId: user._id,
      actorName: user.name,
      action: 'Approved',
      comment: comment || 'Approved by team manager. Forwarded to HR.',
      timestamp: nowIso,
    });

    // Notify HR
    const hrUsers = db.users.filter(u => u.role === 'hr' && u.isActive);
    hrUsers.forEach(hr => {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: hr._id,
        type: 'leave',
        title: `Manager Approved: Leave for ${empApplicant?.firstName || 'Employee'}`,
        message: `${user.name} approved the request. Final HR approval is now pending.`,
        relatedResourceType: 'Leave',
        relatedResourceId: leave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    });

    // Notify employee of progress
    if (empApplicant) {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: empApplicant.userId,
        type: 'leave',
        title: 'Manager Approved Your Leave Request',
        message: `Your manager ${user.name} approved your leave request for ${leave.startDate}. It is now awaiting final HR approval.`,
        relatedResourceType: 'Leave',
        relatedResourceId: leave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    }
  } else {
    // Rejection by Manager
    leave.status = 'Rejected';
    leave.rejectionReason = rejectionReason || comment;
    leave.managerReviewerId = user._id;
    leave.approvalHistory.push({
      stage: 'Manager',
      actorId: user._id,
      actorName: user.name,
      action: 'Rejected',
      comment: leave.rejectionReason,
      timestamp: nowIso,
    });

    // Restore pending balance
    if (balance) {
      balance.pendingDays = Math.max(0, balance.pendingDays - leave.duration);
      balance.updatedAt = nowIso;
    }

    // Notify employee
    if (empApplicant) {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: empApplicant.userId,
        type: 'leave',
        title: 'Leave Request Rejected by Manager',
        message: `Your leave request for ${leave.startDate} was rejected. Reason: ${leave.rejectionReason}`,
        relatedResourceType: 'Leave',
        relatedResourceId: leave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    }
  }

  leave.updatedAt = nowIso;
  db.save();

  logAudit(user._id, user.name, user.role, `LEAVE_MANAGER_${decision.toUpperCase()}`, 'Leave', leave._id, {
    applicant: leave.employeeId,
    decision,
    comment: comment || rejectionReason,
  });

  return res.json({
    success: true,
    message: `Leave request ${decision === 'approve' ? 'approved and sent to HR' : 'rejected'}.`,
    leave,
  });
});

// PATCH /api/v1/leaves/:id/hr-decision - HR approves or rejects
leaveRouter.patch('/:id/hr-decision', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const leave = db.leaves.find(l => l._id === req.params.id);

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Leave request not found.' });
  }

  if (leave.status !== 'Pending HR Approval') {
    return res.status(400).json({
      success: false,
      message: `Invalid stage. Current status is '${leave.status}', expecting 'Pending HR Approval'.`,
    });
  }

  const { decision, comment, rejectionReason } = req.body;
  if (!decision || (decision !== 'approve' && decision !== 'reject')) {
    return res.status(400).json({ success: false, message: "Decision must be 'approve' or 'reject'." });
  }

  if (decision === 'reject' && !rejectionReason && !comment) {
    return res.status(400).json({ success: false, message: 'A rejection reason is required when rejecting a leave request.' });
  }

  const nowIso = new Date().toISOString();
  const balance = db.leaveBalances.find(
    b => b.employeeId === leave.employeeId && b.leaveTypeId === leave.leaveTypeId
  );
  const empApplicant = db.employees.find(e => e._id === leave.employeeId);

  if (decision === 'approve') {
    leave.status = 'Approved';
    leave.hrReviewerId = user._id;
    leave.approvalHistory.push({
      stage: 'HR',
      actorId: user._id,
      actorName: user.name,
      action: 'Approved',
      comment: comment || 'Final organizational HR approval granted.',
      timestamp: nowIso,
    });

    // Move pendingDays to usedDays
    if (balance) {
      balance.pendingDays = Math.max(0, balance.pendingDays - leave.duration);
      balance.usedDays += leave.duration;
      balance.updatedAt = nowIso;
    }

    // Notify employee
    if (empApplicant) {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: empApplicant.userId,
        type: 'leave',
        title: '🎉 Leave Request Approved!',
        message: `Your leave request for ${leave.startDate} to ${leave.endDate} (${leave.duration} day(s)) has been officially approved by HR.`,
        relatedResourceType: 'Leave',
        relatedResourceId: leave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    }
  } else {
    // Rejection by HR
    leave.status = 'Rejected';
    leave.rejectionReason = rejectionReason || comment;
    leave.hrReviewerId = user._id;
    leave.approvalHistory.push({
      stage: 'HR',
      actorId: user._id,
      actorName: user.name,
      action: 'Rejected',
      comment: leave.rejectionReason,
      timestamp: nowIso,
    });

    // Restore pending balance
    if (balance) {
      balance.pendingDays = Math.max(0, balance.pendingDays - leave.duration);
      balance.updatedAt = nowIso;
    }

    // Notify employee
    if (empApplicant) {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: empApplicant.userId,
        type: 'leave',
        title: 'Leave Request Rejected by HR',
        message: `Your leave request for ${leave.startDate} was rejected by HR. Reason: ${leave.rejectionReason}`,
        relatedResourceType: 'Leave',
        relatedResourceId: leave._id,
        isRead: false,
        actionLink: '/leaves',
        createdAt: nowIso,
      });
    }
  }

  leave.updatedAt = nowIso;
  db.save();

  logAudit(user._id, user.name, 'hr', `LEAVE_HR_${decision.toUpperCase()}`, 'Leave', leave._id, {
    applicant: leave.employeeId,
    decision,
    duration: leave.duration,
    comment: comment || rejectionReason,
  });

  return res.json({
    success: true,
    message: `Leave request ${decision === 'approve' ? 'approved' : 'rejected'}.`,
    leave,
  });
});

// PATCH /api/v1/leaves/:id/cancel - Employee or HR cancels leave
leaveRouter.patch('/:id/cancel', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const leave = db.leaves.find(l => l._id === req.params.id);

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Leave request not found.' });
  }

  // Only applicant or HR can cancel
  if (user.role !== 'hr' && leave.employeeId !== currentEmp?._id) {
    return res.status(403).json({ success: false, message: 'You are not authorized to cancel this leave request.' });
  }

  if (leave.status === 'Cancelled' || leave.status === 'Rejected') {
    return res.status(400).json({ success: false, message: `Leave is already ${leave.status}.` });
  }

  const nowIso = new Date().toISOString();
  const balance = db.leaveBalances.find(
    b => b.employeeId === leave.employeeId && b.leaveTypeId === leave.leaveTypeId
  );

  // Restore balance
  if (balance) {
    if (leave.status === 'Approved') {
      balance.usedDays = Math.max(0, balance.usedDays - leave.duration);
    } else {
      balance.pendingDays = Math.max(0, balance.pendingDays - leave.duration);
    }
    balance.updatedAt = nowIso;
  }

  leave.status = 'Cancelled';
  leave.approvalHistory.push({
    stage: 'Employee Cancellation',
    actorId: user._id,
    actorName: user.name,
    action: 'Cancelled',
    comment: 'Leave request cancelled by ' + (user.role === 'hr' ? 'HR' : 'employee') + '.',
    timestamp: nowIso,
  });
  leave.updatedAt = nowIso;

  db.save();

  logAudit(user._id, user.name, user.role, 'LEAVE_CANCELLED', 'Leave', leave._id, {
    applicant: leave.employeeId,
    durationRestored: leave.duration,
  });

  return res.json({ success: true, message: 'Leave request cancelled and balance restored.', leave });
});
