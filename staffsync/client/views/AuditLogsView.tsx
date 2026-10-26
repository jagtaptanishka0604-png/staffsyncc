import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  Terminal,
} from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { Badge } from '../components/ui/Badge';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter,
        resourceType: resourceFilter,
      });
      if (res.success) setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, resourceFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <span>Administrative Audit Trail & Compliance</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of HR overrides, attendance corrections, leave determinations, and account activities.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            placeholder="Filter by action (e.g. CORRECTION)..."
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50"
          />

          <select
            value={resourceFilter}
            onChange={e => setResourceFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50"
          >
            <option value="">All Resource Types</option>
            <option value="Attendance">Attendance</option>
            <option value="Leave">Leave</option>
            <option value="Employee">Employee</option>
            <option value="User">User</option>
            <option value="Department">Department</option>
            <option value="Announcement">Announcement</option>
            <option value="Training">Training</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">{logs.length} logged event(s)</span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No audit log entries matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map(log => {
                  const isExpanded = expandedLogId === log._id;
                  return (
                    <React.Fragment key={log._id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 font-sans">
                            {log.actorName}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">({log.actorRole})</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-sans">
                          <span className="font-medium text-slate-900">{log.resourceType}:</span>{' '}
                          <span className="font-mono text-slate-500">{log.resourceId}</span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect Payload'}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950 text-slate-200">
                          <td colSpan={5} className="p-4">
                            <div className="flex items-center space-x-2 text-indigo-400 text-xs mb-1 font-sans font-semibold">
                              <Terminal className="w-3.5 h-3.5" />
                              <span>Audit Payload Metadata</span>
                            </div>
                            <pre className="text-[11px] overflow-x-auto text-emerald-400 p-2 bg-slate-900 rounded-lg">
                              {JSON.stringify(log.metadata || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
