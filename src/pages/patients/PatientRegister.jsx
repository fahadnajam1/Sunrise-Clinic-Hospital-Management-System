import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save, User, Phone, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  blood_type: '', phone: '', email: '', address: '', city: '', suburb: '',
  postcode: '', state: 'VIC', country: 'Australia',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  insurance_provider: '', insurance_number: '', medicare_number: '',
  allergies: '', notes: '',
};

export default function PatientRegister() {
  const navigate = useNavigate();
  const { user, logAudit } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error('First and last name are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        mrn: '',
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        registered_by: user?.id,
      };
      const { data, error } = await supabase.from('patients').insert(payload).select().single();
      if (error) throw error;
      await logAudit('CREATE', 'patients', data.id, `Registered new patient: ${data.first_name} ${data.last_name}`, null, payload);
      toast.success(`Patient registered successfully! MRN: ${data.mrn}`);
      navigate(`/patients/${data.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/patients')} style={{marginBottom:8,padding:'6px 10px'}}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1>Register New Patient</h1>
          <p>Enter patient demographic and clinical information</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/patients')}>Cancel</button>
          <button className="btn btn-primary" form="patient-form" type="submit" disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Register Patient'}
          </button>
        </div>
      </div>

      <form id="patient-form" onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'personal', label: '👤 Personal Details' },
            { id: 'contact', label: '📍 Contact & Address' },
            { id: 'emergency', label: '🚨 Emergency Contact' },
            { id: 'insurance', label: '🛡️ Insurance & Medicare' },
            { id: 'clinical', label: '🏥 Clinical Notes' },
          ].map(tab => (
            <button key={tab.id} type="button" className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {/* Personal */}
        {activeTab === 'personal' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Personal Information</div>
            </div>
            <div className="card-body">
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="label-required">First Name</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="John" required />
                </div>
                <div className="form-group">
                  <label className="label-required">Last Name</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Smith" required />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Type</label>
                  <select name="blood_type" value={form.blood_type} onChange={handleChange}>
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Contact & Address</div>
            </div>
            <div className="card-body">
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="0400 000 000" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="patient@email.com" />
                </div>
                <div className="form-group" style={{gridColumn:'span 2'}}>
                  <label>Street Address</label>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="123 Main Street" />
                </div>
                <div className="form-group">
                  <label>Suburb</label>
                  <input name="suburb" value={form.suburb} onChange={handleChange} placeholder="Footscray" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="Melbourne" />
                </div>
                <div className="form-group">
                  <label>Postcode</label>
                  <input name="postcode" value={form.postcode} onChange={handleChange} placeholder="3011" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select name="state" value={form.state} onChange={handleChange}>
                    {['VIC','NSW','QLD','SA','WA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency */}
        {activeTab === 'emergency' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Emergency Contact</div>
            </div>
            <div className="card-body">
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} placeholder="Jane Smith" />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} placeholder="0400 000 000" />
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <select name="emergency_contact_relationship" value={form.emergency_contact_relationship} onChange={handleChange}>
                    <option value="">Select...</option>
                    {['Spouse','Parent','Child','Sibling','Friend','Guardian','Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insurance */}
        {activeTab === 'insurance' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Insurance & Medicare</div>
            </div>
            <div className="card-body">
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label>Medicare Number</label>
                  <input name="medicare_number" value={form.medicare_number} onChange={handleChange} placeholder="1234 56789 1" />
                </div>
                <div className="form-group">
                  <label>Insurance Provider</label>
                  <input name="insurance_provider" value={form.insurance_provider} onChange={handleChange} placeholder="Medibank, Bupa, etc." />
                </div>
                <div className="form-group">
                  <label>Insurance Policy Number</label>
                  <input name="insurance_number" value={form.insurance_number} onChange={handleChange} placeholder="POL-12345678" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clinical */}
        {activeTab === 'clinical' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Clinical Notes</div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Known Allergies</label>
                <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="Penicillin, Latex, Aspirin (comma separated)" />
                <p className="form-hint">Separate multiple allergies with commas</p>
              </div>
              <div className="form-group">
                <label>Initial Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any additional notes about the patient..." rows={4} />
              </div>

              <div style={{background:'var(--warning-50)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:'14px 18px',display:'flex',gap:10,alignItems:'flex-start'}}>
                <AlertTriangle size={18} color="var(--warning-600)" style={{flexShrink:0,marginTop:1}} />
                <div>
                  <div style={{fontWeight:700,color:'var(--warning-600)',fontSize:13}}>HIPAA Notice</div>
                  <div style={{fontSize:12,color:'var(--gray-600)',marginTop:2}}>Patient data is protected under HIPAA regulations. Ensure consent has been obtained before recording any sensitive clinical information.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
