import { Router, Response } from 'express';
import { db, Announcement, Notification } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest, logAudit } from '../auth.js';

export const announcementRouter = Router();

// GET /api/v1/announcements
announcementRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { category, priority, status } = req.query;

  let list = db.announcements.filter(a => {
    // If not HR, only see 'Published'
    if (user.role !== 'hr' && a.status !== 'Published') {
      return false;
    }

    // Target audience evaluation
    if (user.role === 'hr') return true;

    if (a.targetAudience === 'All') return true;

    if (a.targetAudience === 'Managers Only') {
      return user.role === 'manager';
    }

    if (a.targetAudience === 'Department' && a.departmentIds && currentEmp) {
      return a.departmentIds.includes(currentEmp.departmentId);
    }

    return true;
  });

  if (category && typeof category === 'string') {
    list = list.filter(a => a.category === category);
  }

  if (priority && typeof priority === 'string') {
    list = list.filter(a => a.priority === priority);
  }

  if (status && typeof status === 'string' && user.role === 'hr') {
    list = list.filter(a => a.status === status);
  }

  // Sort by publishedAt desc
  list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return res.json({ success: true, count: list.length, announcements: list });
});

// POST /api/v1/announcements - HR or Manager can publish
announcementRouter.post('/', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { title, content, category, targetAudience, departmentIds, priority = 'Medium', status = 'Published' } = req.body;

  if (!title || !content || !category) {
    return res.status(400).json({ success: false, message: 'Title, content, and category are required.' });
  }

  // Managers can only target their own department or team
  let effectiveAudience = targetAudience || 'All';
  let effectiveDeptIds = departmentIds || [];

  if (user.role === 'manager') {
    if (effectiveAudience === 'All') {
      effectiveAudience = 'Department';
    }
    if (currentEmp && (!effectiveDeptIds || effectiveDeptIds.length === 0)) {
      effectiveDeptIds = [currentEmp.departmentId];
    }
  }

  const nowIso = new Date().toISOString();
  const newAnn: Announcement = {
    _id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    content: content.trim(),
    category,
    authorId: user._id,
    authorName: user.name,
    authorRole: currentEmp?.jobTitle || (user.role === 'hr' ? 'HR Administrator' : 'Manager'),
    targetAudience: effectiveAudience,
    departmentIds: effectiveDeptIds,
    priority,
    publishedAt: nowIso,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.announcements.unshift(newAnn);

  // Send notifications to relevant users
  if (status === 'Published') {
    const recipients = db.users.filter(u => {
      if (u._id === user._id) return false;
      if (!u.isActive) return false;
      if (effectiveAudience === 'All') return true;
      if (effectiveAudience === 'Managers Only') return u.role === 'manager' || u.role === 'hr';
      if (effectiveAudience === 'Department') {
        const emp = db.employees.find(e => e._id === u.employeeId);
        return emp && effectiveDeptIds.includes(emp.departmentId);
      }
      return true;
    });

    recipients.forEach(r => {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: r._id,
        type: 'announcement',
        title: `Announcement: ${newAnn.title}`,
        message: `${newAnn.content.substring(0, 100)}${newAnn.content.length > 100 ? '...' : ''}`,
        relatedResourceType: 'Announcement',
        relatedResourceId: newAnn._id,
        isRead: false,
        actionLink: '/announcements',
        createdAt: nowIso,
      });
    });
  }

  db.save();

  logAudit(user._id, user.name, user.role, 'ANNOUNCEMENT_CREATED', 'Announcement', newAnn._id, {
    title: newAnn.title,
    audience: effectiveAudience,
  });

  return res.status(201).json({ success: true, announcement: newAnn });
});

// PATCH /api/v1/announcements/:id
announcementRouter.patch('/:id', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const ann = db.announcements.find(a => a._id === req.params.id);

  if (!ann) {
    return res.status(404).json({ success: false, message: 'Announcement not found.' });
  }

  if (user.role !== 'hr' && ann.authorId !== user._id) {
    return res.status(403).json({ success: false, message: 'You can only edit announcements you authored.' });
  }

  const { title, content, category, priority, status, targetAudience, departmentIds } = req.body;
  if (title !== undefined) ann.title = title.trim();
  if (content !== undefined) ann.content = content.trim();
  if (category !== undefined) ann.category = category;
  if (priority !== undefined) ann.priority = priority;
  if (status !== undefined) ann.status = status;
  if (targetAudience !== undefined && user.role === 'hr') ann.targetAudience = targetAudience;
  if (departmentIds !== undefined) ann.departmentIds = departmentIds;

  ann.updatedAt = new Date().toISOString();
  db.save();

  logAudit(user._id, user.name, user.role, 'ANNOUNCEMENT_UPDATED', 'Announcement', ann._id, {
    title: ann.title,
  });

  return res.json({ success: true, announcement: ann });
});

// DELETE /api/v1/announcements/:id
announcementRouter.delete('/:id', authenticateUser, authorizeRoles('hr', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const index = db.announcements.findIndex(a => a._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Announcement not found.' });
  }

  const ann = db.announcements[index];
  if (user.role !== 'hr' && ann.authorId !== user._id) {
    return res.status(403).json({ success: false, message: 'You can only delete announcements you authored.' });
  }

  db.announcements.splice(index, 1);
  db.save();

  logAudit(user._id, user.name, user.role, 'ANNOUNCEMENT_DELETED', 'Announcement', ann._id, {
    title: ann.title,
  });

  return res.json({ success: true, message: 'Announcement deleted.' });
});
