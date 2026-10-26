const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('staffsync_token');
}

export function setToken(token: string) {
  localStorage.setItem('staffsync_token', token);
}

export function clearToken() {
  localStorage.removeItem('staffsync_token');
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  demoLogin: (params: { role?: string; email?: string }) =>
    request('/auth/demo-login', { method: 'POST', body: JSON.stringify(params) }),

  getMe: () => request('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/auth/change-password', { method: 'PATCH', body: JSON.stringify(data) }),

  getDemoUsers: () => request('/auth/demo-users'),

  // Employees
  getEmployees: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/employees${q ? `?${q}` : ''}`);
  },

  getEmployee: (id: string) => request(`/employees/${id}`),

  getEmployeeMe: () => request('/employees/me'),

  updateEmployeeMe: (data: { phone?: string; address?: string }) =>
    request('/employees/me', { method: 'PATCH', body: JSON.stringify(data) }),

  createEmployee: (data: any) =>
    request('/employees', { method: 'POST', body: JSON.stringify(data) }),

  updateEmployee: (id: string, data: any) =>
    request(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteEmployee: (id: string) =>
    request(`/employees/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => request('/departments'),

  createDepartment: (data: any) =>
    request('/departments', { method: 'POST', body: JSON.stringify(data) }),

  updateDepartment: (id: string, data: any) =>
    request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteDepartment: (id: string) =>
    request(`/departments/${id}`, { method: 'DELETE' }),

  // Attendance
  checkIn: () => request('/attendance/check-in', { method: 'POST' }),

  checkOut: () => request('/attendance/check-out', { method: 'POST' }),

  getAttendanceMe: () => request('/attendance/me'),

  getAttendance: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/attendance${q ? `?${q}` : ''}`);
  },

  correctAttendance: (id: string, data: any) =>
    request(`/attendance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Leaves
  getLeaveBalancesMe: () => request('/leaves/balances/me'),

  getLeaveBalances: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/leaves/balances${q ? `?${q}` : ''}`);
  },

  getLeavesMe: () => request('/leaves/me'),

  getLeaves: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/leaves${q ? `?${q}` : ''}`);
  },

  applyLeave: (data: any) =>
    request('/leaves', { method: 'POST', body: JSON.stringify(data) }),

  managerLeaveDecision: (id: string, data: { decision: 'approve' | 'reject'; comment?: string; rejectionReason?: string }) =>
    request(`/leaves/${id}/manager-decision`, { method: 'PATCH', body: JSON.stringify(data) }),

  hrLeaveDecision: (id: string, data: { decision: 'approve' | 'reject'; comment?: string; rejectionReason?: string }) =>
    request(`/leaves/${id}/hr-decision`, { method: 'PATCH', body: JSON.stringify(data) }),

  cancelLeave: (id: string) =>
    request(`/leaves/${id}/cancel`, { method: 'PATCH' }),

  // Announcements
  getAnnouncements: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/announcements${q ? `?${q}` : ''}`);
  },

  createAnnouncement: (data: any) =>
    request('/announcements', { method: 'POST', body: JSON.stringify(data) }),

  updateAnnouncement: (id: string, data: any) =>
    request(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteAnnouncement: (id: string) =>
    request(`/announcements/${id}`, { method: 'DELETE' }),

  // Training
  getTrainings: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/trainings${q ? `?${q}` : ''}`);
  },

  createTraining: (data: any) =>
    request('/trainings', { method: 'POST', body: JSON.stringify(data) }),

  updateTraining: (id: string, data: any) =>
    request(`/trainings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteTraining: (id: string) =>
    request(`/trainings/${id}`, { method: 'DELETE' }),

  updateTrainingProgress: (id: string, data: { employeeId?: string; progressPercent?: number; status?: string }) =>
    request(`/trainings/${id}/progress`, { method: 'PATCH', body: JSON.stringify(data) }),

  addTrainingParticipants: (id: string, employeeIds: string[]) =>
    request(`/trainings/${id}/participants`, { method: 'POST', body: JSON.stringify({ employeeIds }) }),

  // Notifications
  getNotifications: () => request('/notifications'),

  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    request('/notifications/read-all', { method: 'PATCH' }),

  // Reports
  getAttendanceReport: () => request('/reports/attendance'),

  getLeaveReport: () => request('/reports/leaves'),

  getEmployeeReport: () => request('/reports/employees'),

  getTrainingReport: () => request('/reports/trainings'),

  getExportUrl: (type: string) => `/api/v1/reports/export/${type}`,

  // Audit Logs
  getAuditLogs: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/audit-logs${q ? `?${q}` : ''}`);
  },
};
