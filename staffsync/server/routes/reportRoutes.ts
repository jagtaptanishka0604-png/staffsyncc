import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest } from '../auth.js';

export const reportRouter = Router();

// GET /api/v1/reports/attendance - Attendance trends & aggregates
reportRouter.get('/attendance', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;

  let employees = [...db.employees].filter(e => e.employmentStatus === 'Active');
  let attendances = [...db.attendances];

  if (user.role === 'manager' && currentEmp) {
    const teamEmpIds = employees
      .filter(e => e.managerId === currentEmp._id || e._id === currentEmp._id)
      .map(e => e._id);
    employees = employees.filter(e => teamEmpIds.includes(e._id));
    attendances = attendances.filter(a => teamEmpIds.includes(a.employeeId));
  }

  // Calculate 7-day trend
  const trendDays: { date: string; dayName: string; present: number; late: number; onLeave: number }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayAttendances = attendances.filter(a => a.attendanceDate === dateStr);
    const present = dayAttendances.filter(a => a.status === 'Present').length;
    const late = dayAttendances.filter(a => a.status === 'Late').length;

    // Check leaves on this date
    const onLeave = db.leaves.filter(
      l => l.status === 'Approved' && l.startDate <= dateStr && l.endDate >= dateStr
    ).length;

    trendDays.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      present,
      late,
      onLeave,
    });
  }

  // Department-wise breakdown
  const departmentBreakdown = db.departments.map(dept => {
    const deptEmps = employees.filter(e => e.departmentId === dept._id);
    const deptEmpIds = deptEmps.map(e => e._id);
    const deptTodayAtt = attendances.filter(
      a => a.attendanceDate === new Date().toISOString().split('T')[0] && deptEmpIds.includes(a.employeeId)
    );

    return {
      departmentId: dept._id,
      departmentName: dept.name,
      totalEmployees: deptEmps.length,
      presentToday: deptTodayAtt.filter(a => a.status === 'Present').length,
      lateToday: deptTodayAtt.filter(a => a.status === 'Late').length,
      attendanceRate: deptEmps.length > 0 ? Math.round((deptTodayAtt.length / deptEmps.length) * 100) : 0,
    };
  });

  return res.json({
    success: true,
    data: {
      trend: trendDays,
      departments: departmentBreakdown,
      totalActiveEmployees: employees.length,
    },
  });
});

// GET /api/v1/reports/leaves - Leave metrics & charts
reportRouter.get('/leaves', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;

  let leaves = [...db.leaves];
  let balances = [...db.leaveBalances];

  if (user.role === 'manager' && currentEmp) {
    const teamEmpIds = db.employees
      .filter(e => e.managerId === currentEmp._id || e._id === currentEmp._id)
      .map(e => e._id);
    leaves = leaves.filter(l => teamEmpIds.includes(l.employeeId));
    balances = balances.filter(b => teamEmpIds.includes(b.employeeId));
  }

  // Breakdown by leave type
  const typeMap: Record<string, { type: string; name: string; count: number; totalDays: number }> = {
    casual: { type: 'casual', name: 'Casual Leave', count: 0, totalDays: 0 },
    sick: { type: 'sick', name: 'Sick Leave', count: 0, totalDays: 0 },
    annual: { type: 'annual', name: 'Earned / Annual', count: 0, totalDays: 0 },
    unpaid: { type: 'unpaid', name: 'Unpaid Leave', count: 0, totalDays: 0 },
  };

  leaves.forEach(l => {
    if (typeMap[l.leaveTypeId]) {
      typeMap[l.leaveTypeId].count++;
      if (l.status === 'Approved') {
        typeMap[l.leaveTypeId].totalDays += l.duration;
      }
    }
  });

  const byStatus = [
    { status: 'Approved', count: leaves.filter(l => l.status === 'Approved').length, fill: '#10B981' },
    {
      status: 'Pending Manager',
      count: leaves.filter(l => l.status === 'Pending Manager Approval').length,
      fill: '#F59E0B',
    },
    {
      status: 'Pending HR',
      count: leaves.filter(l => l.status === 'Pending HR Approval').length,
      fill: '#6366F1',
    },
    { status: 'Rejected', count: leaves.filter(l => l.status === 'Rejected').length, fill: '#EF4444' },
    { status: 'Cancelled', count: leaves.filter(l => l.status === 'Cancelled').length, fill: '#9CA3AF' },
  ];

  return res.json({
    success: true,
    data: {
      byType: Object.values(typeMap),
      byStatus,
      totalRequests: leaves.length,
    },
  });
});

