import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, User, Employee, AuditLog } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'staffsync_jwt_secure_development_secret_key_2026';
const ACCESS_TOKEN_TTL = '7d';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'hr' | 'manager' | 'employee';
  employeeId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
  currentUser?: User;
  currentEmployee?: Employee;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (err) {
    return null;
  }
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }

  const user = db.users.find(u => u._id === payload.userId && u.isActive);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
  }

  const employee = db.employees.find(e => e._id === user.employeeId);

  req.user = payload;
  req.currentUser = user;
  req.currentEmployee = employee;
  next();
}

export function authorizeRoles(...allowedRoles: Array<'hr' | 'manager' | 'employee'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles. Your role is '${req.user?.role}'.`,
      });
    }
    next();
  };
}

export function logAudit(
  actorId: string,
  actorName: string,
  actorRole: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, any>,
  ipAddress?: string
) {
  const audit: AuditLog = {
    _id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    actorId,
    actorName,
    actorRole,
    action,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
    metadata,
    ipAddress,
  };

  db.auditLogs.unshift(audit);
  if (db.auditLogs.length > 500) {
    db.auditLogs.pop();
  }
  db.save();
  return audit;
}
