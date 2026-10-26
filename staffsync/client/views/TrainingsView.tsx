import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Calendar,
  ExternalLink,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Award,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Training, Employee, Department } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const TrainingsView: React.FC = () => {
  const { user, employee } = useAuth();
  const { showToast } = useToast();
  const isHR = user?.role === 'hr';
  const isManager = user?.role === 'manager';
  const canCreate = isHR || isManager;

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);

  // Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    trainer: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    deliveryMethod: 'Online',
    meetingUrl: '',
    location: '',
    departmentIds: [] as string[],
    participantIds: [] as string[],
  });
  const [progressForm, setProgressForm] = useState({
    progressPercent: 100,
    status: 'Completed',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const [trnRes, empRes, deptRes] = await Promise.all([
        api.getTrainings(),
        api.getEmployees(),
        api.getDepartments(),
      ]);
      if (trnRes.success) setTrainings(trnRes.trainings || []);
      if (empRes.success) setEmployees(empRes.employees || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
  }, []);

  const handleOpenCreate = () => {
    setCreateForm({
      title: '',
      description: '',
      trainer: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      deliveryMethod: 'Online',
      meetingUrl: 'https://meet.google.com/xyz-train-session',
      location: '',
      departmentIds: departments.map(d => d._id),
      participantIds: employees.map(e => e._id),
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await api.createTraining(createForm);
      if (res.success) {
        setIsCreateOpen(false);
        loadTrainings();
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenProgress = (training: Training) => {
    setSelectedTraining(training);
    const myEntry = training.participants.find(p => p.employeeId === employee?._id);
    setProgressForm({
      progressPercent: myEntry ? myEntry.progressPercent : 50,
      status: myEntry ? myEntry.status : 'In Progress',
    });
    setIsProgressOpen(true);
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraining) return;
    setSubmitting(true);

    try {
      const res = await api.updateTrainingProgress(selectedTraining._id, {
        employeeId: employee?._id,
        progressPercent: progressForm.progressPercent,
        status: progressForm.status,
      });
      if (res.success) {
        showToast('Training progress updated successfully!', 'success');
        setIsProgressOpen(false);
        loadTrainings();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span>Training & Professional Development</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Empower employee growth, manage skill certification programs, and track cohort completion.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Training Workshop</span>
          </button>
        )}
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-400">Loading programs...</div>
        ) : trainings.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No training programs enrolled</p>
            <p className="text-xs text-slate-500">Create or assign new training programs to get started.</p>
          </div>
        ) : (
          trainings.map(t => {
            const completedCount = t.participants.filter(p => p.status === 'Completed').length;
            const completionPercent =
              t.participants.length > 0 ? Math.round((completedCount / t.participants.length) * 100) : 0;
            const isEnrolled = t.participants.some(p => p.employeeId === employee?._id);
            const myEntry = t.participants.find(p => p.employeeId === employee?._id);

            return (
              <div
                key={t._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center space-x-1">
                      <Video className="w-3 h-3 text-indigo-500" />
                      <span>{t.deliveryMethod}</span>
                    </span>
                    <Badge
                      variant={
                        t.status === 'Completed'
                          ? 'success'
                          : t.status === 'In Progress'
                          ? 'info'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {t.status}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2.5">{t.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{t.description}</p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 text-slate-600">
                    <p>
                      <strong className="text-slate-800">Trainer / Provider:</strong> {t.trainer}
                    </p>
                    <p className="flex items-center space-x-1 font-mono text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {t.startDate} to {t.endDate}
                      </span>
                    </p>
                    {t.meetingUrl && (
                      <p className="flex items-center space-x-1 text-indigo-600 truncate">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <a href={t.meetingUrl} target="_blank" rel="noreferrer" className="underline truncate">
                          {t.meetingUrl}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Cohort Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Cohort Completion Rate:</span>
                      <span className="font-bold text-slate-900">
                        {completionPercent}% ({completedCount}/{t.participants.length} finished)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Enrolled Participants ({t.participants.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.participants.map(p => (
                        <span
                          key={p.employeeId}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1 ${
                            p.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {p.status === 'Completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          <span>{p.employeeName}</span>
                          <span className="text-slate-400 text-[10px]">({p.progressPercent}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {myEntry ? (
                    <span className="text-xs text-indigo-600 font-medium">
                      Your status: <strong>{myEntry.status}</strong> ({myEntry.progressPercent}%)
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Created by {t.createdByName}</span>
                  )}

                  <button
                    onClick={() => handleOpenProgress(t)}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Update Progress
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Program Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Training Program"
        description="Design a development course and enroll department team members."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Workshop Title *</label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="e.g. Distributed Systems & High-Velocity CI/CD"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="Outline objectives, syllabus, and expected prerequisites..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trainer / Instructor *</label>
              <input
                type="text"
                required
                value={createForm.trainer}
                onChange={e => setCreateForm({ ...createForm, trainer: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
                placeholder="Senior Architect Dave Miller"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Method</label>
              <select
                value={createForm.deliveryMethod}
                onChange={e => setCreateForm({ ...createForm, deliveryMethod: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="Online">Online / Virtual</option>
                <option value="In-Person">In-Person (HQ)</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={createForm.startDate}
                onChange={e => setCreateForm({ ...createForm, startDate: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={createForm.endDate}
                onChange={e => setCreateForm({ ...createForm, endDate: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Link or Location</label>
            <input
              type="text"
              value={createForm.meetingUrl}
              onChange={e => setCreateForm({ ...createForm, meetingUrl: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="https://meet.google.com/xyz or Room 402"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Launch Workshop'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Progress Update Modal */}
      <Modal
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        title="Update Training Progress"
        description={`Program: ${selectedTraining?.title}`}
        maxWidth="sm"
      >
        <form onSubmit={handleProgressSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Completion Percentage</span>
              <span className="text-indigo-600 text-sm font-bold">{progressForm.progressPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressForm.progressPercent}
              onChange={e => {
                const val = Number(e.target.value);
                setProgressForm({
                  progressPercent: val,
                  status: val === 100 ? 'Completed' : val > 0 ? 'In Progress' : 'Not Started',
                });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={progressForm.status}
              onChange={e =>
                setProgressForm({
                  ...progressForm,
                  status: e.target.value,
                  progressPercent: e.target.value === 'Completed' ? 100 : progressForm.progressPercent,
                })
              }
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            >
              <option value="Not Started">Not Started (0%)</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed (100%)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProgressOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs"
            >
              {submitting ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
