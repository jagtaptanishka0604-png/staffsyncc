import { Router, Response } from 'express';
import { db, Attendance, Notification } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest, logAudit } from '../auth.js';

export const attendanceRouter = Router();

// Helper: Get local date string YYYY-MM-DD
function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// POST /api/v1/attendance/check-in - Employee checks in
attendanceRouter.post('/check-in', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee record not found.' });
  }

  const todayStr = getTodayDateStr();
  const existing = db.attendances.find(a => a.employeeId === emp._id && a.attendanceDate === todayStr);

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'You have already checked in for today (' + existing.checkIn.substring(11, 16) + ' UTC). Duplicate check-ins are prevented.',
      attendance: existing,
    });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Evaluate Late vs Present: Standard threshold 09:30:00 (local/UTC)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isLate = hours > 9 || (hours === 9 && minutes > 30);
  const status: Attendance['status'] = isLate ? 'Late' : 'Present';

  const newAttendance: Attendance = {
    _id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId: emp._id,
    attendanceDate: todayStr,
    checkIn: nowIso,
    status,
    workedMinutes: 0,
    source: 'Web Self-Service',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.attendances.push(newAttendance);

  // Send in-app notification
  const notif: Notification = {
    _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recipientId: req.currentUser!._id,
    type: 'attendance',
    title: 'Clocked In Successfully',
    message: `You marked attendance at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Status: ${status}.`,
    relatedResourceType: 'Attendance',
    relatedResourceId: newAttendance._id,
    isRead: false,
    actionLink: '/attendance',
    createdAt: nowIso,
  };
  db.notifications.unshift(notif);
  db.save();

  return res.status(201).json({
    success: true,
    message: `Checked in successfully as ${status}.`,
    attendance: newAttendance,
  });
});

// POST /api/v1/attendance/check-out - Employee checks out
attendanceRouter.post('/check-out', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee record not found.' });
  }

  const todayStr = getTodayDateStr();
  const attendance = db.attendances.find(a => a.employeeId === emp._id && a.attendanceDate === todayStr);

  if (!attendance) {
    return res.status(400).json({
      success: false,
      message: 'No active check-in found for today. You must check in before checking out.',
    });
  }

  if (attendance.checkOut) {
    return res.status(400).json({
      success: false,
      message: 'You have already checked out today at ' + attendance.checkOut.substring(11, 16) + ' UTC.',
      attendance,
    });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const checkInTime = new Date(attendance.checkIn).getTime();
  const checkOutTime = now.getTime();
  const diffMinutes = Math.max(1, Math.round((checkOutTime - checkInTime) / 60000));

  attendance.checkOut = nowIso;
  attendance.workedMinutes = diffMinutes;

  // Determine if half-day (< 4 hours = 240 mins) or full present
  if (diffMinutes < 240) {
    attendance.status = 'Half Day';
  } else if (attendance.status !== 'Late') {
    attendance.status = 'Present';
  }

  attendance.updatedAt = nowIso;

  // Create notification
  const hours = (diffMinutes / 60).toFixed(1);
  const notif: Notification = {
    _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recipientId: req.currentUser!._id,
    type: 'attendance',
    title: 'Clocked Out Successfully',
    message: `You marked check-out at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total session: ${hours} hours.`,
    relatedResourceType: 'Attendance',
    relatedResourceId: attendance._id,
    isRead: false,
    actionLink: '/attendance',
    createdAt: nowIso,
  };
  db.notifications.unshift(notif);
  db.save();

  return res.json({
    success: true,
    message: `Checked out successfully. Total worked: ${hours} hours.`,
    attendance,
  });
});

// GET /api/v1/attendance/me - Current user's attendance status & history
attendanceRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const emp = req.currentEmployee;
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee record not found.' });
  }

  const todayStr = getTodayDateStr();
  const todayRecord = db.attendances.find(a => a.employeeId === emp._id && a.attendanceDate === todayStr);

  const history = db.attendances
    .filter(a => a.employeeId === emp._id)
    .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
    .slice(0, 30);

  // Summary statistics for past 30 days
  const presentDays = history.filter(a => a.status === 'Present').length;
  const lateDays = history.filter(a => a.status === 'Late').length;
  const halfDays = history.filter(a => a.status === 'Half Day').length;
  const totalWorkedMinutes = history.reduce((sum, a) => sum + (a.workedMinutes || 0), 0);

  return res.json({
    success: true,
    today: todayRecord || null,
    history,
    stats: {
      totalDays: history.length,
      presentDays,
      lateDays,
      halfDays,
      totalHours: Number((totalWorkedMinutes / 60).toFixed(1)),
      averageHoursPerDay: history.length > 0 ? Number((totalWorkedMinutes / 60 / history.length).toFixed(1)) : 0,
    },
  });
});

