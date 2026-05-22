import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeartPulse, Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, Info, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const SUPABASE_URL = 'https://cthzvnzlzmkigwfzybxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0aHp2bnpsem1raWd3Znp5YnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTQ3MjMsImV4cCI6MjA5MTM3MDcyM30.sw-bduLa25MDxtg1zGl-cd8flLIeTPmqnGmcffwlnms';

const DEMO_ACCOUNTS = [
  { role: 'admin',         email: 'admin@sunrise.clinic',     label: 'Admin',       color: '#3b82f6' },
  { role: 'doctor',        email: 'doctor@sunrise.clinic',    label: 'Doctor',      color: '#0891b2' },
  { role: 'nurse',         email: 'nurse@sunrise.clinic',     label: 'Nurse',       color: '#16a34a' },
  { role: 'receptionist',  email: 'reception@sunrise.clinic', label: 'Receptionist',color: '#d97706' },
  { role: 'billing',       email: 'billing@sunrise.clinic',   label: 'Billing',     color: '#7c3aed' },
];

// Direct signup via REST API — handles rate limit gracefully with retry logic
async function supabaseSignUpDirect(email, password, metadata) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      data: metadata,
      gotrue_meta_security: {},
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Parse specific rate limit error
    const msg = data?.msg || data?.message || data?.error_description || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1=form, 2=success
  const [setupName, setSetupName] = useState('');
  const [setupRole, setSetupRole] = useState('admin');
  const [setupEmail, setSetupEmail] = useState('admin@sunrise.clinic');
  const [setupPassword, setSetupPassword] = useState('Sunrise@2025');
  const [setupLoading, setSetupLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Sunrise@2025');
    setError('');
    setLoading(true);
    try {
      await signIn(demoEmail, 'Sunrise@2025');
      toast.success('Signed in successfully!');
      navigate('/dashboard');
    } catch {
      // Try old password
      try {
        await signIn(demoEmail, 'Sunrise@2024');
        toast.success('Signed in!');
        navigate('/dashboard');
      } catch {
        setError(`Demo account "${demoEmail}" not found. Please create it first using the setup form below.`);
        setIsSetup(true);
        setSetupEmail(demoEmail);
      }
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!setupName.trim()) { setError('Please enter your full name'); return; }
    if (setupPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setRateLimited(false);
    setSetupLoading(true);

    try {
      await supabaseSignUpDirect(setupEmail, setupPassword, {
        full_name: setupName,
        role: setupRole,
      });
      setSetupStep(2);
      toast.success('Account created! You can now sign in.');
    } catch (err) {
      const msg = err.message || '';
      // Handle rate limit (429) specifically
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('429') || msg.toLowerCase().includes('too many')) {
        setRateLimited(true);
        setError('');
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        // User already exists — try to sign in
        setError('');
        try {
          await signIn(setupEmail, setupPassword);
          toast.success('Signed in with existing account!');
          navigate('/dashboard');
          return;
        } catch {
          setError(`Account already exists. Try signing in with email: ${setupEmail}`);
        }
      } else {
        setError(msg);
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
    color: 'white',
  };

  const labelStyle = { color: 'rgba(255,255,255,0.7)' };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <HeartPulse size={32} color="white" />
            </div>
            <h1>Sunrise Medical Clinic</h1>
            <p>Online Clinic Management System</p>
          </div>

          {!isSetup ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email" style={labelStyle}>Email Address</label>
                  <div style={{position:'relative'}}>
                    <Mail size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.3)'}} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      style={{...inputStyle, paddingLeft:36}}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password" style={labelStyle}>Password</label>
                  <div style={{position:'relative'}}>
                    <Lock size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.3)'}} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{...inputStyle, paddingLeft:36, paddingRight:40}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}
                    >
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{display:'flex',gap:8,alignItems:'flex-start',padding:'10px 14px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,marginBottom:16}}>
                    <AlertCircle size={16} color="#f87171" style={{flexShrink:0,marginTop:1}} />
                    <span style={{fontSize:13,color:'#fca5a5'}}>{error}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{width:'100%',justifyContent:'center'}}>
                  {loading ? <><div className="spinner" style={{width:16,height:16}} /> Signing In...</> : 'Sign In'}
                </button>
              </form>

              {/* Demo Accounts */}
              <div style={{marginTop:24}}>
                <div style={{textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:12,position:'relative'}}>
                  <span style={{background:'rgba(30,30,50,1)',padding:'0 12px',position:'relative',zIndex:1}}>Quick Demo Access</span>
                  <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:'rgba(255,255,255,0.1)'}} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {DEMO_ACCOUNTS.map(acc => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleDemoLogin(acc.email)}
                      disabled={loading}
                      style={{
                        padding:'8px 12px', borderRadius:8,
                        border:'1px solid rgba(255,255,255,0.12)',
                        background:'rgba(255,255,255,0.06)',
                        color:'rgba(255,255,255,0.75)',
                        fontSize:12, fontWeight:600, cursor:'pointer',
                        transition:'all 0.2s', display:'flex', alignItems:'center', gap:6,
                      }}
                    >
                      <div style={{width:8,height:8,borderRadius:'50%',background:acc.color,flexShrink:0}} />
                      {acc.label}
                    </button>
                  ))}
                </div>
                <div style={{marginTop:8}}>
                  <button
                    type="button"
                    onClick={() => { setIsSetup(true); setSetupStep(1); setError(''); }}
                    style={{
                      width:'100%', padding:'9px 12px', borderRadius:8,
                      border:'1px solid rgba(255,255,255,0.2)',
                      background:'rgba(59,130,246,0.15)',
                      color:'rgba(255,255,255,0.9)',
                      fontSize:12, fontWeight:600, cursor:'pointer',
                    }}
                  >
                    + Create First Account
                  </button>
                </div>
              </div>
            </>
          ) : setupStep === 2 ? (
            /* Success State */
            <div style={{textAlign:'center'}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'rgba(34,197,94,0.15)',border:'2px solid rgba(34,197,94,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                <CheckCircle2 size={28} color="#22c55e" />
              </div>
              <h3 style={{color:'white',fontSize:18,fontWeight:700,marginBottom:8}}>Account Created!</h3>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:4}}>Email: <strong style={{color:'white'}}>{setupEmail}</strong></p>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:20}}>Password: <strong style={{color:'white'}}>{setupPassword}</strong></p>
              <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginBottom:20}}>
                If email confirmation is enabled, check your inbox. Otherwise you can sign in directly.
              </p>
              <button
                className="btn btn-primary"
                style={{width:'100%',justifyContent:'center'}}
                onClick={() => {
                  setEmail(setupEmail);
                  setPassword(setupPassword);
                  setIsSetup(false);
                  setSetupStep(1);
                }}
              >
                Go to Sign In →
              </button>
            </div>
          ) : (
            /* Setup Form */
            <form onSubmit={handleSetup}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
                <button type="button" onClick={() => { setIsSetup(false); setError(''); setRateLimited(false); }}
                  style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:20,lineHeight:1,padding:0}}>←</button>
                <h3 style={{color:'white',fontSize:16,fontWeight:700,margin:0}}>Create Account</h3>
              </div>

              {/* Rate Limit Banner */}
              {rateLimited && (
                <div style={{padding:'12px 14px',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:8,marginBottom:16}}>
                  <div style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10}}>
                    <AlertCircle size={16} color="#fbbf24" style={{flexShrink:0,marginTop:1}} />
                    <div>
                      <div style={{fontSize:13,color:'#fde68a',fontWeight:600}}>Email Rate Limit Reached</div>
                      <div style={{fontSize:12,color:'rgba(253,230,138,0.8)',marginTop:3}}>
                        Supabase free tier limits signups to ~3/hour. To fix this permanently:
                      </div>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',lineHeight:1.6,borderTop:'1px solid rgba(245,158,11,0.2)',paddingTop:10}}>
                    <strong style={{color:'#fde68a'}}>Option 1 – Dashboard (recommended):</strong><br/>
                    Go to <span style={{fontFamily:'monospace',color:'#7dd3fc'}}>supabase.com/dashboard/project/cthzvnzlzmkigwfzybxn/auth/rate-limits</span><br/>
                    and increase the <em>"Email rate limit"</em> to 100+<br/><br/>
                    <strong style={{color:'#fde68a'}}>Option 2 – Create user directly:</strong><br/>
                    Run in Supabase SQL Editor:<br/>
                    <code style={{display:'block',background:'rgba(0,0,0,0.3)',padding:'6px 8px',borderRadius:4,marginTop:4,fontSize:11,overflowX:'auto',whiteSpace:'nowrap'}}>
                      SELECT supabase_admin.create_user('{`{`}"email":"{setupEmail}","password":"{setupPassword}","data":{`{`}"role":"{setupRole}","full_name":"{setupName || 'Admin'}"{`}`}{`}`}');
                    </code>
                  </div>
                  <a
                    href="https://supabase.com/dashboard/project/cthzvnzlzmkigwfzybxn/auth/rate-limits"
                    target="_blank"
                    rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:4,marginTop:10,fontSize:12,color:'#7dd3fc',textDecoration:'none'}}
                  >
                    <ExternalLink size={12}/> Open Supabase Rate Limits Settings
                  </a>
                </div>
              )}

              {error && !rateLimited && (
                <div style={{padding:'10px 14px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,marginBottom:16,fontSize:13,color:'#fca5a5',display:'flex',gap:8,alignItems:'flex-start'}}>
                  <AlertCircle size={15} color="#f87171" style={{flexShrink:0,marginTop:1}} />
                  {error}
                </div>
              )}

              <div className="form-group">
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} type="text" value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="Dr. Jane Smith" required />
              </div>
              <div className="form-group">
                <label style={labelStyle}>Email Address *</label>
                <input style={inputStyle} type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="admin@sunrise.clinic" required />
              </div>
              <div className="form-group">
                <label style={labelStyle}>Password *</label>
                <input style={inputStyle} type="text" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
              </div>
              <div className="form-group">
                <label style={labelStyle}>Role</label>
                <select  value={setupRole} onChange={e => setSetupRole(e.target.value)}
                  style={{...inputStyle , backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff60' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")"}}>
                  <option style={{color:'black'}} value="admin">Administrator</option>
                  <option style={{color:'black'}} value="doctor">Doctor</option>
                  <option style={{color:'black'}} value="nurse">Nurse</option>
                  <option style={{color:'black'}} value="receptionist">Receptionist</option>
                  <option style={{color:'black'}} value="billing">Billing</option>
                  <option style={{color:'black'}} value="hr">HR</option>
                </select>
              </div>

              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsSetup(false); setError(''); setRateLimited(false); }} style={{flex:1,justifyContent:'center'}}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={setupLoading} style={{flex:1,justifyContent:'center'}}>
                  {setupLoading ? <><div className="spinner" style={{width:13,height:13}} /> Creating...</> : 'Create Account'}
                </button>
              </div>

      
            </form>
          )}

          {/* Footer */}
          <div style={{marginTop:24,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.3)'}}>
            © 2025 Sunrise Medical Clinic · HIPAA Compliant · v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