// GET /api/v1/reports/employees - Headcount, roles, departments
reportRouter.get('/employees', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const employees = db.employees;

  const departmentDistribution = db.departments.map(dept => {
    const count = employees.filter(e => e.departmentId === dept._id).length;
    return {
      department: dept.name,
      code: dept.code,
      count,
    };
  });

  const employmentTypeDistribution = [
    { type: 'Full-time', count: employees.filter(e => e.employmentType === 'Full-time').length },
    { type: 'Part-time', count: employees.filter(e => e.employmentType === 'Part-time').length },
    { type: 'Contract', count: employees.filter(e => e.employmentType === 'Contract').length },
    { type: 'Internship', count: employees.filter(e => e.employmentType === 'Internship').length },
  ];

  const statusDistribution = [
    { status: 'Active', count: employees.filter(e => e.employmentStatus === 'Active').length },
    { status: 'On Leave', count: employees.filter(e => e.employmentStatus === 'On Leave').length },
    { status: 'Terminated', count: employees.filter(e => e.employmentStatus === 'Terminated').length },
    { status: 'Resigned', count: employees.filter(e => e.employmentStatus === 'Resigned').length },
  ];

  return res.json({
    success: true,
    data: {
      totalEmployees: employees.length,
      departmentDistribution,
      employmentTypeDistribution,
      statusDistribution,
    },
  });
});

// GET /api/v1/reports/trainings - Training metrics
reportRouter.get('/trainings', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const trainings = db.trainings;
  let totalParticipants = 0;
  let completedParticipants = 0;
  let inProgressParticipants = 0;

  trainings.forEach(t => {
    t.participants.forEach(p => {
      totalParticipants++;
      if (p.status === 'Completed') completedParticipants++;
      if (p.status === 'In Progress') inProgressParticipants++;
    });
  });

  const completionRate = totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0;

  return res.json({
    success: true,
    data: {
      totalPrograms: trainings.length,
      totalParticipants,
      completedParticipants,
      inProgressParticipants,
      completionRate,
      programs: trainings.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        participantsCount: t.participants.length,
        completedCount: t.participants.filter(p => p.status === 'Completed').length,
      })),
    },
  });
});

// GET /api/v1/reports/export/:type - Download CSV export
reportRouter.get('/export/:type', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  let filename = `staffsync-${type}-${new Date().toISOString().split('T')[0]}.csv`;
  let csvContent = '';

  if (type === 'employees') {
    csvContent = 'Employee ID,First Name,Last Name,Email,Phone,Department,Job Title,Type,Status,Joining Date\n';
    db.employees.forEach(e => {
      const dept = db.departments.find(d => d._id === e.departmentId);
      csvContent += `"${e.employeeCode}","${e.firstName}","${e.lastName}","${e.email}","${e.phone}","${dept?.name || ''}","${e.jobTitle}","${e.employmentType}","${e.employmentStatus}","${e.joiningDate}"\n`;
    });
  } else if (type === 'attendance') {
    csvContent = 'Date,Employee Code,Employee Name,Check In,Check Out,Status,Worked Minutes,Source\n';
    db.attendances.forEach(a => {
      const emp = db.employees.find(e => e._id === a.employeeId);
      csvContent += `"${a.attendanceDate}","${emp?.employeeCode || ''}","${emp ? `${emp.firstName} ${emp.lastName}` : ''}","${a.checkIn}","${a.checkOut || ''}","${a.status}",${a.workedMinutes},"${a.source}"\n`;
    });
  } else if (type === 'leaves') {
    csvContent = 'Leave ID,Employee Name,Leave Type,Start Date,End Date,Duration (Days),Status,Reason\n';
    db.leaves.forEach(l => {
      const emp = db.employees.find(e => e._id === l.employeeId);
      csvContent += `"${l._id}","${emp ? `${emp.firstName} ${emp.lastName}` : ''}","${l.leaveTypeName}","${l.startDate}","${l.endDate}",${l.duration},"${l.status}","${(l.reason || '').replace(/"/g, '""')}"\n`;
    });
  } else if (type === 'trainings') {
    csvContent = 'Program Title,Trainer,Start Date,End Date,Delivery,Status,Total Participants,Completed\n';
    db.trainings.forEach(t => {
      const completed = t.participants.filter(p => p.status === 'Completed').length;
      csvContent += `"${t.title.replace(/"/g, '""')}","${t.trainer}","${t.startDate}","${t.endDate}","${t.deliveryMethod}","${t.status}",${t.participants.length},${completed}\n`;
    });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid export type. Supported: employees, attendance, leaves, trainings.' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvContent);
});
