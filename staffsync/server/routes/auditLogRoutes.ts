import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest } from '../auth.js';

export const auditLogRouter = Router();

// GET /api/v1/audit-logs - HR only
auditLogRouter.get('/', authenticateUser, authorizeRoles('hr'), (req: AuthenticatedRequest, res: Response) => {
  const { action, resourceType, actorId } = req.query;

  let logs = [...db.auditLogs];

  if (action && typeof action === 'string') {
    logs = logs.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
  }

  if (resourceType && typeof resourceType === 'string') {
    logs = logs.filter(l => l.resourceType.toLowerCase() === resourceType.toLowerCase());
  }

  if (actorId && typeof actorId === 'string') {
    logs = logs.filter(l => l.actorId === actorId);
  }

  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return res.json({ success: true, count: logs.length, logs });
});
