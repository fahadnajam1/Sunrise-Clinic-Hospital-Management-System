import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Save, LogOut, Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    employee_id: profile?.employee_id || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id);
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match!'); return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
      if (error) throw error;
      toast.success('Password changed successfully!');
      setPasswordForm({ current_password:'', new_password:'', confirm_password:'' });
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{maxWidth:800,margin:'0 auto'}}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{display:'flex',gap:16,alignItems:'center',padding:'20px 24px'}}>
          <div className="avatar avatar-xl" style={{width:64,height:64,fontSize:24}}>
            {profile?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2) || 'U'}
          </div>
          <div>
            <h2 style={{fontSize:18,fontWeight:800,margin:0}}>{profile?.full_name || user?.email}</h2>
            <p style={{color:'var(--gray-500)',margin:'4px 0 0',fontSize:13}}>{user?.email}</p>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <span className="badge badge-blue" style={{textTransform:'capitalize'}}>{profile?.role || 'Staff'}</span>
              {profile?.employee_id && <span className="badge badge-gray">{profile.employee_id}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id:'profile', label:'👤 Profile' },
          { id:'security', label:'🔐 Security' },
          { id:'system', label:'⚙️ System' },
        ].map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Personal Information</div></div>
          <div className="card-body">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Full Name</label>
                <input value={profileForm.full_name} onChange={e=>setProfileForm(p=>({...p,full_name:e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input value={user?.email} disabled style={{background:'var(--gray-50)',cursor:'not-allowed'}} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={profileForm.phone} onChange={e=>setProfileForm(p=>({...p,phone:e.target.value}))} placeholder="0400 000 000" />
              </div>
              <div className="form-group">
                <label>Employee ID</label>
                <input value={profileForm.employee_id} onChange={e=>setProfileForm(p=>({...p,employee_id:e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input value={profile?.role} disabled style={{background:'var(--gray-50)',cursor:'not-allowed',textTransform:'capitalize'}} />
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}><Save size={15}/> {saving?'Saving...':'Save Profile'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-header"><div className="card-title">Change Password</div></div>
            <div className="card-body">
              <div className="form-group">
                <label>New Password</label>
                <div style={{position:'relative'}}>
                  <input type={showPassword?'text':'password'} value={passwordForm.new_password} onChange={e=>setPasswordForm(p=>({...p,new_password:e.target.value}))} placeholder="Min 8 characters" />
                  <button type="button" onClick={()=>setShowPassword(p=>!p)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}>
                    {showPassword?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={passwordForm.confirm_password} onChange={e=>setPasswordForm(p=>({...p,confirm_password:e.target.value}))} />
              </div>
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}><Lock size={15}/> Change Password</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Security Information</div></div>
            <div className="card-body">
              {[
                { label:'Last Login', value: new Date(user?.last_sign_in_at||Date.now()).toLocaleString('en-AU') },
                { label:'Account Created', value: new Date(user?.created_at||Date.now()).toLocaleDateString('en-AU') },
                { label:'Authentication', value:'Email + Password' },
                { label:'Session', value:'Active (expires in 1 hour)' },
              ].map(item=>(
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                  <span style={{color:'var(--gray-500)'}}>{item.label}</span>
                  <span style={{fontWeight:600,color:'var(--gray-800)'}}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-header"><div className="card-title">System Information</div></div>
            <div className="card-body">
              {[
                { label:'Application', value:'Sunrise Medical Clinic System v2.0' },
                { label:'Framework', value:'Electron 28 + React 18 + Vite' },
                { label:'Database', value:'Supabase (PostgreSQL 15)' },
                { label:'Security', value:'HIPAA Compliant + Row Level Security' },
                { label:'Audit Logging', value:'Enabled (6-year retention)' },
                { label:'Encryption', value:'AES-256 at rest · TLS 1.3 in transit' },
              ].map(item=>(
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                  <span style={{color:'var(--gray-500)'}}>{item.label}</span>
                  <span style={{fontWeight:600,color:'var(--gray-800)'}}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{border:'1px solid rgba(239,68,68,0.2)'}}>
            <div className="card-body" style={{padding:'20px 24px'}}>
              <h4 style={{fontWeight:700,color:'var(--danger-600)',marginBottom:8}}>⚠️ Danger Zone</h4>
              <p style={{fontSize:13,color:'var(--gray-600)',marginBottom:16}}>Sign out of the current session. You will need to log in again to access the system.</p>
              <button className="btn btn-danger" onClick={handleLogout}><LogOut size={15}/> Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
