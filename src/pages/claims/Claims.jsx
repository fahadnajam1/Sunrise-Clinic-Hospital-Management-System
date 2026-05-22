import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Receipt, Plus, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Claims() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id:'', insurance_provider:'', insurance_policy_number:'', claim_date:new Date().toISOString().split('T')[0], claim_amount:'', notes:'' });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('claims').select('*, patients(first_name,last_name,mrn,insurance_provider,insurance_number)').order('created_at',{ascending:false}),
      supabase.from('patients').select('id,first_name,last_name,mrn,insurance_provider,insurance_number').eq('is_active',true).limit(200),
    ]);
    setClaims(c||[]);
    setPatients(p||[]);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('claims').insert({ ...form, claim_number:'', claim_amount:parseFloat(form.claim_amount)||0, created_by:user?.id });
      if (error) throw error;
      toast.success('Claim submitted!');
      setShowModal(false);
      fetchData();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (claimId, status) => {
    const { error } = await supabase.from('claims').update({ status }).eq('id', claimId);
    if (!error) { toast.success(`Claim ${status}`); fetchData(); }
  };

  const exportStatement = (claim) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sunrise Medical Clinic', 14, 20);
    doc.setFontSize(12);
    doc.text('INSURANCE CLAIM STATEMENT', 14, 30);
    doc.setFontSize(9);
    doc.autoTable({
      startY: 40,
      body: [
        ['Claim Number', claim.claim_number],
        ['Claim Date', new Date(claim.claim_date).toLocaleDateString('en-AU')],
        ['Patient', `${claim.patients?.first_name} ${claim.patients?.last_name}`],
        ['MRN', claim.patients?.mrn],
        ['Insurance Provider', claim.insurance_provider],
        ['Policy Number', claim.insurance_policy_number||'N/A'],
        ['Claim Amount', `$${claim.claim_amount?.toFixed(2)}`],
        ['Approved Amount', claim.approved_amount?`$${claim.approved_amount.toFixed(2)}`:'Pending'],
        ['Status', claim.status.toUpperCase()],
      ],
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle:'bold', fillColor:[241,245,249] } },
      theme: 'plain',
    });
    doc.text(claim.notes||'No additional notes.', 14, doc.lastAutoTable.finalY+10);
    doc.save(`claim_${claim.claim_number}.pdf`);
    toast.success('Claim statement exported');
  };

  const STATUS_COLORS = { submitted:'badge-blue', under_review:'badge-yellow', approved:'badge-green', partial:'badge-teal', rejected:'badge-red', appealed:'badge-orange' };

  const filtered = claims.filter(c=>
    (search===''||`${c.patients?.first_name} ${c.patients?.last_name}`.toLowerCase().includes(search.toLowerCase())||c.claim_number.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter===''||c.status===statusFilter)
  );

  const totalClaimed = claims.reduce((s,c)=>s+(c.claim_amount||0),0);
  const totalApproved = claims.filter(c=>c.status==='approved').reduce((s,c)=>s+(c.approved_amount||0),0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Claims & Insurance</h1>
          <p>Total Claimed: A${totalClaimed.toLocaleString(undefined,{minimumFractionDigits:2})} · Approved: A${totalApproved.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={15}/> New Claim</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar"><Search size={15} className="search-icon"/><input placeholder="Search by patient or claim number..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['submitted','under_review','approved','partial','rejected','appealed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Claim #</th><th>Patient</th><th>Insurance</th><th>Claim Date</th><th>Claim Amount</th><th>Approved</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : filtered.map(c => (
                <tr key={c.id}>
                  <td><span style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--primary-700)'}}>{c.claim_number}</span></td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{c.patients?.first_name} {c.patients?.last_name}</div><div style={{fontSize:11,color:'var(--gray-500)'}}>{c.patients?.mrn}</div></td>
                  <td><div style={{fontSize:13}}>{c.insurance_provider}</div><div style={{fontSize:11,color:'var(--gray-500)'}}>{c.insurance_policy_number||'–'}</div></td>
                  <td style={{fontSize:12}}>{new Date(c.claim_date).toLocaleDateString('en-AU')}</td>
                  <td style={{fontSize:13,fontWeight:700}}>A${c.claim_amount?.toFixed(2)}</td>
                  <td style={{fontSize:13,color:'var(--success-600)'}}>{c.approved_amount?`A$${c.approved_amount.toFixed(2)}`:'Pending'}</td>
                  <td><span className={`badge ${STATUS_COLORS[c.status]||'badge-gray'}`}>{c.status.replace('_',' ')}</span></td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>exportStatement(c)}><Download size={13}/></button>
                      {c.status==='submitted' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(c.id,'approved')}>Approve</button>}
                      {c.status==='submitted' && <button className="btn btn-danger btn-sm" onClick={()=>updateStatus(c.id,'rejected')}>Reject</button>}
                    </div>
                  </td>
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
              <h3>Submit New Claim</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label-required">Patient</label>
                  <select required value={form.patient_id} onChange={e=>{
                    const p = patients.find(pt=>pt.id===e.target.value);
                    setForm(prev=>({...prev, patient_id:e.target.value, insurance_provider:p?.insurance_provider||'', insurance_policy_number:p?.insurance_number||'' }));
                  }}>
                    <option value="">Select patient...</option>
                    {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label-required">Insurance Provider</label>
                  <input required value={form.insurance_provider} onChange={e=>setForm(p=>({...p,insurance_provider:e.target.value}))} placeholder="Medibank, Bupa, etc." />
                </div>
                <div className="form-group">
                  <label>Policy Number</label>
                  <input value={form.insurance_policy_number} onChange={e=>setForm(p=>({...p,insurance_policy_number:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Claim Date</label>
                  <input type="date" value={form.claim_date} onChange={e=>setForm(p=>({...p,claim_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="label-required">Claim Amount ($)</label>
                  <input required type="number" step="0.01" value={form.claim_amount} onChange={e=>setForm(p=>({...p,claim_amount:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Submitting...':'Submit Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
