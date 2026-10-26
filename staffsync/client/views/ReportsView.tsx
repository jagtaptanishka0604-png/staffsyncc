import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CalendarDays,
  Award,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../api/client';
import { StatCard } from '../components/ui/StatCard';

export const ReportsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [attReport, setAttReport] = useState<any>(null);
  const [leaveReport, setLeaveReport] = useState<any>(null);
  const [empReport, setEmpReport] = useState<any>(null);
  const [trnReport, setTrnReport] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAttendanceReport(),
      api.getLeaveReport(),
      api.getEmployeeReport().catch(() => null),
      api.getTrainingReport().catch(() => null),
    ])
      .then(([att, leave, emp, trn]) => {
        if (att.success) setAttReport(att.data);
        if (leave.success) setLeaveReport(leave.data);
        if (emp?.success) setEmpReport(emp.data);
        if (trn?.success) setTrnReport(trn.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ['#10B981', '#F59E0B', '#6366F1', '#EF4444', '#94A3B8'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>Workforce Analytics & Export Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated organizational attendance trends, leave utilization, headcount distribution, and CSV reports.
          </p>
        </div>
      </div>

      {/* CSV Quick Export Cards */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5 mb-3">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>One-Click Authorized CSV Exports</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a
            href={api.getExportUrl('employees')}
            download
            className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-200">
                Employee Master Roster
              </p>
              <p className="text-[11px] text-slate-400">All contact & job details</p>
            </div>
            <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          </a>

          <a
            href={api.getExportUrl('attendance')}
            download
            className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-200">
                Attendance & Timesheets
              </p>
              <p className="text-[11px] text-slate-400">Punches & worked hours</p>
            </div>
            <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          </a>

          <a
            href={api.getExportUrl('leaves')}
            download
            className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-200">
                Leave Request Logs
              </p>
              <p className="text-[11px] text-slate-400">Approvals & allocations</p>
            </div>
            <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          </a>

          <a
            href={api.getExportUrl('trainings')}
            download
            className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-200">
                Training Workshop Stats
              </p>
              <p className="text-[11px] text-slate-400">Enrollment & completions</p>
            </div>
            <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. 7-Day Attendance Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">7-Day Attendance Trend</h3>
              <p className="text-xs text-slate-500">Daily check-in adherence across the company</p>
            </div>
          </div>

          <div className="h-64">
            {attReport?.trend ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attReport.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dayName" textAnchor="middle" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="present" name="Present (On Time)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="Late Arrival" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onLeave" name="On Approved Leave" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading trend...
              </div>
            )}
          </div>
        </div>

        {/* 2. Leave Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Leave Requests by Status</h3>
              <p className="text-xs text-slate-500">Workflow stage and decision proportions</p>
            </div>
          </div>

          <div className="h-64">
            {leaveReport?.byStatus ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveReport.byStatus.filter((s: any) => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name || ''} (${(((percent ?? 0) * 100)).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {leaveReport.byStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading leave metrics...
              </div>
            )}
          </div>
        </div>

        {/* 3. Leave Utilization by Category */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Leave Days Utilized by Category</h3>
              <p className="text-xs text-slate-500">Cumulative approved time off</p>
            </div>
          </div>

          <div className="h-64">
            {leaveReport?.byType ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveReport.byType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="totalDays" name="Approved Days Used" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="count" name="Total Request Count" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading categories...
              </div>
            )}
          </div>
        </div>

        {/* 4. Headcount by Department */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Department Workforce Distribution</h3>
              <p className="text-xs text-slate-500">Headcount across operational divisions</p>
            </div>
          </div>

          <div className="h-64">
            {empReport?.departmentDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={empReport.departmentDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Staff Members" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading distribution...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
