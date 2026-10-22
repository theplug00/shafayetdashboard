import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserDB, SettingsDB } from '../services/database';
import { Modal, ConfirmDialog, Badge, Toast } from '../components/Common';
import { Settings as SettingsIcon, Store, Users, Plus, Trash2, Edit2, Shield, CreditCard, Receipt } from 'lucide-react';
import { User } from '../types';

export function SettingsPage() {
  const { settings, currentUser, refreshSettings, addAuditLog } = useApp();
  const [activeTab, setActiveTab] = useState<'business' | 'users' | 'payments'>('business');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Business Settings
  const [businessForm, setBusinessForm] = useState({
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    currency: settings.currency,
    taxRate: settings.taxRate.toString(),
    lowStockThreshold: settings.lowStockThreshold.toString(),
    receiptFormat: settings.receiptFormat,
  });

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    SettingsDB.update({
      ...businessForm,
      taxRate: parseFloat(businessForm.taxRate) || 0,
      lowStockThreshold: parseInt(businessForm.lowStockThreshold) || 5,
    });
    refreshSettings();
    addAuditLog('UPDATE', 'Settings', 'business', 'Business settings updated');
    setToast({ message: 'Business settings saved', type: 'success' });
  };

  const tabs = [
    { id: 'business' as const, label: 'Business Info', icon: Store },
    { id: 'users' as const, label: 'User Management', icon: Users },
    { id: 'payments' as const, label: 'Payment Methods', icon: CreditCard },
  ];

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Business Settings */}
      {activeTab === 'business' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input type="text" value={businessForm.businessName} onChange={e => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={businessForm.email} onChange={e => setBusinessForm({ ...businessForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={businessForm.phone} onChange={e => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select value={businessForm.currency} onChange={e => setBusinessForm({ ...businessForm, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
                  <option value="GHS">GHS - Ghana Cedi</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={businessForm.address} onChange={e => setBusinessForm({ ...businessForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={businessForm.taxRate} onChange={e => setBusinessForm({ ...businessForm, taxRate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                <input type="number" min="1" value={businessForm.lowStockThreshold} onChange={e => setBusinessForm({ ...businessForm, lowStockThreshold: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Format</label>
                <select value={businessForm.receiptFormat} onChange={e => setBusinessForm({ ...businessForm, receiptFormat: e.target.value as 'a4' | 'thermal' })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
                  <option value="thermal">80mm Thermal Receipt</option>
                  <option value="a4">A4 Invoice</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Management */}
      {activeTab === 'users' && <UserManagement />}

      {/* Payment Methods */}
      {activeTab === 'payments' && <PaymentMethods />}
    </div>
  );
}

// User Management Component
function UserManagement() {
  const { currentUser, addAuditLog } = useApp();
  const [users, setUsers] = useState<User[]>(UserDB.getAll());
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      setToast({ message: 'Cannot delete your own account', type: 'error' });
      return;
    }
    UserDB.delete(id);
    addAuditLog('DELETE', 'User', id, 'User deleted');
    setUsers(UserDB.getAll());
    setToast({ message: 'User deleted', type: 'success' });
  };

  const refreshUsers = () => setUsers(UserDB.getAll());

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        {currentUser?.role === 'admin' && (
          <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.username}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                    <Shield className="w-3 h-3 inline mr-1" />{user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setEditingUser(user)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                      <button onClick={() => setDeleteConfirm(user.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {(showAddUser || editingUser) && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setShowAddUser(false); setEditingUser(null); }}
          onSave={(data) => {
            if (editingUser) {
              UserDB.update(editingUser.id, data);
              addAuditLog('UPDATE', 'User', editingUser.id, `Updated user: ${data.name}`);
              setToast({ message: 'User updated', type: 'success' });
            } else {
              UserDB.create(data);
              addAuditLog('CREATE', 'User', '', `Added user: ${data.name}`);
              setToast({ message: 'User created', type: 'success' });
            }
            refreshUsers();
            setShowAddUser(false);
            setEditingUser(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete User"
        message="Are you sure you want to delete this user? This cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}

// User Form Modal
function UserFormModal({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    password: '',
    role: user?.role || 'cashier' as 'admin' | 'cashier',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!user && !form.password) errs.password = 'Password is required';
    if (form.password && form.password.length < 4) errs.password = 'Password must be at least 4 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data: any = { name: form.name.trim(), username: form.username.trim(), role: form.role };
    if (form.password) data.password = form.password;
    onSave(data);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={user ? 'Edit User' : 'Add New User'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
          <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.username ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} />
          {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password {user ? '(leave blank to keep)' : '*'}</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.password ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'cashier' })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
            <option value="cashier">Cashier</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            {user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Payment Methods Component
function PaymentMethods() {
  const { settings, refreshSettings, addAuditLog } = useApp();
  const [methods, setMethods] = useState<string[]>(settings.paymentMethods);
  const [newMethod, setNewMethod] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const addMethod = () => {
    if (!newMethod.trim()) return;
    if (methods.includes(newMethod.trim())) {
      setToast({ message: 'Payment method already exists', type: 'error' });
      return;
    }
    const updated = [...methods, newMethod.trim()];
    setMethods(updated);
    SettingsDB.update({ paymentMethods: updated });
    refreshSettings();
    addAuditLog('UPDATE', 'Settings', 'payments', `Added payment method: ${newMethod.trim()}`);
    setNewMethod('');
    setToast({ message: 'Payment method added', type: 'success' });
  };

  const removeMethod = (method: string) => {
    const updated = methods.filter(m => m !== method);
    setMethods(updated);
    SettingsDB.update({ paymentMethods: updated });
    refreshSettings();
    addAuditLog('UPDATE', 'Settings', 'payments', `Removed payment method: ${method}`);
    setToast({ message: 'Payment method removed', type: 'success' });
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <p className="text-sm text-gray-500 mb-4">Configure which payment methods are available when recording sales.</p>

        <div className="flex gap-2 mb-4">
          <input type="text" value={newMethod} onChange={e => setNewMethod(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMethod()}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
            placeholder="Add new payment method..." />
          <button onClick={addMethod} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Add
          </button>
        </div>

        <div className="space-y-2">
          {methods.map(method => (
            <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{method}</span>
              </div>
              <button onClick={() => removeMethod(method)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
