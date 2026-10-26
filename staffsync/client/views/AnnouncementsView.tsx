import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Tag,
  AlertCircle,
  Calendar,
  User,
  Trash2,
  Edit,
  Pin,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Announcement, Department } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const AnnouncementsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast, confirmAction } = useToast();
  const isHR = user?.role === 'hr';
  const isManager = user?.role === 'manager';
  const canPublish = isHR || isManager;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Company News',
    priority: 'Medium',
    targetAudience: 'All',
    departmentIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const [annRes, deptRes] = await Promise.all([
        api.getAnnouncements({ category: categoryFilter, priority: priorityFilter }),
        api.getDepartments(),
      ]);
      if (annRes.success) setAnnouncements(annRes.announcements || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [categoryFilter, priorityFilter]);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      content: '',
      category: 'Company News',
      priority: 'Medium',
      targetAudience: isHR ? 'All' : 'Department',
      departmentIds: [],
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.createAnnouncement(formData);
      if (res.success) {
        setIsModalOpen(false);
        loadAnnouncements();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    confirmAction({
      title: 'Delete Announcement',
      message: 'Are you sure you want to permanently delete this announcement?',
      onConfirm: async () => {
        try {
          await api.deleteAnnouncement(id);
          showToast('Announcement deleted successfully.', 'success');
          loadAnnouncements();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            <span>Announcements & Internal Communications</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast organizational updates, policy changes, town hall schedules, and team notices.
          </p>
        </div>

        {canPublish && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50"
          >
            <option value="">All Categories</option>
            <option value="Company News">Company News</option>
            <option value="HR Updates">HR Updates</option>
            <option value="Policy Changes">Policy Changes</option>
            <option value="Events">Events</option>
            <option value="Training">Training</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">{announcements.length} announcement(s) published</span>
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading bulletins...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No announcements found</p>
            <p className="text-xs text-slate-500">There are no company updates matching your criteria.</p>
          </div>
        ) : (
          announcements.map(ann => {
            const isAuthor = ann.authorId === user?._id;
            const canDelete = isHR || isAuthor;

            return (
              <div
                key={ann._id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      {ann.category}
                    </span>
                    <Badge
                      variant={
                        ann.priority === 'Urgent'
                          ? 'danger'
                          : ann.priority === 'High'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {ann.priority} Priority
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Audience: <strong className="text-slate-600">{ann.targetAudience}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(ann.publishedAt).toLocaleDateString()}</span>
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(ann._id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3">
                  <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center space-x-1.5 font-medium text-slate-600">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {ann.authorName} • <span className="text-slate-400 font-normal">{ann.authorRole}</span>
                    </span>
                  </span>
                  <span className="text-[11px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100">
                    Verified Broadcast
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Publish Announcement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Announcement"
        description="Broadcast important news or policy updates to employees."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Headline / Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="e.g. Q4 Town Hall and Product Strategy Meeting"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="Company News">Company News</option>
                <option value="HR Updates">HR Updates</option>
                <option value="Policy Changes">Policy Changes</option>
                <option value="Events">Events</option>
                <option value="Training">Training</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
            <select
              value={formData.targetAudience}
              onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            >
              {isHR && <option value="All">All Company Employees</option>}
              <option value="Department">Department Specific</option>
              <option value="Managers Only">Managers Only</option>
            </select>
          </div>

          {formData.targetAudience === 'Department' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Department</label>
              <select
                onChange={e => setFormData({ ...formData, departmentIds: [e.target.value] })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="">Select Target Department</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content *</label>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write the full announcement text here..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
