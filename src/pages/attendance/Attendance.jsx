import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Plus, Search, UserCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ profile_id:'', date:new Date().toISOString().split('T')[0], check_in:'', check_out:'', status:'present', notes:'' });

  useEffect(() => { fetchData(); }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch attendance records WITHOUT profiles join (avoids RLS recursion)
      const { data: r, error: rErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', dateFilter)
        .order('created_at');

      if (rErr) { toast.error(`Attendance error: ${rErr.message}`); setLoading(false); return; }

      // Fetch all active profiles separately
      const { data: s, error: sErr } = await supabase
        .from('profiles')
        .select('id,full_name,role,employee_id')
        .eq('is_active', true);

      if (sErr) console.warn('Staff load error:', sErr.message);

      // Build a quick lookup map  id → profile
      const profileMap = {};
      (s || []).forEach(p => { profileMap[p.id] = p; });

      // Merge profiles into attendance records
      const merged = (r || []).map(rec => ({
        ...rec,
        profiles: profileMap[rec.profile_id] || null,
      }));

      setRecords(merged);
      setStaff(s || []);
    } catch (err) {
      toast.error(`Load error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.profile_id) { toast.error('Please select a staff member'); return; }
    setSaving(true);
    try {
      // Convert "HH:MM" time strings → full ISO timestamps by combining with the selected date
      const toTimestamp = (timeStr) => {
        if (!timeStr) return null;
        return new Date(`${form.date}T${timeStr}:00`).toISOString();
      };

      const checkInTs  = toTimestamp(form.check_in);
      const checkOutTs = toTimestamp(form.check_out);

      const totalHours = checkInTs && checkOutTs
        ? ((new Date(checkOutTs) - new Date(checkInTs)) / 3600000).toFixed(2)
        : null;

      const { error } = await supabase.from('attendance').upsert({
        profile_id:   form.profile_id,
        date:         form.date,
        status:       form.status,
        notes:        form.notes  || null,
        check_in:     checkInTs,
        check_out:    checkOutTs,
        total_hours:  totalHours,
        recorded_by:  user?.id   || null,
      }, { onConflict: 'profile_id,date' });

      if (error) throw error;
      toast.success('Attendance recorded!');
      setShowModal(false);
      fetchData();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };


  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Sunrise Medical Clinic – Attendance Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${dateFilter} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.autoTable({
      startY: 34,
      head: [['Employee','Role','Employee ID','Check In','Check Out','Hours','Status']],
      body: records.map(r=>[
        r.profiles?.full_name, r.profiles?.role, r.profiles?.employee_id||'–',
        r.check_in?new Date(r.check_in).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'–',
        r.check_out?new Date(r.check_out).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'–',
        r.total_hours||'–', r.status
      ]),
      styles:{fontSize:9}, headStyles:{fillColor:[30,64,175]},
    });
    doc.save(`attendance_${dateFilter}.pdf`);
    toast.success('Exported!');
  };

  const STATUS_COLORS = { present:'badge-green', absent:'badge-red', late:'badge-yellow', half_day:'badge-orange', leave:'badge-blue', holiday:'badge-teal' };

  const stats = {
    present: records.filter(r=>r.status==='present').length,
    absent: records.filter(r=>r.status==='absent').length,
    late: records.filter(r=>r.status==='late').length,
    leave: records.filter(r=>r.status==='leave').length,
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Attendance Management</h1>
          <p>Track staff attendance records</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={exportPDF}><Download size={15}/> Export</button>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={15}/> Record Attendance</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Present', value:stats.present, color:'#22c55e' },
          { label:'Absent', value:stats.absent, color:'#ef4444' },
          { label:'Late', value:stats.late, color:'#f59e0b' },
          { label:'On Leave', value:stats.leave, color:'#3b82f6' },
        ].map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:12,padding:'16px 20px',border:'1px solid var(--gray-200)'}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',color:'var(--gray-500)'}}>{s.label}</div>
            <div style={{fontSize:32,fontWeight:800,color:s.color,fontFamily:'Outfit'}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{width:'auto'}} />
            <span style={{fontSize:13,color:'var(--gray-500)'}}>{records.length} records for selected date</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Employee</th><th>Role</th><th>Employee ID</th><th>Check In</th><th>Check Out</th><th>Total Hours</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : records.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state" style={{padding:40}}>
                    <UserCheck size={32} color="var(--gray-300)"/>
                    <h3>No attendance records</h3>
                    <p>Record attendance for {dateFilter}</p>
                    <button className="btn btn-primary mt-4" onClick={()=>setShowModal(true)}><Plus size={14}/> Add Records</button>
                  </div>
                </td></tr>
              ) : records.map(r=>(
                <tr key={r.id}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{r.profiles?.full_name}</div></td>
                  <td style={{fontSize:13,textTransform:'capitalize'}}>{r.profiles?.role}</td>
                  <td><span style={{fontFamily:'monospace',fontSize:12}}>{r.profiles?.employee_id||'–'}</span></td>
                  <td style={{fontSize:13}}>{r.check_in?new Date(r.check_in).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'–'}</td>
                  <td style={{fontSize:13}}>{r.check_out?new Date(r.check_out).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'–'}</td>
                  <td style={{fontSize:13,fontWeight:700}}>{r.total_hours?`${r.total_hours}h`:'–'}</td>
                  <td><span className={`badge ${STATUS_COLORS[r.status]||'badge-gray'}`}>{r.status.replace('_',' ')}</span></td>
                  <td style={{fontSize:12,color:'var(--gray-500)'}}>{r.notes||'–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal">
            <div className="modal-header">
              <h3>Record Attendance</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label-required">Staff Member</label>
                  <select required value={form.profile_id} onChange={e=>setForm(p=>({...p,profile_id:e.target.value}))}>
                    <option value="">Select staff...</option>
                    {staff.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                  </select>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
                  <div className="form-group"><label>Status</label>
                    <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                      {['present','absent','late','half_day','leave','holiday'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Check In Time</label><input type="time" value={form.check_in} onChange={e=>setForm(p=>({...p,check_in:e.target.value}))}/></div>
                  <div className="form-group"><label>Check Out Time</label><input type="time" value={form.check_out} onChange={e=>setForm(p=>({...p,check_out:e.target.value}))}/></div>
                </div>
                <div className="form-group"><label>Notes</label><input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Late due to traffic etc."/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
