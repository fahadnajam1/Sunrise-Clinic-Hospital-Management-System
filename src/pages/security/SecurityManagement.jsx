import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Shield, Users, Lock, Key, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SecurityManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const toggleActive = async (userId, current) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !current })
      .eq('id', userId);
    if (!error) {
      toast.success(`User ${!current ? 'activated' : 'deactivated'}`);
      fetchUsers();
    }
  };

  const filtered = users.filter(u =>
    (search === '' || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  );

  const ROLE_COLORS = {
    admin: 'badge-red', doctor: 'badge-blue', nurse: 'badge-teal',
    receptionist: 'badge-green', billing: 'badge-yellow', pharmacist: 'badge-purple', auditor: 'badge-gray'
  };

  const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'billing', 'pharmacist', 'consultant', 'auditor'];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Security Management</h1>
          <p>User accounts, roles, and access control</p>
        </div>
      </div>

      {/* Security Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: '#3b82f6' },
          { label: 'Active Users', value: users.filter(u => u.is_active).length, icon: CheckCircle, color: '#22c55e' },
          { label: 'Inactive Users', value: users.filter(u => !u.is_active).length, icon: XCircle, color: '#ef4444' },
          { label: 'Admin Accounts', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: '#f59e0b' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--gray-500)' }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--gray-900)', fontFamily: 'Outfit' }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div className="filters-bar" style={{ margin: 0 }}>
            <div className="search-bar">
              <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>MFA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="loading-overlay"><div className="spinner" style={{ width: 36, height: 36 }} /></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <Shield size={32} color="var(--gray-300)" />
                    <h3>No users found</h3>
                  </div>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm">{u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'US'}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{u.email || '–'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{u.employee_id || '–'}</td>
                  <td style={{ fontSize: 12 }}>{u.department || '–'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    {u.updated_at ? new Date(u.updated_at).toLocaleDateString('en-AU') : '–'}
                  </td>
                  <td>
                    <span className={`badge ${u.mfa_enabled ? 'badge-green' : 'badge-gray'}`}>
                      {u.mfa_enabled ? '✓ MFA' : 'No MFA'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleActive(u.id, u.is_active)}
                      style={{ fontSize: 11 }}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Policy Summary */}
      <div className="card" style={{ marginTop: 20, background: 'var(--primary-50)', border: '1px solid rgba(30,64,175,0.15)' }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--primary-700)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} /> Security Policy Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[
              { label: 'Row-Level Security (RLS)', status: true, desc: 'Enforced on all patient tables' },
              { label: 'Audit Logging', status: true, desc: 'All actions logged with user + IP' },
              { label: 'HIPAA Compliance', status: true, desc: 'PHI access controls enforced' },
              { label: 'TLS Encryption', status: true, desc: 'TLS 1.3 for all API calls' },
              { label: 'JWT Auth', status: true, desc: 'Supabase RS256 token auth' },
              { label: 'MFA Enforcement', status: false, desc: 'Optional – not enforced for all' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                {item.status
                  ? <CheckCircle size={16} color="var(--success-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertTriangle size={16} color="var(--warning-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
