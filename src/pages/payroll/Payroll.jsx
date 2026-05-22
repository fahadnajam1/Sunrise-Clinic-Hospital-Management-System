import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, Plus, Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Payroll() {
  const { user } = useAuth();
  const [payroll, setPayroll] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ profile_id:'', pay_period_start:'', pay_period_end:'', base_salary:'', allowances:'0', overtime_hours:'0', overtime_rate:'0', deductions:'0', tax:'0', notes:'' });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('payroll').select('*, profiles(full_name,role,employee_id)').order('created_at',{ascending:false}).limit(100),
      supabase.from('profiles').select('id,full_name,role,employee_id').eq('is_active',true),
    ]);
    setPayroll(p||[]);
    setStaff(s||[]);
    setLoading(false);
  };

  const calcNet = () => {
    const base = parseFloat(form.base_salary)||0;
    const allow = parseFloat(form.allowances)||0;
    const ot = (parseFloat(form.overtime_hours)||0)*(parseFloat(form.overtime_rate)||0);
    const ded = parseFloat(form.deductions)||0;
    const tax = parseFloat(form.tax)||0;
    return base + allow + ot - ded - tax;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const net = calcNet();
      const { error } = await supabase.from('payroll').insert({
        ...form,
        base_salary: parseFloat(form.base_salary)||0,
        allowances: parseFloat(form.allowances)||0,
        overtime_hours: parseFloat(form.overtime_hours)||0,
        overtime_rate: parseFloat(form.overtime_rate)||0,
        deductions: parseFloat(form.deductions)||0,
        tax: parseFloat(form.tax)||0,
        net_pay: net,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success('Payroll record created!');
      setShowModal(false);
      fetchData();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Sunrise Medical Clinic – Payroll Report', 14, 20);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.autoTable({
      startY: 34,
      head: [['Employee','Role','Period','Base Salary','Allowances','OT Pay','Deductions','Tax','Net Pay','Status']],
      body: payroll.map(p=>[
        p.profiles?.full_name, p.profiles?.role,
        `${p.pay_period_start} to ${p.pay_period_end}`,
        `$${p.base_salary?.toFixed(2)}`, `$${p.allowances?.toFixed(2)}`,
        `$${((p.overtime_hours||0)*(p.overtime_rate||0)).toFixed(2)}`,
        `$${p.deductions?.toFixed(2)}`, `$${p.tax?.toFixed(2)}`,
        `$${p.net_pay?.toFixed(2)}`, p.payment_status,
      ]),
      styles:{fontSize:7.5}, headStyles:{fillColor:[30,64,175]},
    });
    doc.save('payroll_report.pdf');
    toast.success('Payroll exported!');
  };

  const totalNet = payroll.reduce((s,p)=>s+(p.net_pay||0),0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Payroll Management</h1>
          <p>{payroll.length} records · Total Net Pay: A${totalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={exportPDF}><Download size={15}/> Export</button>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={15}/> Add Payroll</button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Employee</th><th>Role</th><th>Pay Period</th><th>Base Salary</th><th>Allowances</th><th>OT Pay</th><th>Tax</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : payroll.length===0 ? (
                <tr><td colSpan={10}><div className="empty-state" style={{padding:40}}><Briefcase size={32} color="var(--gray-300)"/><h3>No payroll records</h3><p>Add records to track staff pay</p></div></td></tr>
              ) : payroll.map(p=>(
                <tr key={p.id}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{p.profiles?.full_name}</div><div style={{fontSize:11,color:'var(--gray-500)'}}>{p.profiles?.employee_id}</div></td>
                  <td style={{fontSize:12,textTransform:'capitalize'}}>{p.profiles?.role}</td>
                  <td style={{fontSize:12}}>{p.pay_period_start} – {p.pay_period_end}</td>
                  <td style={{fontSize:13}}>A${p.base_salary?.toFixed(2)}</td>
                  <td style={{fontSize:13}}>A${p.allowances?.toFixed(2)}</td>
                  <td style={{fontSize:13}}>A${((p.overtime_hours||0)*(p.overtime_rate||0)).toFixed(2)}</td>
                  <td style={{fontSize:13,color:'var(--danger-600)'}}>-A${p.tax?.toFixed(2)}</td>
                  <td style={{fontSize:13,color:'var(--danger-600)'}}>-A${p.deductions?.toFixed(2)}</td>
                  <td style={{fontSize:14,fontWeight:800,color:'var(--success-600)'}}>A${p.net_pay?.toFixed(2)}</td>
                  <td><span className={`badge ${p.payment_status==='paid'?'badge-green':p.payment_status==='pending'?'badge-yellow':'badge-gray'}`}>{p.payment_status||'pending'}</span></td>
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
              <h3>Add Payroll Record</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group"><label className="label-required">Staff Member</label><select required value={form.profile_id} onChange={e=>setForm(p=>({...p,profile_id:e.target.value}))}><option value="">Select...</option>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}</select></div>
                  <div className="form-group"><label className="label-required">Base Salary ($)</label><input required type="number" step="0.01" value={form.base_salary} onChange={e=>setForm(p=>({...p,base_salary:e.target.value}))}/></div>
                  <div className="form-group"><label className="label-required">Period Start</label><input required type="date" value={form.pay_period_start} onChange={e=>setForm(p=>({...p,pay_period_start:e.target.value}))}/></div>
                  <div className="form-group"><label className="label-required">Period End</label><input required type="date" value={form.pay_period_end} onChange={e=>setForm(p=>({...p,pay_period_end:e.target.value}))}/></div>
                  <div className="form-group"><label>Allowances ($)</label><input type="number" step="0.01" value={form.allowances} onChange={e=>setForm(p=>({...p,allowances:e.target.value}))}/></div>
                  <div className="form-group"><label>Overtime Hours</label><input type="number" step="0.5" value={form.overtime_hours} onChange={e=>setForm(p=>({...p,overtime_hours:e.target.value}))}/></div>
                  <div className="form-group"><label>Overtime Rate ($/hr)</label><input type="number" step="0.01" value={form.overtime_rate} onChange={e=>setForm(p=>({...p,overtime_rate:e.target.value}))}/></div>
                  <div className="form-group"><label>Deductions ($)</label><input type="number" step="0.01" value={form.deductions} onChange={e=>setForm(p=>({...p,deductions:e.target.value}))}/></div>
                  <div className="form-group"><label>Tax/PAYG ($)</label><input type="number" step="0.01" value={form.tax} onChange={e=>setForm(p=>({...p,tax:e.target.value}))}/></div>
                </div>
                <div style={{background:'var(--success-50)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:8,padding:'12px 16px',textAlign:'right'}}>
                  <span style={{fontSize:13,color:'var(--gray-600)'}}>Estimated Net Pay: </span>
                  <span style={{fontSize:18,fontWeight:800,color:'var(--success-600)'}}>A${calcNet().toFixed(2)}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Payroll'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
