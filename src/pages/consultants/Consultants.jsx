import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Stethoscope, Plus, Edit, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Consultants() {
  const { user } = useAuth();
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    specialization: '', qualifications: '', registration_number: '',
    department: '', consultation_fee: '', follow_up_fee: '',
    available_days: [], start_time: '09:00', end_time: '17:00',
    full_name: '', email: '', phone: '',
  });

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const DEPARTMENTS = ['General Practice','Emergency','Cardiology','Oncology','Renal','Maternity','Paediatrics','Geriatrics','Radiology','Pharmacy','Pathology','Surgery','Neurology','Orthopaedics','Psychiatry'];
  const SPECIALIZATIONS = ['General Practitioner','Emergency Physician','Cardiologist','Oncologist','Nephrologist','Obstetrician','Paediatrician','Geriatrician','Radiologist','Surgeon','Neurologist','Psychiatrist','Anaesthesiologist'];

  useEffect(() => { fetchConsultants(); }, []);

  const fetchConsultants = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('consultants')
      .select('*')  // doctor_name, doctor_email, doctor_phone stored directly
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setConsultants(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ specialization:'', qualifications:'', registration_number:'', department:'', consultation_fee:'', follow_up_fee:'', available_days:[], start_time:'09:00', end_time:'17:00', full_name:'', email:'', phone:'' });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      specialization:      c.specialization      || '',
      qualifications:      c.qualifications      || '',
      registration_number: c.registration_number || '',
      department:          c.department          || '',
      consultation_fee:    c.consultation_fee    || '',
      follow_up_fee:       c.follow_up_fee       || '',
      available_days:      c.available_days      || [],
      start_time:          c.start_time          || '09:00',
      end_time:            c.end_time            || '17:00',
      full_name:           c.doctor_name         || '',
      email:               c.doctor_email        || '',
      phone:               c.doctor_phone        || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Doctor name is required'); return; }
    setSaving(true);
    try {
      // Store name directly in consultants table — no profile FK needed
      const consultantData = {
        doctor_name:         form.full_name.trim(),
        specialization:      form.specialization,
        qualifications:      form.qualifications,
        registration_number: form.registration_number,
        department:          form.department,
        consultation_fee:    parseFloat(form.consultation_fee) || 0,
        follow_up_fee:       parseFloat(form.follow_up_fee)    || 0,
        available_days:      form.available_days,
        start_time:          form.start_time,
        end_time:            form.end_time,
      };
      // Add email/phone only after running:
      // ALTER TABLE consultants ADD COLUMN IF NOT EXISTS doctor_email text;
      // ALTER TABLE consultants ADD COLUMN IF NOT EXISTS doctor_phone text;
      if (form.email.trim())  consultantData.doctor_email = form.email.trim();
      if (form.phone.trim())  consultantData.doctor_phone = form.phone.trim();

      if (editing) {
        const { error } = await supabase.from('consultants').update(consultantData).eq('id', editing);
        if (error) throw error;
        toast.success('Consultant updated!');
      } else {
        const { error } = await supabase.from('consultants').insert(consultantData);
        if (error) throw error;
        toast.success('Consultant added!');
      }
      setShowModal(false);
      fetchConsultants();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };


  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }));
  };

  const filtered = consultants.filter(c =>
    search === '' ||
    c.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.specialization?.toLowerCase().includes(search.toLowerCase()) ||
    c.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Consultant Management</h1>
          <p>{consultants.length} consultants registered</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Consultant</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="search-bar">
            <Search size={15} className="search-icon" />
            <input placeholder="Search by name, specialization, department..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
        {loading ? (
          <div className="loading-overlay" style={{gridColumn:'span 3'}}><div className="spinner" style={{width:36,height:36}} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{gridColumn:'span 3'}}>
            <div className="empty-state-icon"><Stethoscope size={28} /></div>
            <h3>No consultants found</h3>
            <p>Add your first consultant to get started</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="card card-hover" style={{padding:20}}>
            <div style={{display:'flex',gap:14,alignItems:'flex-start',marginBottom:14}}>
              <div className="avatar avatar-lg">
                {c.doctor_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'DR'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,color:'var(--gray-900)',marginBottom:2}}>
                  Dr. {c.doctor_name || 'Unknown'}
                </div>
                <span className="badge badge-teal">{c.specialization}</span>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)}>
                <Edit size={14} />
              </button>
            </div>

            <div style={{borderTop:'1px solid var(--gray-100)',paddingTop:12}}>
              {[
                { label: 'Department', value: c.department },
                { label: 'Registration No.', value: c.registration_number },
                { label: 'Consultation Fee', value: c.consultation_fee ? `$${c.consultation_fee}` : '–' },
                { label: 'Follow-up Fee', value: c.follow_up_fee ? `$${c.follow_up_fee}` : '–' },
                { label: 'Hours', value: c.start_time && c.end_time ? `${c.start_time?.slice(0,5)} – ${c.end_time?.slice(0,5)}` : '–' },
              ].map(item => (
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12}}>
                  <span style={{color:'var(--gray-500)'}}>{item.label}</span>
                  <span style={{fontWeight:600,color:'var(--gray-800)'}}>{item.value || '–'}</span>
                </div>
              ))}
            </div>

            {c.available_days?.length > 0 && (
              <div style={{marginTop:10,display:'flex',gap:4,flexWrap:'wrap'}}>
                {c.available_days.map(d => (
                  <span key={d} style={{fontSize:10,background:'var(--primary-50)',color:'var(--primary-700)',padding:'2px 7px',borderRadius:4,fontWeight:600}}>
                    {d.slice(0,3)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => {if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="modal modal-lg" style={{display:'flex', flexDirection:'column', maxHeight:'90vh'}}>
            <div className="modal-header" style={{flexShrink:0}}>
              <h3>{editing ? 'Edit Consultant' : 'Add Consultant'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', flex:1, minHeight:0}}>
              <div className="modal-body" style={{overflowY:'auto', flex:1}}>

                {/* ── Doctor Identity Fields ── */}
                <div style={{background:'var(--primary-50)',border:'1px solid var(--primary-100)',borderRadius:8,padding:'14px 16px',marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--primary-600)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Doctor Information</div>
                  <div className="form-grid form-grid-2">
                    <div className="form-group" style={{margin:0}}>
                      <label className="label-required">Full Name</label>
                      <input
                        required
                        placeholder="e.g. James Wilson"
                        value={form.full_name}
                        onChange={e => setForm(p=>({...p, full_name: e.target.value}))}
                      />
                    </div>
                    <div className="form-group" style={{margin:0}}>
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="doctor@sunrise.clinic"
                        value={form.email}
                        onChange={e => setForm(p=>({...p, email: e.target.value}))}
                      />
                    </div>
                    <div className="form-group" style={{margin:0}}>
                      <label>Phone Number</label>
                      <input
                        placeholder="e.g. 0412 345 678"
                        value={form.phone}
                        onChange={e => setForm(p=>({...p, phone: e.target.value}))}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Clinical Details ── */}
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="label-required">Specialization</label>
                    <select required value={form.specialization} onChange={e => setForm(p=>({...p,specialization:e.target.value}))}>
                      <option value="">Select...</option>
                      {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <select value={form.department} onChange={e => setForm(p=>({...p,department:e.target.value}))}>
                      <option value="">Select...</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Qualifications</label>
                    <input placeholder="MBBS, FRACP, etc." value={form.qualifications} onChange={e => setForm(p=>({...p,qualifications:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Registration Number</label>
                    <input placeholder="AHPRA number" value={form.registration_number} onChange={e => setForm(p=>({...p,registration_number:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Consultation Fee ($)</label>
                    <input type="number" step="0.01" value={form.consultation_fee} onChange={e => setForm(p=>({...p,consultation_fee:e.target.value}))} placeholder="250.00" />
                  </div>
                  <div className="form-group">
                    <label>Follow-up Fee ($)</label>
                    <input type="number" step="0.01" value={form.follow_up_fee} onChange={e => setForm(p=>({...p,follow_up_fee:e.target.value}))} placeholder="150.00" />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" value={form.start_time} onChange={e => setForm(p=>({...p,start_time:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" value={form.end_time} onChange={e => setForm(p=>({...p,end_time:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Available Days</label>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
                    {DAYS.map(day => (
                      <button key={day} type="button"
                        onClick={() => toggleDay(day)}
                        style={{padding:'5px 12px',borderRadius:6,border:`1.5px solid ${form.available_days.includes(day)?'var(--primary-500)':'var(--gray-300)'}`,
                          background:form.available_days.includes(day)?'var(--primary-50)':'white',
                          color:form.available_days.includes(day)?'var(--primary-700)':'var(--gray-600)',
                          fontSize:12,fontWeight:600,cursor:'pointer'}}>
                        {day.slice(0,3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{flexShrink:0}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Consultant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
