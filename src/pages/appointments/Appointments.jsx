import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Search, Filter, Clock, User, Check, X, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

export default function Appointments() {
  const { user, logAudit } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // empty = show all dates
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'week'
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', consultant_id: '', appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00', type: 'new', status: 'scheduled',
    reason: '', notes: '', room_number: '', duration_minutes: 30,
  });

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('appointments')
        .select('*, patients(first_name,last_name,mrn,phone), consultants(profiles(full_name),specialization)')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: true });

      if (dateFilter)   query = query.eq('appointment_date', dateFilter);
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error } = await query.limit(200);
      if (error) { toast.error(`Load error: ${error.message}`); setLoading(false); return; }

      let filtered = data || [];
      if (search) {
        filtered = filtered.filter(a =>
          `${a.patients?.first_name} ${a.patients?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
          a.patients?.mrn?.toLowerCase().includes(search.toLowerCase())
        );
      }
      setAppointments(filtered);

      const [{ data: pats, error: pErr }, { data: cons, error: cErr }] = await Promise.all([
        supabase.from('patients').select('id,first_name,last_name,mrn').eq('is_active', true).limit(200),
        supabase.from('consultants').select('id,specialization,profiles(full_name)').eq('is_active', true),
      ]);
      if (pErr) console.warn('Patients load error:', pErr.message);
      if (cErr) console.warn('Consultants load error:', cErr.message);
      setPatients(pats || []);
      setConsultants(cons || []);
    } catch (err) {
      toast.error(`Could not load appointments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.appointment_date || !form.appointment_time) {
      toast.error('Patient, date, and time are required');
      return;
    }
    setSaving(true);
    try {
      // Convert empty string UUID fields to null to avoid "invalid input syntax for type uuid"
      const payload = {
        ...form,
        consultant_id:  form.consultant_id  || null,
        booked_by:      user?.id            || null,
      };
      const { data, error } = await supabase.from('appointments').insert(payload).select().single();
      if (error) throw error;
      toast.success('Appointment booked successfully!');
      logAudit('CREATE', 'appointments', data.id, 'Booked new appointment');
      setShowModal(false);
      setDateFilter(''); // clear date filter so the new appointment is visible
      fetchData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };


  const updateStatus = async (apptId, newStatus) => {
    try {
      const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch { toast.error('Could not update status'); }
  };

  const STATUS_COLORS = {
    scheduled: 'badge-blue', confirmed: 'badge-teal', checked_in: 'badge-yellow',
    in_progress: 'badge-purple', completed: 'badge-green', cancelled: 'badge-red', no_show: 'badge-gray',
  };

  const TODAY_COUNT = appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Appointment Scheduling</h1>
          <p>{appointments.length} appointments · {TODAY_COUNT} today</p>
        </div>
        <div className="page-header-actions">
          <div className="tabs" style={{margin:0,borderBottom:'none',gap:4}}>
            <button className={`tab-btn ${viewMode==='list'?'active':''}`} onClick={() => setViewMode('list')}>List View</button>
            <button className={`tab-btn ${viewMode==='week'?'active':''}`} onClick={() => setViewMode('week')}>Week View</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Book Appointment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar">
              <Search size={15} className="search-icon" />
              <input placeholder="Search patient name or MRN..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{width:'auto'}} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
              <option value="">All Statuses</option>
              {['scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show'].map(s =>
                <option key={s} value={s}>{s.replace('_',' ')}</option>
              )}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setDateFilter(new Date().toISOString().split('T')[0]); }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="table-container">
            {loading ? (
              <div className="loading-overlay"><div className="spinner" style={{width:36,height:36}} /></div>
            ) : appointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Calendar size={28} /></div>
                <h3>No appointments found</h3>
                <p>Book a new appointment to get started</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Room</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{fontWeight:700,color:'var(--gray-900)'}}>{a.appointment_time?.slice(0,5)}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)'}}>{new Date(a.appointment_date).toLocaleDateString('en-AU',{month:'short',day:'numeric'})}</div>
                      </td>
                      <td>
                        <div style={{fontWeight:600,fontSize:13}}>{a.patients?.first_name} {a.patients?.last_name}</div>
                        <div style={{fontSize:11,color:'var(--gray-500)',fontFamily:'monospace'}}>{a.patients?.mrn}</div>
                      </td>
                      <td style={{fontSize:13}}>Dr. {a.consultants?.profiles?.full_name || '–'}</td>
                      <td><span className="badge badge-gray" style={{textTransform:'capitalize'}}>{a.type?.replace('_',' ')}</span></td>
                      <td><span className={`badge ${STATUS_COLORS[a.status]||'badge-gray'}`} style={{textTransform:'capitalize'}}>{a.status?.replace('_',' ')}</span></td>
                      <td style={{fontSize:13}}>{a.room_number || '–'}</td>
                      <td style={{fontSize:13}}>{a.duration_minutes} min</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          {a.status === 'scheduled' && (
                            <button className="btn btn-success btn-sm btn-icon" title="Check In" onClick={() => updateStatus(a.id,'checked_in')}>
                              <Check size={13} />
                            </button>
                          )}
                          {['scheduled','confirmed','checked_in'].includes(a.status) && (
                            <button className="btn btn-danger btn-sm btn-icon" title="Cancel" onClick={() => updateStatus(a.id,'cancelled')}>
                              <X size={13} />
                            </button>
                          )}
                          {a.status === 'checked_in' && (
                            <button className="btn btn-primary btn-sm" onClick={() => updateStatus(a.id,'completed')}>
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="card">
          <div className="card-body">
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
              {Array.from({length:7}).map((_,i) => {
                const day = addDays(startOfWeek(new Date(), {weekStartsOn:1}), i);
                const dayAppts = appointments.filter(a => a.appointment_date === format(day,'yyyy-MM-dd'));
                return (
                  <div key={i} style={{border:'1px solid var(--gray-200)',borderRadius:8,overflow:'hidden',minHeight:120}}>
                    <div style={{padding:'8px 10px',background:isSameDay(day,new Date())?'var(--primary-600)':'var(--gray-50)',borderBottom:'1px solid var(--gray-200)',textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:600,color:isSameDay(day,new Date())?'white':'var(--gray-500)',textTransform:'uppercase'}}>{format(day,'EEE')}</div>
                      <div style={{fontSize:18,fontWeight:800,color:isSameDay(day,new Date())?'white':'var(--gray-900)'}}>{format(day,'d')}</div>
                    </div>
                    <div style={{padding:6}}>
                      {dayAppts.map(a => (
                        <div key={a.id} style={{fontSize:10,background:'var(--primary-50)',color:'var(--primary-700)',borderRadius:4,padding:'3px 6px',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {a.appointment_time?.slice(0,5)} {a.patients?.first_name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Book New Appointment</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="label-required">Patient</label>
                    <select value={form.patient_id} onChange={e => setForm(p=>({...p,patient_id:e.target.value}))} required>
                      <option value="">Select patient...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Consultant</label>
                    <select value={form.consultant_id} onChange={e => setForm(p=>({...p,consultant_id:e.target.value}))}>
                      <option value="">Any available</option>
                      {consultants.map(c => <option key={c.id} value={c.id}>{c.profiles?.full_name} – {c.specialization}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label-required">Date</label>
                    <input type="date" value={form.appointment_date} onChange={e => setForm(p=>({...p,appointment_date:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="label-required">Time</label>
                    <input type="time" value={form.appointment_time} onChange={e => setForm(p=>({...p,appointment_time:e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label>Appointment Type</label>
                    <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
                      <option value="new">New Consultation</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="emergency">Emergency</option>
                      <option value="procedure">Procedure</option>
                      <option value="teleconsult">Teleconsult</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <select value={form.duration_minutes} onChange={e => setForm(p=>({...p,duration_minutes:parseInt(e.target.value)}))}>
                      {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d} minutes</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Room Number</label>
                    <input placeholder="e.g. Room 3" value={form.room_number} onChange={e => setForm(p=>({...p,room_number:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Reason for Visit</label>
                  <input placeholder="Brief reason for appointment" value={form.reason} onChange={e => setForm(p=>({...p,reason:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows={2} placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
