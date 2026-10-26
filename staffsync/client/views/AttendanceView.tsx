import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Edit3,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Attendance, Department } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';

export const AttendanceView: React.FC = () => {
  const { user, employee } = useAuth();
  const { showToast } = useToast();
  const isHR = user?.role === 'hr';
  const isManager = user?.role === 'manager';

  const [activeTab, setActiveTab] = useState<'self' | 'organization'>('self');
  const [loading, setLoading] = useState(true);

  // Self attendance state
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [selfHistory, setSelfHistory] = useState<Attendance[]>([]);
  const [selfStats, setSelfStats] = useState<any>(null);

  // Organization attendance state
  const [orgAttendances, setOrgAttendances] = useState<Attendance[]>([]);
  const [orgSummary, setOrgSummary] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Org Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // HR Correction Modal
  const [correctModalOpen, setCorrectModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    status: 'Present',
    checkIn: '',
    checkOut: '',
    workedMinutes: 480,
    correctionReason: '',
  });
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionError, setCorrectionError] = useState('');

  const loadSelfAttendance = async () => {
    try {
      const res = await api.getAttendanceMe();
      if (res.success) {
        setTodayRecord(res.today);
        setSelfHistory(res.history || []);
        setSelfStats(res.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrgAttendance = async () => {
    try {
      const [attRes, deptRes] = await Promise.all([
        api.getAttendance({
          date: selectedDate,
          department: selectedDept,
          status: selectedStatus,
        }),
        api.getDepartments(),
      ]);

      if (attRes.success) {
        setOrgAttendances(attRes.attendances || []);
        setOrgSummary(attRes.todaySummary);
      }
      if (deptRes.success) {
        setDepartments(deptRes.departments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSelfAttendance(), (isHR || isManager) ? loadOrgAttendance() : Promise.resolve()])
      .finally(() => setLoading(false));
  }, [selectedDate, selectedDept, selectedStatus, isHR, isManager]);

  const handleClockIn = async () => {
    try {
      const res = await api.checkIn();
      if (res.success) {
        setTodayRecord(res.attendance);
        showToast(res.message || 'Clocked in successfully!', 'success');
        loadSelfAttendance();
        if (isHR || isManager) loadOrgAttendance();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await api.checkOut();
      if (res.success) {
        setTodayRecord(res.attendance);
        showToast(res.message || 'Clocked out successfully!', 'success');
        loadSelfAttendance();
        if (isHR || isManager) loadOrgAttendance();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openCorrectionModal = (record: Attendance) => {
    setSelectedRecord(record);
    setCorrectionForm({
      status: record.status,
      checkIn: record.checkIn,
      checkOut: record.checkOut || '',
      workedMinutes: record.workedMinutes || 480,
      correctionReason: record.correctionReason || '',
    });
    setCorrectionError('');
    setCorrectModalOpen(true);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setCorrectionLoading(true);
    setCorrectionError('');

    try {
      const res = await api.correctAttendance(selectedRecord._id, correctionForm);
      if (res.success) {
        setCorrectModalOpen(false);
        loadOrgAttendance();
        loadSelfAttendance();
      }
    } catch (err: any) {
      setCorrectionError(err.message);
    } finally {
      setCorrectionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            <span>Attendance & Time Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily punch-clock, shift tracking, organizational timesheets, and audit corrections.
          </p>
        </div>

        {/* View Switcher for HR/Manager */}
        {(isHR || isManager) && (
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('self')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'self'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Punch Clock
            </button>
            <button
              onClick={() => setActiveTab('organization')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'organization'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isHR ? 'Organization Timesheet' : 'Team Timesheet'}
            </button>
          </div>
        )}
      </div>

      {/* VIEW: Self Attendance */}
      {(activeTab === 'self' || (!isHR && !isManager)) && (
        <div className="space-y-6">
          {/* Daily Terminal Card */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                  Today's Attendance Session
                </span>
                <h3 className="text-2xl font-bold tracking-tight">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-slate-400">
                  Standard organization shift: 09:00 AM – 05:30 PM (Local/UTC)
                </p>
              </div>

              {/* Status Badge & Clock Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-[11px] text-slate-400 uppercase font-medium">Session Status</p>
                  <p className="text-lg font-bold text-white">
                    {todayRecord ? todayRecord.status : 'Not Clocked In'}
                  </p>
                  {todayRecord && (
                    <p className="text-xs text-indigo-300">
                      In: {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {todayRecord.checkOut && ` • Out: ${new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!todayRecord ? (
                    <button
                      onClick={handleClockIn}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Clock In</span>
                    </button>
                  ) : !todayRecord.checkOut ? (
                    <button
                      onClick={handleClockOut}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Clock Out</span>
                    </button>
                  ) : (
                    <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                      Shift Completed ({(todayRecord.workedMinutes / 60).toFixed(1)} hrs)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 30-Day Metrics */}
          {selfStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                title="Present Days"
                value={selfStats.presentDays}
                subtitle="Last 30 days"
                icon={CheckCircle2}
                color="emerald"
              />
              <StatCard
                title="Late Arrivals"
                value={selfStats.lateDays}
                subtitle="After 9:30 AM"
                icon={AlertTriangle}
                color="amber"
              />
              <StatCard
                title="Total Worked Hours"
                value={`${selfStats.totalHours} hrs`}
                subtitle={`Avg: ${selfStats.averageHoursPerDay} hrs/day`}
                icon={Clock}
                color="indigo"
              />
              <StatCard
                title="Half Days"
                value={selfStats.halfDays}
                subtitle="< 4 hours"
                icon={History}
                color="blue"
              />
            </div>
          )}

          {/* Personal History Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent Attendance History</h3>
              <span className="text-xs text-slate-400">{selfHistory.length} recorded day(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Worked Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selfHistory.map(att => (
                    <tr key={att._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900 font-mono">
                        {att.attendanceDate}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {att.checkOut
                          ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {att.workedMinutes ? `${(att.workedMinutes / 60).toFixed(1)} hrs` : 'In progress'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            att.status === 'Present'
                              ? 'success'
                              : att.status === 'Late'
                              ? 'warning'
                              : att.status === 'Half Day'
                              ? 'info'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {att.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {att.source}
                        {att.correctionReason && (
                          <span className="block text-[10px] text-amber-600 italic">
                            HR Corrected: {att.correctionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Organization / Team Attendance */}
      {activeTab === 'organization' && (isHR || isManager) && (
        <div className="space-y-6">
          {/* Summary Row */}
          {orgSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                title="Checked In Today"
                value={orgSummary.checkedInTotal}
                subtitle={`Out of ${orgSummary.totalEmployees} employees`}
                icon={CheckCircle2}
                color="indigo"
              />
              <StatCard
                title="On Time (Present)"
                value={orgSummary.presentCount}
                subtitle="Checked in before 9:30 AM"
                icon={Clock}
                color="emerald"
              />
              <StatCard
                title="Late Arrivals"
                value={orgSummary.lateCount}
                subtitle="Checked in after 9:30 AM"
                icon={AlertTriangle}
                color="amber"
              />
              <StatCard
                title="Absent / Pending"
                value={orgSummary.absentOrPendingCount}
                subtitle="No attendance recorded"
                icon={History}
                color="rose"
              />
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Attendance Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Org Attendances Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Attendance Roster for {selectedDate}
              </h3>
              <a
                href={api.getExportUrl('attendance')}
                download
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Verification</th>
                    {isHR && <th className="py-3 px-4 text-right">HR Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orgAttendances.map(att => (
                    <tr key={att._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={att.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                            alt={att.employeeName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {att.employeeName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {att.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{att.departmentName}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {att.checkOut
                          ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Active'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {att.workedMinutes ? `${(att.workedMinutes / 60).toFixed(1)} hrs` : 'In progress'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            att.status === 'Present'
                              ? 'success'
                              : att.status === 'Late'
                              ? 'warning'
                              : att.status === 'Half Day'
                              ? 'info'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {att.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <span>{att.source}</span>
                        {att.correctionReason && (
                          <span className="block text-[10px] text-amber-600 font-medium">
                            Corrected by {att.correctedByName || 'HR'}: {att.correctionReason}
                          </span>
                        )}
                      </td>
                      {isHR && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openCorrectionModal(att)}
                            className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg font-medium transition-colors"
                          >
                            Correct
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* HR Manual Correction Modal with Audit Requirement */}
      <Modal
        isOpen={correctModalOpen}
        onClose={() => setCorrectModalOpen(false)}
        title="Administrative Attendance Correction"
        description={`Employee: ${selectedRecord?.employeeName} (${selectedRecord?.attendanceDate}). This action will generate an immutable audit log entry.`}
        maxWidth="lg"
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          {correctionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {correctionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Corrected Status *
            </label>
            <select
              value={correctionForm.status}
              onChange={e => setCorrectionForm({ ...correctionForm, status: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-In Time</label>
              <input
                type="text"
                value={correctionForm.checkIn}
                onChange={e => setCorrectionForm({ ...correctionForm, checkIn: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-Out Time</label>
              <input
                type="text"
                value={correctionForm.checkOut}
                onChange={e => setCorrectionForm({ ...correctionForm, checkOut: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Worked Minutes (e.g. 480 = 8 hours)
            </label>
            <input
              type="number"
              value={correctionForm.workedMinutes}
              onChange={e => setCorrectionForm({ ...correctionForm, workedMinutes: Number(e.target.value) })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
            <label className="block text-xs font-bold text-amber-900">
              Audit Reason for Correction (Mandatory) *
            </label>
            <textarea
              required
              rows={3}
              value={correctionForm.correctionReason}
              onChange={e => setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })}
              placeholder="Explain the verified reason for this change (e.g. Biometric reader failure, manager approved early leave, etc.)..."
              className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:outline-amber-600"
            />
            <p className="text-[11px] text-amber-700">
              Your name, timestamp, and this explanation will be permanently recorded in the HR Audit Log.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCorrectModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={correctionLoading || correctionForm.correctionReason.trim().length < 5}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs disabled:opacity-50"
            >
              {correctionLoading ? 'Saving...' : 'Apply Correction & Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
