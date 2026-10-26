import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Info,
  Calendar,
  X,
  Check,
  Ban,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Leave, LeaveBalance, Department } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';

export const LeavesView: React.FC = () => {
  const { user, employee } = useAuth();
  const { showToast, confirmAction } = useToast();
  const role = user?.role || 'employee';
  const isHR = role === 'hr';
  const isManager = role === 'manager';

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');

  // Apply Leave Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: 'casual',
    startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: '',
    isHalfDay: false,
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Review Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  // Approval History Modal
  const [historyModalLeave, setHistoryModalLeave] = useState<Leave | null>(null);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const [leavesRes, balancesRes, deptsRes] = await Promise.all([
        role === 'employee' ? api.getLeavesMe() : api.getLeaves({ departmentId: filterDept, leaveType: filterType }),
        api.getLeaveBalancesMe(),
        api.getDepartments(),
      ]);

      if (leavesRes.success) setLeaves(leavesRes.leaves || []);
      if (balancesRes.success) setBalances(balancesRes.balances || []);
      if (deptsRes.success) setDepartments(deptsRes.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [filterDept, filterType, role]);

  const calculateDuration = (start: string, end: string, isHalfDay: boolean) => {
    if (isHalfDay) return 0.5;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e < s) return 0;
    return Math.ceil((e - s) / 86400000) + 1;
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError('');

    try {
      const res = await api.applyLeave(applyForm);
      if (res.success) {
        setIsApplyModalOpen(false);
        loadLeaves();
      }
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setApplyLoading(false);
    }
  };

  const openDecisionModal = (leave: Leave, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setDecision(action);
    setDecisionComment('');
    setDecisionError('');
    setDecisionModalOpen(true);
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    setDecisionLoading(true);
    setDecisionError('');

    try {
      if (selectedLeave.status === 'Pending Manager Approval' && (isManager || isHR)) {
        await api.managerLeaveDecision(selectedLeave._id, {
          decision,
          comment: decisionComment,
          rejectionReason: decision === 'reject' ? decisionComment : undefined,
        });
      } else if (selectedLeave.status === 'Pending HR Approval' && isHR) {
        await api.hrLeaveDecision(selectedLeave._id, {
          decision,
          comment: decisionComment,
          rejectionReason: decision === 'reject' ? decisionComment : undefined,
        });
      }
      setDecisionModalOpen(false);
      loadLeaves();
    } catch (err: any) {
      setDecisionError(err.message);
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleCancelLeave = (id: string) => {
    confirmAction({
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request? Any deducted days will be refunded to your balance.',
      onConfirm: async () => {
        try {
          await api.cancelLeave(id);
          showToast('Leave request cancelled and balance restored.', 'success');
          loadLeaves();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      },
    });
  };

  // Filtered leaves according to tab
  const filteredLeaves = leaves.filter(l => {
    if (activeTab === 'pending') {
      return l.status.startsWith('Pending');
    }
    if (activeTab === 'approved') {
      return l.status === 'Approved';
    }
    if (activeTab === 'rejected') {
      return l.status === 'Rejected' || l.status === 'Cancelled';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            <span>Leave Management & Approvals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-stage manager and HR review workflow, leave allocation tracking, and calendar schedules.
          </p>
        </div>

        <button
          onClick={() => {
            setApplyError('');
            setIsApplyModalOpen(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          My Available Leave Balances ({new Date().getFullYear()})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {balances.map(b => (
            <div
              key={b._id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{b.leaveTypeName}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700">
                  {b.allocatedDays}d total
                </span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {b.availableDays}{' '}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-400">days left</span>
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400 mt-1">
                  <span>Used: {b.usedDays}d</span>
                  {b.pendingDays > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{b.pendingDays}d pending</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs and Department Filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium space-x-1 border border-transparent dark:border-slate-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'all' ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Requests ({leaves.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pending ({leaves.filter(l => l.status.startsWith('Pending')).length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Approved ({leaves.filter(l => l.status === 'Approved').length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'rejected'
                ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Rejected / Cancelled ({leaves.filter(l => l.status === 'Rejected' || l.status === 'Cancelled').length})
          </button>
        </div>

        {/* Filter controls */}
        {(isHR || isManager) && (
          <div className="flex items-center space-x-2">
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading leave requests...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No leave requests found</p>
            <p className="text-xs text-slate-500">There are no records matching the selected status or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Date Range</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Workflow Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map(leave => {
                  const isApplicant = leave.employeeId === employee?._id;
                  const canManagerReview =
                    (isManager || isHR) &&
                    leave.status === 'Pending Manager Approval' &&
                    !isApplicant; // Manager cannot approve own leave
                  const canHRReview = isHR && leave.status === 'Pending HR Approval';
                  const canCancel =
                    (isApplicant || isHR) &&
                    leave.status !== 'Cancelled' &&
                    leave.status !== 'Rejected';

                  return (
                    <tr key={leave._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Applicant */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={leave.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                            alt={leave.employeeName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {leave.employeeName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {leave.departmentName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {leave.leaveTypeName}
                      </td>

                      {/* Date Range */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {leave.startDate} → {leave.endDate}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {leave.duration} day{leave.duration > 1 ? 's' : ''}
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={leave.reason}>
                        {leave.reason}
                        {leave.rejectionReason && (
                          <span className="block text-[10px] text-rose-600 italic">
                            Rejected: {leave.rejectionReason}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            leave.status === 'Approved'
                              ? 'success'
                              : leave.status === 'Pending Manager Approval'
                              ? 'warning'
                              : leave.status === 'Pending HR Approval'
                              ? 'purple'
                              : leave.status === 'Rejected'
                              ? 'danger'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {leave.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Timeline history button */}
                          <button
                            onClick={() => setHistoryModalLeave(leave)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Approval History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Manager Review Action */}
                          {canManagerReview && (
                            <>
                              <button
                                onClick={() => openDecisionModal(leave, 'approve')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openDecisionModal(leave, 'reject')}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* HR Final Review Action */}
                          {canHRReview && (
                            <>
                              <button
                                onClick={() => openDecisionModal(leave, 'approve')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              >
                                HR Approve
                              </button>
                              <button
                                onClick={() => openDecisionModal(leave, 'reject')}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                              >
                                HR Reject
                              </button>
                            </>
                          )}

                          {/* Cancel eligible leave */}
                          {canCancel && !canManagerReview && !canHRReview && (
                            <button
                              onClick={() => handleCancelLeave(leave._id)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
        description="Submit a leave request for manager and HR approval."
        maxWidth="lg"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {applyError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Category *</label>
            <select
              required
              value={applyForm.leaveTypeId}
              onChange={e => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            >
              <option value="casual">Casual Leave (Available: {balances.find(b => b.leaveTypeId === 'casual')?.availableDays ?? 0} days)</option>
              <option value="sick">Sick Leave (Available: {balances.find(b => b.leaveTypeId === 'sick')?.availableDays ?? 0} days)</option>
              <option value="annual">Earned / Annual Leave (Available: {balances.find(b => b.leaveTypeId === 'annual')?.availableDays ?? 0} days)</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={applyForm.startDate}
                onChange={e => setApplyForm({ ...applyForm, startDate: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={applyForm.endDate}
                onChange={e => setApplyForm({ ...applyForm, endDate: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="halfDayToggle"
              checked={applyForm.isHalfDay}
              onChange={e => setApplyForm({ ...applyForm, isHalfDay: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="halfDayToggle" className="text-xs text-slate-700 font-medium cursor-pointer">
              Half-Day Leave (0.5 day)
            </label>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
            <span className="text-slate-500">Calculated Duration:</span>
            <span className="font-bold text-slate-900 text-sm">
              {calculateDuration(applyForm.startDate, applyForm.endDate, applyForm.isHalfDay)} day(s)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave *</label>
            <textarea
              required
              rows={3}
              value={applyForm.reason}
              onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="Provide context for your manager and HR..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applyLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs disabled:opacity-50"
            >
              {applyLoading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Decision Modal */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={decision === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        description={`Applicant: ${selectedLeave?.employeeName} (${selectedLeave?.leaveTypeName}, ${selectedLeave?.duration} day(s))`}
        maxWidth="md"
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4">
          {decisionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {decisionError}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-700">Applicant Reason:</p>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">
              "{selectedLeave?.reason}"
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {decision === 'reject' ? 'Rejection Reason (Mandatory) *' : 'Reviewer Comments (Optional)'}
            </label>
            <textarea
              required={decision === 'reject'}
              rows={3}
              value={decisionComment}
              onChange={e => setDecisionComment(e.target.value)}
              placeholder={
                decision === 'reject'
                  ? 'State why this request cannot be approved...'
                  : 'Add any remarks for the employee or HR records...'
              }
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDecisionModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={decisionLoading || (decision === 'reject' && !decisionComment.trim())}
              className={`px-4 py-2 text-white text-xs font-medium rounded-lg shadow-xs transition-colors ${
                decision === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-50`}
            >
              {decisionLoading ? 'Processing...' : decision === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval History Timeline Modal */}
      <Modal
        isOpen={Boolean(historyModalLeave)}
        onClose={() => setHistoryModalLeave(null)}
        title="Approval Workflow History"
        description={`Audit record for Leave Request #${historyModalLeave?._id}`}
        maxWidth="md"
      >
        {historyModalLeave && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-900">
                {historyModalLeave.employeeName} • {historyModalLeave.leaveTypeName}
              </p>
              <p className="text-slate-500">
                {historyModalLeave.startDate} to {historyModalLeave.endDate} ({historyModalLeave.duration} day(s))
              </p>
              <p className="text-slate-600 italic">"{historyModalLeave.reason}"</p>
            </div>

            <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {historyModalLeave.approvalHistory.map((h, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                      h.action === 'Approved'
                        ? 'bg-emerald-500'
                        : h.action === 'Rejected'
                        ? 'bg-rose-500'
                        : h.action === 'Cancelled'
                        ? 'bg-slate-400'
                        : 'bg-indigo-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">
                        {h.stage} Stage: {h.action}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">By: {h.actorName}</p>
                    {h.comment && (
                      <p className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-100 mt-1 italic">
                        "{h.comment}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setHistoryModalLeave(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
