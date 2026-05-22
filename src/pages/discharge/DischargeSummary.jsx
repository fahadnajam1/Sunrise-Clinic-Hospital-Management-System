import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function DischargeSummary() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    patient_id: '', consultant_id: '', admission_date: '', discharge_date: new Date().toISOString().split('T')[0],
    chief_complaint: '', primary_diagnosis: '', icd_codes: '',
    procedures_performed: '', therapy_administered: '', therapy_response: '',
    lab_results_summary: '', follow_up_instructions: '', diet_instructions: '',
    activity_restrictions: '', discharge_condition: 'stable', discharge_type: 'home',
    recommendations: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('discharge_summaries').select('*, patients(first_name,last_name,mrn), consultants(profiles(full_name))').order('created_at',{ascending:false}),
      supabase.from('patients').select('id,first_name,last_name,mrn').eq('is_active',true).limit(200),
      supabase.from('consultants').select('id,profiles(full_name),specialization').eq('is_active',true),
    ]);
    setSummaries(s || []);
    setPatients(p || []);
    setConsultants(c || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.discharge_date) { toast.error('Patient and discharge date are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        icd_codes: form.icd_codes ? form.icd_codes.split(',').map(s=>s.trim()) : [],
        generated_by: user?.id,
      };
      const { data, error } = await supabase.from('discharge_summaries').insert(payload).select().single();
      if (error) throw error;
      toast.success('Discharge summary generated!');
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleExportPDF = (summary) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 40, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('DISCHARGE SUMMARY', pageW / 2, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Sunrise Medical Clinic', pageW / 2, 28, { align: 'center' });
    doc.setFontSize(9);
    doc.text('HIPAA Compliant Document – Confidential', pageW / 2, 36, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    const rows = [
      ['Patient', `${summary.patients?.first_name} ${summary.patients?.last_name}`, 'MRN', summary.patients?.mrn],
      ['Consultant', `Dr. ${summary.consultants?.profiles?.full_name || 'N/A'}`, 'Discharge Date', summary.discharge_date],
      ['Admission Date', summary.admission_date || 'N/A', 'Condition', summary.discharge_condition],
      ['Primary Diagnosis', summary.primary_diagnosis || 'N/A', 'Discharge Type', summary.discharge_type],
    ];

    doc.autoTable({
      startY: 48,
      body: rows,
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [241, 245, 249] }, 2: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      theme: 'plain',
    });

    const y = doc.lastAutoTable.finalY + 10;

    const sections = [
      { title: 'Chief Complaint', content: summary.chief_complaint },
      { title: 'Procedures Performed', content: summary.procedures_performed },
      { title: 'Therapy Administered', content: summary.therapy_administered },
      { title: 'Therapy Response', content: summary.therapy_response },
      { title: 'Lab Results Summary', content: summary.lab_results_summary },
      { title: 'Follow-up Instructions', content: summary.follow_up_instructions },
      { title: 'Diet Instructions', content: summary.diet_instructions },
      { title: 'Activity Restrictions', content: summary.activity_restrictions },
      { title: 'Recommendations', content: summary.recommendations },
    ].filter(s => s.content);

    let cy = y;
    for (const sec of sections) {
      if (cy > 240) { doc.addPage(); cy = 20; }
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(sec.title, 14, cy);
      cy += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(sec.content, pageW - 28);
      doc.text(lines, 14, cy);
      cy += lines.length * 4.5 + 6;
    }

    doc.save(`discharge_${summary.patients?.mrn}_${summary.discharge_date}.pdf`);
    toast.success('Discharge summary exported');
  };

  const filtered = summaries.filter(s =>
    search === '' ||
    `${s.patients?.first_name} ${s.patients?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.patients?.mrn?.toLowerCase().includes(search.toLowerCase())
  );

  const CONDITION_COLORS = { stable:'badge-green', improved:'badge-teal', unchanged:'badge-yellow', deteriorated:'badge-red', deceased:'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Discharge Summary</h1>
          <p>Generate and manage patient discharge documentation</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Generate Summary
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="search-bar">
            <Search size={15} className="search-icon" />
            <input placeholder="Search by patient name or MRN..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" style={{width:36,height:36}} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={28} /></div>
              <h3>No discharge summaries yet</h3>
              <p>Generate a summary when a patient is discharged</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Discharge Date</th>
                  <th>Consultant</th>
                  <th>Primary Diagnosis</th>
                  <th>Condition</th>
                  <th>Discharge Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{fontWeight:600}}>{s.patients?.first_name} {s.patients?.last_name}</div>
                      <div style={{fontSize:11,color:'var(--gray-500)',fontFamily:'monospace'}}>{s.patients?.mrn}</div>
                    </td>
                    <td>{s.discharge_date ? new Date(s.discharge_date).toLocaleDateString('en-AU') : '–'}</td>
                    <td style={{fontSize:13}}>Dr. {s.consultants?.profiles?.full_name || '–'}</td>
                    <td style={{fontSize:13,maxWidth:200}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.primary_diagnosis || '–'}</div></td>
                    <td><span className={`badge ${CONDITION_COLORS[s.discharge_condition]||'badge-gray'}`}>{s.discharge_condition}</span></td>
                    <td style={{textTransform:'capitalize',fontSize:13}}>{s.discharge_type}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleExportPDF(s)}>
                        <Download size={13} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => {if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="modal modal-xl">
            <div className="modal-header">
              <h3>Generate Discharge Summary</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div className="form-group">
                  <label className="label-required">Patient</label>
                  <select required value={form.patient_id} onChange={e => setForm(p=>({...p,patient_id:e.target.value}))}>
                    <option value="">Select patient...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Consultant</label>
                  <select value={form.consultant_id} onChange={e => setForm(p=>({...p,consultant_id:e.target.value}))}>
                    <option value="">Select doctor...</option>
                    {consultants.map(c => <option key={c.id} value={c.id}>Dr. {c.profiles?.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Admission Date</label>
                  <input type="date" value={form.admission_date} onChange={e => setForm(p=>({...p,admission_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="label-required">Discharge Date</label>
                  <input type="date" required value={form.discharge_date} onChange={e => setForm(p=>({...p,discharge_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Discharge Condition</label>
                  <select value={form.discharge_condition} onChange={e => setForm(p=>({...p,discharge_condition:e.target.value}))}>
                    {['stable','improved','unchanged','deteriorated','deceased'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Discharge Type</label>
                  <select value={form.discharge_type} onChange={e => setForm(p=>({...p,discharge_type:e.target.value}))}>
                    {['home','transfer','ama','deceased','hospice'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chief Complaint</label>
                  <input value={form.chief_complaint} onChange={e => setForm(p=>({...p,chief_complaint:e.target.value}))} placeholder="Presenting complaint" />
                </div>
                <div className="form-group">
                  <label>Primary Diagnosis</label>
                  <input value={form.primary_diagnosis} onChange={e => setForm(p=>({...p,primary_diagnosis:e.target.value}))} placeholder="Main diagnosis" />
                </div>
                <div className="form-group" style={{gridColumn:'span 2'}}>
                  <label>ICD-10 Codes</label>
                  <input value={form.icd_codes} onChange={e => setForm(p=>({...p,icd_codes:e.target.value}))} placeholder="J06.9, I10, E11.9 (comma separated)" />
                </div>
                {[
                  {key:'procedures_performed',label:'Procedures Performed'},
                  {key:'therapy_administered',label:'Therapy Administered'},
                  {key:'therapy_response',label:'Therapy Response'},
                  {key:'lab_results_summary',label:'Lab Results Summary'},
                  {key:'follow_up_instructions',label:'Follow-up Instructions'},
                  {key:'diet_instructions',label:'Diet Instructions'},
                  {key:'activity_restrictions',label:'Activity Restrictions'},
                  {key:'recommendations',label:'Recommendations on Discharge'},
                ].map(f => (
                  <div key={f.key} className="form-group" style={{gridColumn:'span 2'}}>
                    <label>{f.label}</label>
                    <textarea rows={2} value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.label} />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Generating...':'Generate & Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
