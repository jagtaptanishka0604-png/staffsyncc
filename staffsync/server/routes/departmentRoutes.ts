import { Router, Response } from 'express';
import { db, Department } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest, logAudit } from '../auth.js';

export const departmentRouter = Router();

// GET /api/v1/departments
departmentRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const departments = db.departments.map(dept => {
    const mgr = dept.managerId ? db.employees.find(e => e._id === dept.managerId) : null;
    const employeeCount = db.employees.filter(
      e => e.departmentId === dept._id && e.employmentStatus === 'Active'
    ).length;

    return {
      ...dept,
      managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unassigned',
      employeeCount,
    };
  });

  return res.json({ success: true, count: departments.length, departments });
});

// POST /api/v1/departments - HR only
departmentRouter.post('/', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const { name, code, description, managerId } = req.body;

  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Department name and code are required.' });
  }

  const existing = db.departments.find(
    d => d.code.toUpperCase() === code.toUpperCase() || d.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ success: false, message: 'A department with this name or code already exists.' });
  }

  const now = new Date().toISOString();
  const newDept: Department = {
    _id: `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description: description ? description.trim() : '',
    managerId: managerId || undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.departments.push(newDept);
  db.save();

  logAudit(req.currentUser!._id, req.currentUser!.name, 'hr', 'DEPARTMENT_CREATED', 'Department', newDept._id, {
    name: newDept.name,
    code: newDept.code,
  });

  return res.status(201).json({ success: true, department: newDept });
});

// PATCH /api/v1/departments/:id - HR only
departmentRouter.patch('/:id', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const dept = db.departments.find(d => d._id === req.params.id);
  if (!dept) {
    return res.status(404).json({ success: false, message: 'Department not found.' });
  }

  const { name, code, description, managerId, isActive } = req.body;
  if (name !== undefined) dept.name = name.trim();
  if (code !== undefined) dept.code = code.trim().toUpperCase();
  if (description !== undefined) dept.description = description.trim();
  if (managerId !== undefined) dept.managerId = managerId || undefined;
  if (isActive !== undefined) dept.isActive = Boolean(isActive);

  dept.updatedAt = new Date().toISOString();
  db.save();

  logAudit(req.currentUser!._id, req.currentUser!.name, 'hr', 'DEPARTMENT_UPDATED', 'Department', dept._id, {
    name: dept.name,
  });

  return res.json({ success: true, department: dept });
});

// DELETE /api/v1/departments/:id - HR only
departmentRouter.delete('/:id', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const dept = db.departments.find(d => d._id === req.params.id);
  if (!dept) {
    return res.status(404).json({ success: false, message: 'Department not found.' });
  }

  // Check if any employees in department
  const activeEmps = db.employees.filter(e => e.departmentId === dept._id && e.employmentStatus === 'Active');
  if (activeEmps.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete department. There are ${activeEmps.length} active employees assigned to it. Reassign them first.`,
    });
  }

  dept.isActive = false;
  dept.updatedAt = new Date().toISOString();
  db.save();

  logAudit(req.currentUser!._id, req.currentUser!.name, 'hr', 'DEPARTMENT_DEACTIVATED', 'Department', dept._id);

  return res.json({ success: true, message: 'Department deactivated successfully.' });
});
