import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building,
  CheckCircle,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Employee, Department } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const EmployeesView: React.FC = () => {
  const { user } = useAuth();
  const { showToast, confirmAction } = useToast();
  const isHR = user?.role === 'hr';
  const isManager = user?.role === 'manager';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewDetailsModal, setViewDetailsModal] = useState<Employee | null>(null);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    departmentId: '',
    managerId: '',
    jobTitle: '',
    employmentType: 'Full-time',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 95000,
    role: 'employee',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        api.getEmployees({
          search,
          department: selectedDept,
          status: selectedStatus,
          employmentType: selectedType,
        }),
        api.getDepartments(),
      ]);

      if (empRes.success) setEmployees(empRes.employees || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedDept, selectedStatus, selectedType]);

  const handleOpenAdd = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      departmentId: departments[0]?._id || '',
      managerId: '',
      jobTitle: '',
      employmentType: 'Full-time',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: 95000,
      role: 'employee',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      address: emp.address,
      departmentId: emp.departmentId,
      managerId: emp.managerId || '',
      jobTitle: emp.jobTitle,
      employmentType: emp.employmentType,
      joiningDate: emp.joiningDate,
      salary: emp.salary || 95000,
      role: emp.role || 'employee',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    try {
      const res = await api.createEmployee(formData);
      if (res.success) {
        setIsAddModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormSubmitting(true);
    setFormError('');
    try {
      const res = await api.updateEmployee(selectedEmployee._id, formData);
      if (res.success) {
        setIsEditModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivate = (id: string, name: string) => {
    confirmAction({
      title: 'Deactivate Employee Account',
      message: `Are you sure you want to deactivate ${name}? Their account will be suspended and access revoked.`,
      onConfirm: async () => {
        try {
          await api.deleteEmployee(id);
          showToast(`${name} has been deactivated.`, 'success');
          loadData();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      },
    });
  };

  const handleViewProfile = async (emp: Employee) => {
    try {
      const res = await api.getEmployee(emp._id);
      if (res.success) {
        setViewDetailsModal(res.employee);
      } else {
        setViewDetailsModal(emp);
      }
    } catch {
      setViewDetailsModal(emp);
    }
  };

  const managersList = employees.filter(e => e.role === 'manager' || e.role === 'hr');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Employee Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isHR
              ? 'Manage employee records, onboard new staff, assign departments, and configure managers.'
              : isManager
              ? 'View and support members of your engineering and product organizations.'
              : 'Browse colleagues across departments and view professional profiles.'}
          </p>
        </div>

        {isHR && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, email..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated / Inactive</option>
          </select>

          {/* Employment Type */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500 bg-slate-50/50"
          >
            <option value="">All Employment Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading directory...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No employees found</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">ID / Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Reporting Manager</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={emp.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                          alt={emp.firstName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900">
                              {emp.firstName} {emp.lastName}
                            </span>
                            {emp.isDirectReport && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-medium border border-indigo-100">
                                Direct Report
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px] block">{emp.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {emp.employeeCode}
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">{emp.jobTitle}</p>
                      <p className="text-[11px] text-slate-400">{emp.departmentName}</p>
                    </td>

                    {/* Manager */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {emp.managerName || 'Direct HR'}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.employmentType}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          emp.employmentStatus === 'Active'
                            ? 'success'
                            : emp.employmentStatus === 'On Leave'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {emp.employmentStatus}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleViewProfile(emp)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isHR && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Employee"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {emp.employmentStatus === 'Active' && (
                              <button
                                onClick={() =>
                                  handleDeactivate(emp._id, `${emp.firstName} ${emp.lastName}`)
                                }
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Deactivate Employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        description="Onboard an employee with system credentials, role, and leave allocation."
        maxWidth="xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
                placeholder="jane.doe@staffsync.io"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <select
                required
                value={formData.departmentId}
                onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
              <select
                value={formData.managerId}
                onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="">Direct to HR / No Manager</option>
                {managersList.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName} ({m.jobTitle})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={formData.jobTitle}
                onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Access Role *</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={e => setFormData({ ...formData, employmentType: e.target.value as any })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Salary ($)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="123 Market St, San Francisco, CA"
            />
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-700 space-y-1">
            <p className="font-semibold">Account Provisioning Notice:</p>
            <p>
              An automated user account will be generated with default password{' '}
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200">Password123!</code>.
              Standard leave balances (Casual 12d, Sick 10d, Annual 18d) will be automatically allocated.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs disabled:opacity-50"
            >
              {formSubmitting ? 'Creating Employee...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Employee: ${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`}
        description="Update administrative, compensation, and department information."
        maxWidth="xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                required
                value={formData.departmentId}
                onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                {departments.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
              <select
                value={formData.managerId}
                onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="">Direct to HR / No Manager</option>
                {managersList
                  .filter(m => m._id !== selectedEmployee?._id)
                  .map(m => (
                    <option key={m._id} value={m._id}>
                      {m.firstName} {m.lastName} ({m.jobTitle})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={formData.jobTitle}
                onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">System Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Salary ($)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs disabled:opacity-50"
            >
              {formSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Full Profile Modal */}
      <Modal
        isOpen={Boolean(viewDetailsModal)}
        onClose={() => setViewDetailsModal(null)}
        title="Employee Dossier"
        description="Comprehensive personal, employment, and leave overview."
        maxWidth="xl"
      >
        {viewDetailsModal && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <img
                src={viewDetailsModal.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                alt={viewDetailsModal.firstName}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    {viewDetailsModal.firstName} {viewDetailsModal.lastName}
                  </h3>
                  <Badge variant={viewDetailsModal.employmentStatus === 'Active' ? 'success' : 'danger'}>
                    {viewDetailsModal.employmentStatus}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-indigo-600">{viewDetailsModal.jobTitle}</p>
                <p className="text-xs text-slate-500">{viewDetailsModal.departmentName} Department</p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Employee Code: {viewDetailsModal.employeeCode}
                </p>
              </div>
            </div>

            {/* Contact & Employment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contact</p>
                <div className="flex items-center space-x-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewDetailsModal.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewDetailsModal.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{viewDetailsModal.address}</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employment</p>
                <p className="text-slate-700">
                  <span className="text-slate-400">Manager:</span> {viewDetailsModal.managerName || 'None'}
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400">Type:</span> {viewDetailsModal.employmentType}
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400">Joining Date:</span> {viewDetailsModal.joiningDate}
                </p>
                {isHR && viewDetailsModal.salary && (
                  <p className="text-slate-700 font-semibold">
                    <span className="text-slate-400 font-normal">Salary:</span> ${viewDetailsModal.salary.toLocaleString()} / year
                  </p>
                )}
              </div>
            </div>

            {/* Leave Balances Breakdown */}
            {viewDetailsModal.leaveBalances && viewDetailsModal.leaveBalances.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                  Leave Balance Allocations
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {viewDetailsModal.leaveBalances.map(lb => (
                    <div key={lb._id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <p className="text-[11px] text-slate-500 font-medium truncate">{lb.leaveTypeName}</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {lb.allocatedDays - (lb.usedDays + lb.pendingDays)} <span className="text-[10px] text-slate-400 font-normal">/ {lb.allocatedDays}d</span>
                      </p>
                      <p className="text-[10px] text-slate-400">{lb.usedDays} used</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewDetailsModal(null)}
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
