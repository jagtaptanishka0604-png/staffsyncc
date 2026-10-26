import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Calendar,
  Award,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Briefcase,
  Users,
  Search,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { AppNotification } from '../types';
import { Badge } from './ui/Badge';

interface HeaderProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentView }) => {
  const { user, employee, demoLogin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Quiet fail on polling
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setIsDemoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, actionLink?: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (actionLink) {
        const view = actionLink.replace('/', '');
        if (view) onNavigate(view);
        setIsNotifOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const demoAccounts = [
    {
      role: 'hr',
      label: 'Sarah Jenkins',
      title: 'Head of People (HR Admin)',
      badge: 'HR Admin',
      email: 'hr@staffsync.io',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    {
      role: 'manager',
      label: 'Marcus Vance',
      title: 'Engineering Manager',
      badge: 'Manager',
      email: 'marcus.vance@staffsync.io',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      role: 'manager',
      label: 'Elena Rostova',
      title: 'Marketing Director',
      badge: 'Manager',
      email: 'elena.rostova@staffsync.io',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      role: 'employee',
      label: 'Alex Rivera',
      title: 'Senior Frontend Engineer',
      badge: 'Employee',
      email: 'alex.rivera@staffsync.io',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    {
      role: 'employee',
      label: 'Priya Sharma',
      title: 'Backend Systems Engineer',
      badge: 'Employee',
      email: 'priya.sharma@staffsync.io',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
      {/* Brand & Workspace info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-xs font-bold text-lg tracking-wider">
            S
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base">StaffSync</span>
              <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Acme Technologies Inc.</p>
          </div>
        </div>
      </div>

      {/* Right Controls: Demo Persona Switcher + Theme Toggle + Notifications + Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Demo Persona Switcher */}
        <div className="relative" ref={demoRef}>
          <button
            onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
            title="Switch demo persona to test HR, Manager, and Employee experiences"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline text-slate-500 dark:text-slate-400">Switch Persona:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
              {user?.name || 'Demo'}
            </span>
            <Badge
              variant={
                user?.role === 'hr'
                  ? 'purple'
                  : user?.role === 'manager'
                  ? 'info'
                  : 'success'
              }
              size="sm"
            >
              {user?.role?.toUpperCase()}
            </Badge>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isDemoMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Switch Role Persona</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instantly explore role-based permissions and workflows.
                </p>
              </div>
              <div className="p-1 space-y-1">
                {demoAccounts.map(demo => (
                  <button
                    key={demo.email}
                    onClick={async () => {
                      setIsDemoMenuOpen(false);
                      await demoLogin({ email: demo.email });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${
                      user?.email === demo.email ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800' : ''
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{demo.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{demo.title}</p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${demo.color}`}
                    >
                      {demo.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notification Center */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'All caught up!'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => handleMarkAsRead(n._id, n.actionLink)}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start space-x-3 ${
                        !n.isRead ? 'bg-indigo-50/30 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'leave' ? (
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-md">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                        ) : n.type === 'training' ? (
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 ml-2 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <img
              src={
                employee?.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              }
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role} Portal</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                  {employee?.jobTitle || (user?.role === 'hr' ? 'HR Administrator' : 'Staff')}
                </p>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigate('profile');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>My Profile & Settings</span>
                </button>
                <button
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
