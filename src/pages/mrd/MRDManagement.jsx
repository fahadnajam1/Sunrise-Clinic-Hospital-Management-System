import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Search, Plus, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MRDManagement() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id:'', consultant_id:'', record_type:'outpatient',
    admission_date:'', discharge_date:'', bed_number:'', ward:'',
    icd_code:'', icd_description:'', notes:'',
  });

  const WARDS = ['General Ward','ICU','Emergency','Cardiology','Oncology','Maternity','Paediatrics','Surgical','Medical'];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: r }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('mrd_records').select('*, patients(first_name,last_name,mrn), consultants(profiles(full_name))').order('created_at',{ascending:false}),
      supabase.from('patients').select('id,first_name,last_name,mrn').eq('is_active',true).limit(200),
      supabase.from('consultants').select('id,profiles(full_name)').eq('is_active',true),
    ]);
    setRecords(r || []);
    setPatients(p || []);
    setConsultants(c || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('mrd_records').insert(form);
      if (error) throw error;
      toast.success('MRD record created!');
      setShowModal(false);
      fetchData();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Sunrise Medical Clinic – MRD Report', 14, 20);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.autoTable({
      startY: 34,
      head: [['Patient','MRN','Type','Ward','ICD Code','ICD Description','Bed Days','Consultant']],
      body: records.map(r => [
        `${r.patients?.first_name} ${r.patients?.last_name}`,
        r.patients?.mrn,
        r.record_type,
        r.ward || '–',
        r.icd_code || '–',
        r.icd_description || '–',
        r.bed_days || '0',
        r.consultants?.profiles?.full_name || '–',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save('mrd_report.pdf');
    toast.success('MRD report exported');
  };

  const filtered = records.filter(r =>
    search === '' ||
    `${r.patients?.first_name} ${r.patients?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    r.patients?.mrn?.toLowerCase().includes(search.toLowerCase()) ||
    r.icd_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>MRD Management</h1>
          <p>Medical Records Department – {records.length} records</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={15}/> Export Report</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15}/> Add Record</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:20}}>
        {[
          { label: 'Total Records', value: records.length, color:'blue' },
          { label: 'Inpatient', value: records.filter(r=>r.record_type==='inpatient').length, color:'teal' },
          { label: 'Outpatient', value: records.filter(r=>r.record_type==='outpatient').length, color:'green' },
          { label: 'Avg Bed Days', value: Math.round(records.reduce((s,r)=>s+(r.bed_days||0),0) / Math.max(records.filter(r=>r.bed_days>0).length,1)) || 0, color:'yellow' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--gray-500)',fontWeight:600,textTransform:'uppercase'}}>{s.label}</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--gray-900)',fontFamily:'Outfit'}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="search-bar">
            <Search size={15} className="search-icon" />
            <input placeholder="Search by patient, MRN, or ICD code..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient</th><th>MRN</th><th>Type</th><th>Ward</th><th>Admission</th>
                <th>Discharge</th><th>Bed Days</th><th>ICD Code</th><th>Consultant</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{r.patients?.first_name} {r.patients?.last_name}</div></td>
                  <td><span style={{fontFamily:'monospace',fontSize:12}}>{r.patients?.mrn}</span></td>
                  <td><span className={`badge ${r.record_type==='inpatient'?'badge-blue':r.record_type==='emergency'?'badge-red':'badge-gray'}`}>{r.record_type}</span></td>
                  <td style={{fontSize:12}}>{r.ward||'–'}</td>
                  <td style={{fontSize:12}}>{r.admission_date?new Date(r.admission_date).toLocaleDateString('en-AU'):'–'}</td>
                  <td style={{fontSize:12}}>{r.discharge_date?new Date(r.discharge_date).toLocaleDateString('en-AU'):'–'}</td>
                  <td style={{fontSize:13,fontWeight:600,textAlign:'center'}}>{r.bed_days||0}</td>
                  <td><span style={{fontFamily:'monospace',fontSize:12,background:'var(--primary-50)',color:'var(--primary-700)',padding:'2px 6px',borderRadius:4}}>{r.icd_code||'–'}</span></td>
                  <td style={{fontSize:12}}>Dr. {r.consultants?.profiles?.full_name||'–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Add MRD Record</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="label-required">Patient</label>
                    <select required value={form.patient_id} onChange={e=>setForm(p=>({...p,patient_id:e.target.value}))}>
                      <option value="">Select patient...</option>
                      {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Consultant</label>
                    <select value={form.consultant_id} onChange={e=>setForm(p=>({...p,consultant_id:e.target.value}))}>
                      <option value="">Select...</option>
                      {consultants.map(c=><option key={c.id} value={c.id}>Dr. {c.profiles?.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Record Type</label>
                    <select value={form.record_type} onChange={e=>setForm(p=>({...p,record_type:e.target.value}))}>
                      <option value="outpatient">Outpatient</option>
                      <option value="inpatient">Inpatient</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ward</label>
                    <select value={form.ward} onChange={e=>setForm(p=>({...p,ward:e.target.value}))}>
                      <option value="">Select ward...</option>
                      {WARDS.map(w=><option key={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bed Number</label>
                    <input placeholder="e.g. B-12" value={form.bed_number} onChange={e=>setForm(p=>({...p,bed_number:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Admission Date</label>
                    <input type="date" value={form.admission_date} onChange={e=>setForm(p=>({...p,admission_date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Discharge Date</label>
                    <input type="date" value={form.discharge_date} onChange={e=>setForm(p=>({...p,discharge_date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>ICD-10 Code</label>
                    <input placeholder="e.g. I10" value={form.icd_code} onChange={e=>setForm(p=>({...p,icd_code:e.target.value}))} />
                  </div>
                  <div className="form-group" style={{gridColumn:'span 2'}}>
                    <label>ICD Description</label>
                    <input placeholder="Diagnosis description" value={form.icd_description} onChange={e=>setForm(p=>({...p,icd_description:e.target.value}))} />
                  </div>
                  <div className="form-group" style={{gridColumn:'span 2'}}>
                    <label>Notes</label>
                    <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
