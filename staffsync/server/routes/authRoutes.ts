import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, authenticateUser, AuthenticatedRequest, logAudit } from '../auth.js';

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact HR.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    db.save();

    const employee = db.employees.find(e => e._id === user.employeeId);
    const department = employee ? db.departments.find(d => d._id === employee.departmentId) : null;

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    });

    logAudit(user._id, user.name, user.role, 'USER_LOGIN', 'User', user._id, { email: user.email });

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
      employee: employee
        ? {
            ...employee,
            departmentName: department?.name || 'General',
          }
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error during login: ' + err.message });
  }
});

// POST /api/v1/auth/demo-login
authRouter.post('/demo-login', async (req, res) => {
  try {
    const { role, email } = req.body;

    let user = email
      ? db.users.find(u => u.email.toLowerCase() === email.toLowerCase())
      : db.users.find(u => u.role === role && u.isActive);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Demo user account not found.' });
    }

    user.lastLoginAt = new Date().toISOString();
    db.save();

    const employee = db.employees.find(e => e._id === user.employeeId);
    const department = employee ? db.departments.find(d => d._id === employee.departmentId) : null;

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    });

    logAudit(user._id, user.name, user.role, 'DEMO_LOGIN', 'User', user._id, { demoRole: user.role });

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
      employee: employee
        ? {
            ...employee,
            departmentName: department?.name || 'General',
          }
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/auth/demo-users
authRouter.get('/demo-users', (req, res) => {
  const usersWithDetails = db.users
    .filter(u => u.isActive)
    .map(u => {
      const emp = db.employees.find(e => e._id === u.employeeId);
      const dept = emp ? db.departments.find(d => d._id === emp.departmentId) : null;
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        jobTitle: emp?.jobTitle || '',
        department: dept?.name || '',
        profileImage: emp?.profileImage || '',
      };
    });

  return res.json({ success: true, demoUsers: usersWithDetails });
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const employee = req.currentEmployee;
  const department = employee ? db.departments.find(d => d._id === employee.departmentId) : null;
  const manager = employee?.managerId ? db.employees.find(e => e._id === employee.managerId) : null;

  return res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      lastLoginAt: user.lastLoginAt,
    },
    employee: employee
      ? {
          ...employee,
          departmentName: department?.name || 'General',
          managerName: manager ? `${manager.firstName} ${manager.lastName}` : 'None',
        }
      : null,
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  if (req.currentUser) {
    logAudit(req.currentUser._id, req.currentUser.name, req.currentUser.role, 'USER_LOGOUT', 'User', req.currentUser._id);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// PATCH /api/v1/auth/change-password
authRouter.patch('/change-password', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    const user = req.currentUser!;
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.updatedAt = new Date().toISOString();
    db.save();

    logAudit(user._id, user.name, user.role, 'PASSWORD_CHANGE', 'User', user._id);

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