// GET /api/v1/attendance - Organizational/Team attendance list with filters
attendanceRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { date, startDate, endDate, department, employeeId, status } = req.query;

  let attendances = [...db.attendances];

  // RBAC Filter:
  // Managers can view their team members + themselves
  if (user.role === 'manager' && currentEmp) {
    const teamEmpIds = db.employees
      .filter(e => e.managerId === currentEmp._id || e._id === currentEmp._id)
      .map(e => e._id);
    attendances = attendances.filter(a => teamEmpIds.includes(a.employeeId));
  } else if (user.role === 'employee' && currentEmp) {
    // Normal employee only views their own
    attendances = attendances.filter(a => a.employeeId === currentEmp._id);
  }

  // Query filters
  if (date && typeof date === 'string') {
    attendances = attendances.filter(a => a.attendanceDate === date);
  }

  if (startDate && typeof startDate === 'string') {
    attendances = attendances.filter(a => a.attendanceDate >= startDate);
  }

  if (endDate && typeof endDate === 'string') {
    attendances = attendances.filter(a => a.attendanceDate <= endDate);
  }

  if (employeeId && typeof employeeId === 'string') {
    attendances = attendances.filter(a => a.employeeId === employeeId);
  }

  if (status && typeof status === 'string') {
    attendances = attendances.filter(a => a.status === status);
  }

  // Filter by department
  if (department && typeof department === 'string') {
    const deptEmpIds = db.employees.filter(e => e.departmentId === department).map(e => e._id);
    attendances = attendances.filter(a => deptEmpIds.includes(a.employeeId));
  }

  // Enrich with employee & department info
  const enriched = attendances
    .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate) || b.checkIn.localeCompare(a.checkIn))
    .map(att => {
      const emp = db.employees.find(e => e._id === att.employeeId);
      const dept = emp ? db.departments.find(d => d._id === emp.departmentId) : null;
      const corrector = att.correctedBy ? db.users.find(u => u._id === att.correctedBy) : null;

      return {
        ...att,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || '',
        departmentName: dept?.name || 'Unassigned',
        profileImage: emp?.profileImage || '',
        correctedByName: corrector ? corrector.name : undefined,
      };
    });

  // Calculate high-level summary for the dashboard
  const todayStr = getTodayDateStr();
  const totalActiveEmployees = db.employees.filter(e => e.employmentStatus === 'Active').length;
  const todayRecords = db.attendances.filter(a => a.attendanceDate === todayStr);
  const presentCount = todayRecords.filter(a => a.status === 'Present').length;
  const lateCount = todayRecords.filter(a => a.status === 'Late').length;
  const halfDayCount = todayRecords.filter(a => a.status === 'Half Day').length;

  return res.json({
    success: true,
    count: enriched.length,
    attendances: enriched,
    todaySummary: {
      totalEmployees: totalActiveEmployees,
      presentCount,
      lateCount,
      halfDayCount,
      checkedInTotal: todayRecords.length,
      absentOrPendingCount: Math.max(0, totalActiveEmployees - todayRecords.length),
    },
  });
});

// PATCH /api/v1/attendance/:id - HR manual correction with required audit trail
attendanceRouter.patch('/:id', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const attendance = db.attendances.find(a => a.employeeId === req.params.id || a._id === req.params.id);

  if (!attendance) {
    return res.status(404).json({ success: false, message: 'Attendance record not found.' });
  }

  const { status, checkIn, checkOut, workedMinutes, correctionReason } = req.body;

  if (!correctionReason || correctionReason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'A detailed correction reason (at least 5 characters) is required for administrative audit compliance.',
    });
  }

  const oldValues = {
    status: attendance.status,
    checkIn: attendance.checkIn,
    checkOut: attendance.checkOut,
    workedMinutes: attendance.workedMinutes,
  };

  if (status) attendance.status = status;
  if (checkIn) attendance.checkIn = checkIn;
  if (checkOut) attendance.checkOut = checkOut;
  if (workedMinutes !== undefined) attendance.workedMinutes = Number(workedMinutes);

  attendance.source = 'Manual HR Correction';
  attendance.correctionReason = correctionReason.trim();
  attendance.correctedBy = req.currentUser!._id;
  attendance.updatedAt = new Date().toISOString();

  db.save();

  logAudit(
    req.currentUser!._id,
    req.currentUser!.name,
    'hr',
    'ATTENDANCE_CORRECTION',
    'Attendance',
    attendance._id,
    {
      employeeId: attendance.employeeId,
      attendanceDate: attendance.attendanceDate,
      reason: correctionReason,
      oldValues,
      newValues: {
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workedMinutes: attendance.workedMinutes,
      },
    }
  );

  return res.json({
    success: true,
    message: 'Attendance record corrected successfully and logged in the audit trail.',
    attendance,
  });
});
