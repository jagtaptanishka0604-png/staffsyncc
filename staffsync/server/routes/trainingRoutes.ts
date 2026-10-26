import { Router, Response } from 'express';
import { db, Training, Notification, TrainingParticipant } from '../db.js';
import { authenticateUser, authorizeRoles, AuthenticatedRequest, logAudit } from '../auth.js';

export const trainingRouter = Router();

// GET /api/v1/trainings
trainingRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const { status, departmentId } = req.query;

  let trainings = [...db.trainings];

  // RBAC Filter
  if (user.role === 'employee' && currentEmp) {
    // Only see programs where they are assigned or open to their department
    trainings = trainings.filter(
      t =>
        t.participants.some(p => p.employeeId === currentEmp._id) ||
        (t.departmentIds && t.departmentIds.includes(currentEmp.departmentId))
    );
  }

  if (status && typeof status === 'string') {
    trainings = trainings.filter(t => t.status === status);
  }

  if (departmentId && typeof departmentId === 'string') {
    trainings = trainings.filter(t => t.departmentIds && t.departmentIds.includes(departmentId));
  }

  trainings.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return res.json({ success: true, count: trainings.length, trainings });
});

// POST /api/v1/trainings - Manager or HR creates
trainingRouter.post('/', authenticateUser, authorizeRoles('manager', 'hr'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const currentEmp = req.currentEmployee;
  const {
    title,
    description,
    trainer,
    startDate,
    endDate,
    deliveryMethod,
    location,
    meetingUrl,
    departmentIds = [],
    participantIds = [],
  } = req.body;

  if (!title || !description || !trainer || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Title, description, trainer, start date, and end date are required.' });
  }

  const nowIso = new Date().toISOString();

  // Build participants
  const participants: TrainingParticipant[] = [];
  if (Array.isArray(participantIds)) {
    participantIds.forEach((empId: string) => {
      const emp = db.employees.find(e => e._id === empId);
      if (emp) {
        const dept = db.departments.find(d => d._id === emp.departmentId);
        participants.push({
          employeeId: emp._id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: dept?.name || 'Unassigned',
          status: 'Not Started',
          progressPercent: 0,
        });
      }
    });
  }

  const newTraining: Training = {
    _id: `trn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    description: description.trim(),
    trainer: trainer.trim(),
    startDate,
    endDate,
    deliveryMethod: deliveryMethod || 'Online',
    location: location ? location.trim() : undefined,
    meetingUrl: meetingUrl ? meetingUrl.trim() : undefined,
    createdBy: user._id,
    createdByName: user.name,
    departmentIds,
    participants,
    status: startDate > nowIso.split('T')[0] ? 'Upcoming' : 'In Progress',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.trainings.unshift(newTraining);

  // Notify assigned participants
  participants.forEach(p => {
    const emp = db.employees.find(e => e._id === p.employeeId);
    if (emp) {
      db.notifications.unshift({
        _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: emp.userId,
        type: 'training',
        title: `Enrolled in Training: ${newTraining.title}`,
        message: `You have been enrolled in "${newTraining.title}" led by ${newTraining.trainer}. Starts on ${newTraining.startDate}.`,
        relatedResourceType: 'Training',
        relatedResourceId: newTraining._id,
        isRead: false,
        actionLink: '/trainings',
        createdAt: nowIso,
      });
    }
  });

  db.save();

  logAudit(user._id, user.name, user.role, 'TRAINING_CREATED', 'Training', newTraining._id, {
    title: newTraining.title,
    participantCount: participants.length,
  });

  return res.status(201).json({ success: true, training: newTraining });
});

// PATCH /api/v1/trainings/:id - Update program
trainingRouter.patch('/:id', authenticateUser, authorizeRoles('manager', 'hr'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const training = db.trainings.find(t => t._id === req.params.id);

  if (!training) {
    return res.status(404).json({ success: false, message: 'Training program not found.' });
  }

  if (user.role !== 'hr' && training.createdBy !== user._id) {
    return res.status(403).json({ success: false, message: 'You can only edit training programs you created.' });
  }

  const { title, description, trainer, startDate, endDate, deliveryMethod, location, meetingUrl, status, departmentIds } = req.body;
  if (title !== undefined) training.title = title.trim();
  if (description !== undefined) training.description = description.trim();
  if (trainer !== undefined) training.trainer = trainer.trim();
  if (startDate !== undefined) training.startDate = startDate;
  if (endDate !== undefined) training.endDate = endDate;
  if (deliveryMethod !== undefined) training.deliveryMethod = deliveryMethod;
  if (location !== undefined) training.location = location ? location.trim() : undefined;
  if (meetingUrl !== undefined) training.meetingUrl = meetingUrl ? meetingUrl.trim() : undefined;
  if (status !== undefined) training.status = status;
  if (departmentIds !== undefined) training.departmentIds = departmentIds;

  training.updatedAt = new Date().toISOString();
  db.save();

  logAudit(user._id, user.name, user.role, 'TRAINING_UPDATED', 'Training', training._id, {
    title: training.title,
  });

  return res.json({ success: true, training });
});

// DELETE /api/v1/trainings/:id - Delete program
trainingRouter.delete('/:id', authenticateUser, authorizeRoles('manager', 'hr'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const index = db.trainings.findIndex(t => t._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Training program not found.' });
  }

  const trn = db.trainings[index];
  if (user.role !== 'hr' && trn.createdBy !== user._id) {
    return res.status(403).json({ success: false, message: 'You can only delete programs you created.' });
  }

  db.trainings.splice(index, 1);
  db.save();

  logAudit(user._id, user.name, user.role, 'TRAINING_DELETED', 'Training', trn._id, { title: trn.title });

  return res.json({ success: true, message: 'Training program deleted.' });
});

// PATCH /api/v1/trainings/:id/progress - Update participant progress
trainingRouter.patch('/:id/progress', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const currentEmp = req.currentEmployee;
  const user = req.currentUser!;
  const training = db.trainings.find(t => t._id === req.params.id);

  if (!training) {
    return res.status(404).json({ success: false, message: 'Training not found.' });
  }

  const { employeeId, progressPercent, status } = req.body;
  const targetEmpId = employeeId || currentEmp?._id;

  // Authorization: normal employee can only update their own progress
  if (user.role === 'employee' && targetEmpId !== currentEmp?._id) {
    return res.status(403).json({ success: false, message: 'Unauthorized to update another employee’s progress.' });
  }

  let participant = training.participants.find(p => p.employeeId === targetEmpId);
  if (!participant && currentEmp) {
    // If user is enrolling themselves
    const dept = db.departments.find(d => d._id === currentEmp.departmentId);
    participant = {
      employeeId: currentEmp._id,
      employeeName: `${currentEmp.firstName} ${currentEmp.lastName}`,
      departmentName: dept?.name || 'General',
      status: 'In Progress',
      progressPercent: 0,
    };
    training.participants.push(participant);
  }

  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participant record not found in training.' });
  }

  if (progressPercent !== undefined) {
    participant.progressPercent = Math.min(100, Math.max(0, Number(progressPercent)));
  }

  if (status !== undefined) {
    participant.status = status;
  } else if (participant.progressPercent === 100) {
    participant.status = 'Completed';
    participant.completionDate = new Date().toISOString().split('T')[0];
  } else if (participant.progressPercent > 0) {
    participant.status = 'In Progress';
  }

  training.updatedAt = new Date().toISOString();
  db.save();

  return res.json({ success: true, message: 'Training progress updated.', training });
});

// POST /api/v1/trainings/:id/participants - Add participants
trainingRouter.post('/:id/participants', authenticateUser, authorizeRoles('manager', 'hr'), (req: AuthenticatedRequest, res: Response) => {
  const training = db.trainings.find(t => t._id === req.params.id);
  if (!training) {
    return res.status(404).json({ success: false, message: 'Training not found.' });
  }

  const { employeeIds } = req.body;
  if (!Array.isArray(employeeIds)) {
    return res.status(400).json({ success: false, message: 'employeeIds array is required.' });
  }

  employeeIds.forEach((empId: string) => {
    if (!training.participants.some(p => p.employeeId === empId)) {
      const emp = db.employees.find(e => e._id === empId);
      if (emp) {
        const dept = db.departments.find(d => d._id === emp.departmentId);
        training.participants.push({
          employeeId: emp._id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: dept?.name || 'Unassigned',
          status: 'Not Started',
          progressPercent: 0,
        });

        // Notify
        db.notifications.unshift({
          _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientId: emp.userId,
          type: 'training',
          title: `Assigned to Training: ${training.title}`,
          message: `You were enrolled into the training program "${training.title}".`,
          relatedResourceType: 'Training',
          relatedResourceId: training._id,
          isRead: false,
          actionLink: '/trainings',
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  training.updatedAt = new Date().toISOString();
  db.save();

  return res.json({ success: true, training });
});
