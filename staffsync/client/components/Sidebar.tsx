import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  Megaphone,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  User,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/Badge';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user, employee } = useAuth();
  const role = user?.role || 'employee';

  const hrNavItems = [
    { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employee Directory', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'attendance', label: 'Attendance & Corrections', icon: Clock },
    { id: 'leaves', label: 'Leave Management', icon: CalendarDays },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'trainings', label: 'Training Programs', icon: GraduationCap },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const managerNavItems = [
    { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'My Team', icon: Users },
    { id: 'attendance', label: 'Team Attendance', icon: Clock },
    { id: 'leaves', label: 'Leave Approvals', icon: CalendarDays },
    { id: 'trainings', label: 'Team Training', icon: GraduationCap },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'reports', label: 'Team Reports', icon: BarChart3 },
  ];

  const employeeNavItems = [
    { id: 'dashboard', label: 'My Workspace', icon: LayoutDashboard },
    { id: 'attendance', label: 'Clock In / Attendance', icon: Clock },
    { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'trainings', label: 'My Training', icon: GraduationCap },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const navItems =
    role === 'hr'
      ? hrNavItems
      : role === 'manager'
      ? managerNavItems
      : employeeNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-61px)] border-r border-slate-800">
      {/* Role Banner */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                role === 'hr'
                  ? 'bg-purple-500'
                  : role === 'manager'
                  ? 'bg-blue-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {role === 'hr' ? 'HR Portal' : role === 'manager' ? 'Manager Portal' : 'Employee Portal'}
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            v1.0
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div
          onClick={() => onNavigate('profile')}
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors"
        >
          <img
            src={
              employee?.profileImage ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
            }
            alt={user?.name}
            className="w-9 h-9 rounded-xl object-cover border border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {employee?.jobTitle || (role === 'hr' ? 'Head of People' : 'Employee')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
