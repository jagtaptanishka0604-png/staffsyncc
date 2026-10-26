import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  Edit2,
  Trash2,
  Shield,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Department, Employee } from '../types';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

export const DepartmentsView: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        api.getDepartments(),
        api.getEmployees(),
      ]);
      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (empRes.success) setEmployees(empRes.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      code: '',
      description: '',
      managerId: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setIsEditing(true);
    setSelectedDeptId(dept._id);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      managerId: dept.managerId || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        await api.updateDepartment(selectedDeptId, formData);
      } else {
        await api.createDepartment(formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const managersList = employees.filter(e => e.role === 'manager' || e.role === 'hr');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>Departments & Organizational Units</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structure your company divisions, assign department managers, and monitor team allocations.
          </p>
        </div>

        {isHR && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-xs text-slate-400">Loading units...</div>
        ) : (
          departments.map(dept => (
            <div
              key={dept._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg">
                    {dept.code}
                  </span>
                  <Badge variant={dept.isActive ? 'success' : 'neutral'} size="sm">
                    {dept.isActive ? 'Active Division' : 'Archived'}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{dept.name}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{dept.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center space-x-1.5 text-slate-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Head of Department:</span>
                    </span>
                    <span className="font-semibold text-slate-800">{dept.managerName || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center space-x-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>Total Employees:</span>
                    </span>
                    <span className="font-semibold text-slate-800">{dept.employeeCount || 0} members</span>
                  </div>
                </div>
              </div>

              {isHR && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenEdit(dept)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs flex items-center space-x-1 font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Unit</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Department' : 'Create Department'}
        description="Configure organizational division metadata and reporting structure."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="e.g. Platform Engineering"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
            <input
              type="text"
              required
              maxLength={6}
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500 font-mono uppercase"
              placeholder="e.g. ENG"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Head / Manager</label>
            <select
              value={formData.managerId}
              onChange={e => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
            >
              <option value="">Unassigned</option>
              {managersList.map(m => (
                <option key={m._id} value={m._id}>
                  {m.firstName} {m.lastName} ({m.jobTitle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-indigo-500"
              placeholder="Scope of responsibilities and focus areas..."
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
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
