import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Award,
  Megaphone,
  ArrowRight,
  TrendingUp,
  Building2,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Attendance, Leave, Announcement, Training, LeaveBalance } from '../types';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, employee } = useAuth();
  const { showToast } = useToast();
  const role = user?.role || 'employee';

  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);

  // Review modal state for Manager/HR quick approval
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Attendance for self
      const attMeRes = await api.getAttendanceMe().catch(() => null);
      if (attMeRes?.success) {
        setTodayAttendance(attMeRes.today);
      }

      // 2. Organization attendance for HR / Manager
      if (role === 'hr' || role === 'manager') {
        const attRes = await api.getAttendance().catch(() => null);
        if (attRes?.success) {
          setAttendanceSummary(attRes.todaySummary);
        }
        const empRes = await api.getEmployees().catch(() => null);
        if (empRes?.success) {
          setEmployeeCount(empRes.count);
        }
      }

      // 3. Leaves
      const leavesRes = role === 'employee' ? await api.getLeavesMe().catch(() => null) : await api.getLeaves().catch(() => null);
      if (leavesRes?.success) {
        setLeaves(leavesRes.leaves || []);
      }

      // 4. Balances
      const balancesRes = await api.getLeaveBalancesMe().catch(() => null);
      if (balancesRes?.success) {
        setLeaveBalances(balancesRes.balances || []);
      }

      // 5. Announcements
      const annRes = await api.getAnnouncements().catch(() => null);
      if (annRes?.success) {
        setAnnouncements(annRes.announcements?.slice(0, 3) || []);
      }

      // 6. Trainings
      const trnRes = await api.getTrainings().catch(() => null);
      if (trnRes?.success) {
        setTrainings(trnRes.trainings?.slice(0, 3) || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const handleClockIn = async () => {
    try {
      const res = await api.checkIn();
      if (res.success) {
        setTodayAttendance(res.attendance);
        showToast(res.message || 'Clocked in successfully!', 'success');
        fetchDashboardData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await api.checkOut();
      if (res.success) {
        setTodayAttendance(res.attendance);
        showToast(res.message || 'Clocked out successfully!', 'success');
        fetchDashboardData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDecisionSubmit = async () => {
    if (!selectedLeave) return;
    setReviewLoading(true);
    try {
      if (role === 'manager') {
        await api.managerLeaveDecision(selectedLeave._id, {
          decision: reviewDecision,
          comment: reviewComment,
          rejectionReason: reviewDecision === 'reject' ? reviewComment : undefined,
        });
      } else if (role === 'hr') {
        await api.hrLeaveDecision(selectedLeave._id, {
          decision: reviewDecision,
          comment: reviewComment,
          rejectionReason: reviewDecision === 'reject' ? reviewComment : undefined,
        });
      }
      showToast(
        `Leave request successfully ${reviewDecision === 'approve' ? 'approved' : 'rejected'}.`,
        'success'
      );
      setSelectedLeave(null);
      setReviewComment('');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingLeaves = leaves.filter(l => {
    if (role === 'manager') return l.status === 'Pending Manager Approval';
    if (role === 'hr') return l.status === 'Pending HR Approval';
    return l.status.startsWith('Pending');
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-widest font-semibold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/20">
                {role === 'hr' ? 'HR Operations Command' : role === 'manager' ? 'Team Leadership Workspace' : 'Personal Workspace'}
              </span>
              <span className="text-xs text-indigo-300">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">
              Welcome back, {employee?.firstName || user?.name}!
            </h1>
            <p className="text-sm text-indigo-200 mt-1 max-w-xl">
              {role === 'hr'
                ? 'Organizational pulse: Oversee workforce compliance, attendance, leave approvals, and employee records.'
                : role === 'manager'
                ? `Manage your team members, review upcoming leave requests, and track skill development.`
                : 'Here is your daily overview. Track your attendance, leave balances, and professional learning goals.'}
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center space-x-3 shrink-0">
            {role === 'employee' ? (
              <button
                onClick={() => onNavigate('leaves')}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl border border-white/20 backdrop-blur-xs transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <Calendar className="w-4 h-4 text-white" />
                <span className="text-white">Apply for Leave</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('reports')}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl border border-white/20 backdrop-blur-xs transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-white">View Analytics</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Metrics Row */}
      {role === 'hr' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Workforce"
            value={employeeCount || '8'}
            subtitle="Active employees"
            icon={Users}
            color="indigo"
            onClick={() => onNavigate('employees')}
          />
          <StatCard
            title="Checked In Today"
            value={attendanceSummary?.checkedInTotal || '5'}
            subtitle={`${attendanceSummary?.presentCount || 4} on time, ${attendanceSummary?.lateCount || 1} late`}
            icon={Clock}
            color="emerald"
            onClick={() => onNavigate('attendance')}
          />
          <StatCard
            title="Pending HR Approvals"
            value={pendingLeaves.length}
            subtitle="Leave requests awaiting decision"
            icon={CalendarCheck}
            color="amber"
            onClick={() => onNavigate('leaves')}
          />
          <StatCard
            title="Active Programs"
            value={trainings.length}
            subtitle="Staff development workshops"
            icon={Award}
            color="purple"
            onClick={() => onNavigate('trainings')}
          />
        </div>
      )}

      {role === 'manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Team Members"
            value={employeeCount || '4'}
            subtitle="Direct reports"
            icon={Users}
            color="indigo"
            onClick={() => onNavigate('employees')}
          />
          <StatCard
            title="Team Checked In"
            value={attendanceSummary?.checkedInTotal || '3'}
            subtitle="On duty today"
            icon={Clock}
            color="emerald"
            onClick={() => onNavigate('attendance')}
          />
          <StatCard
            title="Pending Approvals"
            value={pendingLeaves.length}
            subtitle="Awaiting manager sign-off"
            icon={CalendarCheck}
            color="amber"
            onClick={() => onNavigate('leaves')}
          />
          <StatCard
            title="Team Workshops"
            value={trainings.length}
            subtitle="Active training courses"
            icon={Award}
            color="purple"
            onClick={() => onNavigate('trainings')}
          />
        </div>
      )}

      {role === 'employee' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Attendance"
            value={todayAttendance ? todayAttendance.status : 'Not Clocked In'}
            subtitle={
              todayAttendance
                ? `Clocked in: ${new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Please mark your check-in'
            }
            icon={Clock}
            color={todayAttendance?.status === 'Present' ? 'emerald' : todayAttendance ? 'amber' : 'rose'}
            onClick={() => onNavigate('attendance')}
          />
          <StatCard
            title="Casual Leave Balance"
            value={`${leaveBalances.find(b => b.leaveTypeId === 'casual')?.availableDays ?? 11} Days`}
            subtitle="Available this year"
            icon={Calendar}
            color="blue"
            onClick={() => onNavigate('leaves')}
          />
          <StatCard
            title="Earned / Annual Leave"
            value={`${leaveBalances.find(b => b.leaveTypeId === 'annual')?.availableDays ?? 18} Days`}
            subtitle="Paid time off"
            icon={CalendarCheck}
            color="emerald"
            onClick={() => onNavigate('leaves')}
          />
          <StatCard
            title="Assigned Trainings"
            value={trainings.length}
            subtitle="Courses enrolled"
            icon={Award}
            color="purple"
            onClick={() => onNavigate('trainings')}
          />
        </div>
      )}

      {/* Middle Interactive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Widget / Pending Approvals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Self-Service Attendance Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span>Daily Attendance & Session</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Server timestamp synchronized • UTC timezone
                </p>
              </div>
              <Badge
                variant={
                  todayAttendance?.status === 'Present'
                    ? 'success'
                    : todayAttendance?.status === 'Late'
                    ? 'warning'
                    : todayAttendance?.status === 'Half Day'
                    ? 'info'
                    : 'neutral'
                }
              >
                {todayAttendance ? todayAttendance.status : 'Not Clocked In'}
              </Badge>
            </div>

            <div className="py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Session Status</p>
                {todayAttendance ? (
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      Check-In: {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {todayAttendance.checkOut
                        ? `Check-Out: ${new Date(todayAttendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${(todayAttendance.workedMinutes / 60).toFixed(1)} hrs total)`
                        : `Session Active (${Math.round((Date.now() - new Date(todayAttendance.checkIn).getTime()) / 60000)} mins worked)`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-600">
                    You have not recorded attendance for today yet.
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {!todayAttendance ? (
                  <button
                    onClick={handleClockIn}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Clock In Now</span>
                  </button>
                ) : !todayAttendance.checkOut ? (
                  <button
                    onClick={handleClockOut}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Clock Out</span>
                  </button>
                ) : (
                  <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                    Session completed for today
                  </div>
                )}
                <button
                  onClick={() => onNavigate('attendance')}
                  className="px-3.5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-xl transition-colors"
                >
                  View Timesheet
                </button>
              </div>
            </div>
          </div>

          {/* Pending Leave Approvals (For HR and Manager) */}
          {(role === 'hr' || role === 'manager') && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                    <CalendarCheck className="w-5 h-5 text-amber-500" />
                    <span>
                      {role === 'manager' ? 'Team Leave Approvals' : 'HR Leave Approvals'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {pendingLeaves.length} request(s) awaiting your decision
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('leaves')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                >
                  <span>All Requests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No pending leave requests at this time.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {pendingLeaves.slice(0, 4).map(leave => (
                    <div key={leave._id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={leave.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                          alt={leave.employeeName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {leave.employeeName}{' '}
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({leave.departmentName})
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {leave.leaveTypeName} • {leave.duration} day(s) ({leave.startDate} to {leave.endDate})
                          </p>
                          <p className="text-[11px] text-slate-400 italic mt-0.5">
                            "{leave.reason}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setReviewDecision('approve');
                            setReviewComment('');
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setReviewDecision('reject');
                            setReviewComment('');
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Employee's Own Recent Leaves */}
          {role === 'employee' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">My Recent Leave Requests</h3>
                <button
                  onClick={() => onNavigate('leaves')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                >
                  <span>Apply or View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {leaves.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  You have not submitted any leave requests recently.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {leaves.slice(0, 3).map(l => (
                    <div key={l._id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {l.leaveTypeName} ({l.duration} Day{l.duration > 1 ? 's' : ''})
                        </p>
                        <p className="text-xs text-slate-500">
                          {l.startDate} to {l.endDate}
                        </p>
                      </div>
                      <Badge
                        variant={
                          l.status === 'Approved'
                            ? 'success'
                            : l.status.startsWith('Pending')
                            ? 'warning'
                            : l.status === 'Rejected'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {l.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Announcements & Training */}
        <div className="space-y-6">
          {/* Announcements Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Announcements</h3>
              </div>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {announcements.map(ann => (
                <div key={ann._id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ann.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900">{ann.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Training Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  {role === 'employee' ? 'My Trainings' : 'Training Workshops'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('trainings')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Explore
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {trainings.map(t => (
                <div key={t._id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[180px]">
                      {t.title}
                    </span>
                    <Badge variant={t.status === 'Completed' ? 'success' : 'info'} size="sm">
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Trainer: {t.trainer} • Starts: {t.startDate}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{t.deliveryMethod}</span>
                    <span>{t.participants.length} enrolled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal for Manager or HR decision */}
      <Modal
        isOpen={Boolean(selectedLeave)}
        onClose={() => setSelectedLeave(null)}
        title={reviewDecision === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        description={`Applicant: ${selectedLeave?.employeeName} (${selectedLeave?.leaveTypeName}, ${selectedLeave?.duration} day(s))`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-700">Applicant Reason:</p>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">
              {selectedLeave?.reason}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {reviewDecision === 'reject' ? 'Rejection Reason (Required)' : 'Reviewer Note / Comment (Optional)'}
            </label>
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder={
                reviewDecision === 'reject'
                  ? 'Please state why this request cannot be approved...'
                  : 'Add notes for the employee or next approval stage...'
              }
              rows={3}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setSelectedLeave(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDecisionSubmit}
              disabled={reviewLoading || (reviewDecision === 'reject' && !reviewComment.trim())}
              className={`px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors shadow-xs ${
                reviewDecision === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-50`}
            >
              {reviewLoading ? 'Processing...' : reviewDecision === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
