import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Plus, Search, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lineItems, setLineItems] = useState([{ service_id:'', description:'', quantity:1, unit_price:'' }]);
  const [form, setForm] = useState({ patient_id:'', invoice_date:new Date().toISOString().split('T')[0], due_date:'', discount:0, notes:'', status:'paid' });

  useEffect(() => { fetchData(); }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: inv }, { data: pats }, { data: svcs }] = await Promise.all([
      supabase.from('invoices').select('*, patients(first_name,last_name,mrn)').order('created_at',{ascending:false}).limit(100),
      supabase.from('patients').select('id,first_name,last_name,mrn').eq('is_active',true).limit(200),
      supabase.from('services').select('id,code,name,base_price').eq('is_active',true),
    ]);
    setInvoices(inv || []);
    setPatients(pats || []);
    setServices(svcs || []);
    setLoading(false);
  };

  const addLine = () => setLineItems(p=>[...p,{service_id:'',description:'',quantity:1,unit_price:''}]);
  const removeLine = (i) => setLineItems(p=>p.filter((_,idx)=>idx!==i));
  const updateLine = (i, key, val) => {
    setLineItems(p => {
      const next = [...p];
      next[i] = { ...next[i], [key]: val };
      if (key === 'service_id') {
        const svc = services.find(s=>s.id===val);
        if (svc) { next[i].description = svc.name; next[i].unit_price = svc.base_price; }
      }
      return next;
    });
  };

  const getTotal = () => lineItems.reduce((s,l)=>s+(parseFloat(l.unit_price)||0)*(parseInt(l.quantity)||1),0);
  const getGrandTotal = () => Math.max(0, getTotal() - (parseFloat(form.discount)||0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lineItems.length === 0) { toast.error('Add at least one service'); return; }
    setSaving(true);
    try {
      const subtotal = getTotal();
      const total = getGrandTotal();
      const { data: inv, error } = await supabase.from('invoices').insert({
        invoice_number:'', patient_id:form.patient_id, invoice_date:form.invoice_date,
        due_date:form.due_date||null, subtotal, discount:parseFloat(form.discount)||0,
        total, balance: form.status === 'paid' ? 0 : total,
        paid_amount: form.status === 'paid' ? total : 0,
        status: form.status,
        notes:form.notes, created_by:user?.id,
      }).select().single();
      if (error) throw error;

      await supabase.from('invoice_items').insert(
        lineItems.filter(l=>l.description).map(l=>({
          invoice_id:inv.id, service_id:l.service_id||null,
          description:l.description, quantity:parseInt(l.quantity)||1,
          unit_price:parseFloat(l.unit_price)||0,
          total:(parseFloat(l.unit_price)||0)*(parseInt(l.quantity)||1),
        }))
      );
      toast.success(`Invoice ${inv.invoice_number} created!`);
      setShowModal(false);
      fetchData();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const exportInvoicePDF = async (inv) => {
    const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 45, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', pageW - 14, 22, { align: 'right' });
    doc.setFontSize(11);
    doc.text('Sunrise Medical Clinic', 14, 18);
    doc.setFontSize(9);
    doc.text('ABN: 12 345 678 901 · 123 Sunshine Ave, Footscray VIC 3011', 14, 26);
    doc.text('Ph: (03) 9000 0000 · admin@sunrise.clinic', 14, 33);
    doc.text('HIPAA Compliant', 14, 40);

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${inv.invoice_number}`, 14, 56);
    doc.text(`Date: ${new Date(inv.invoice_date).toLocaleDateString('en-AU')}`, 14, 63);
    doc.text(`Patient: ${inv.patients?.first_name} ${inv.patients?.last_name} (${inv.patients?.mrn})`, 14, 70);
    if (inv.due_date) doc.text(`Due Date: ${new Date(inv.due_date).toLocaleDateString('en-AU')}`, 14, 77);

    doc.autoTable({
      startY: 86,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: (items||[]).map(i => [i.description, i.quantity, `$${i.unit_price.toFixed(2)}`, `$${i.total.toFixed(2)}`]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
      foot: [
        ['', '', 'Subtotal:', `$${inv.subtotal?.toFixed(2)}`],
        ['', '', 'Discount:', `-$${inv.discount?.toFixed(2)}`],
        ['', '', 'TOTAL DUE:', `$${inv.total?.toFixed(2)}`],
      ],
      footStyles: { fontStyle: 'bold' },
    });
    doc.save(`invoice_${inv.invoice_number}.pdf`);
    toast.success('Invoice exported');
  };

  const STATUS_COLORS = { draft:'badge-gray', sent:'badge-blue', paid:'badge-green', partial:'badge-yellow', overdue:'badge-red', cancelled:'badge-gray' };
  const filtered = invoices.filter(i =>
    (search===''||`${i.patients?.first_name} ${i.patients?.last_name}`.toLowerCase().includes(search.toLowerCase())||i.invoice_number.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter===''||i.status===statusFilter)
  );

  const totalRevenue = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.total||0),0);
  const outstanding = invoices.filter(i=>['sent','partial','overdue'].includes(i.status)).reduce((s,i)=>s+(i.balance||0),0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Billing & Invoices</h1>
          <p>Total Revenue: A${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2})} · Outstanding: A${outstanding.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15}/> Create Invoice</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar"><Search size={15} className="search-icon"/><input placeholder="Search by patient or invoice number..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['draft','sent','paid','partial','overdue','cancelled'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Invoice #</th><th>Patient</th><th>Date</th><th>Due Date</th><th>Subtotal</th><th>Discount</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={11}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : filtered.map(inv => (
                <tr key={inv.id}>
                  <td><span style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--primary-700)'}}>{inv.invoice_number}</span></td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{inv.patients?.first_name} {inv.patients?.last_name}</div><div style={{fontSize:11,color:'var(--gray-500)'}}>{inv.patients?.mrn}</div></td>
                  <td style={{fontSize:12}}>{new Date(inv.invoice_date).toLocaleDateString('en-AU')}</td>
                  <td style={{fontSize:12}}>{inv.due_date?new Date(inv.due_date).toLocaleDateString('en-AU'):'–'}</td>
                  <td style={{fontSize:13}}>A${inv.subtotal?.toFixed(2)}</td>
                  <td style={{fontSize:13,color:'var(--danger-600)'}}>{inv.discount>0?`-A$${inv.discount.toFixed(2)}`:'–'}</td>
                  <td style={{fontSize:13,fontWeight:700}}>A${inv.total?.toFixed(2)}</td>
                  <td style={{fontSize:13,color:'var(--success-600)'}}>A${inv.paid_amount?.toFixed(2)}</td>
                  <td style={{fontSize:13,fontWeight:700,color:inv.balance>0?'var(--danger-600)':'var(--success-600)'}}>A${inv.balance?.toFixed(2)}</td>
                  <td><span className={`badge ${STATUS_COLORS[inv.status]||'badge-gray'}`}>{inv.status}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={()=>exportInvoicePDF(inv)}><Download size={13}/> PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal modal-xl">
            <div className="modal-header">
              <h3>Create Invoice</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="label-required">Patient</label>
                    <select required value={form.patient_id} onChange={e=>setForm(p=>({...p,patient_id:e.target.value}))}>
                      <option value="">Select patient...</option>
                      {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Invoice Date</label>
                    <input type="date" value={form.invoice_date} onChange={e=>setForm(p=>({...p,invoice_date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}
                      style={{borderColor: form.status==='paid'?'#22c55e': form.status==='draft'?'#94a3b8':'#f59e0b'}}>
                      <option value="paid">✅ Paid (Cash / Card)</option>
                      <option value="sent">📤 Sent – Awaiting Payment</option>
                      <option value="partial">⚠️ Partially Paid</option>
                      <option value="draft">📝 Draft</option>
                      <option value="overdue">🔴 Overdue</option>
                    </select>
                  </div>
                </div>

                {/* Line Items */}
                <div style={{border:'1px solid var(--gray-200)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
                  <div style={{padding:'10px 14px',background:'var(--gray-50)',borderBottom:'1px solid var(--gray-200)',fontWeight:700,fontSize:13}}>Line Items</div>
                  {lineItems.map((line, idx) => (
                    <div key={idx} style={{display:'grid',gridTemplateColumns:'2fr 3fr 1fr 1fr auto',gap:8,padding:'10px 14px',borderBottom:'1px solid var(--gray-100)'}}>
                      <select value={line.service_id} onChange={e=>updateLine(idx,'service_id',e.target.value)}>
                        <option value="">Select service...</option>
                        {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input placeholder="Description" value={line.description} onChange={e=>updateLine(idx,'description',e.target.value)} />
                      <input type="number" min="1" placeholder="Qty" value={line.quantity} onChange={e=>updateLine(idx,'quantity',e.target.value)} />
                      <input type="number" step="0.01" placeholder="Price $" value={line.unit_price} onChange={e=>updateLine(idx,'unit_price',e.target.value)} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeLine(idx)}>✗</button>
                    </div>
                  ))}
                  <div style={{padding:'8px 14px'}}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}><Plus size={13}/> Add Line</button>
                  </div>
                </div>

                <div style={{display:'flex',justifyContent:'flex-end',gap:16}}>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,color:'var(--gray-500)'}}>Subtotal: <strong>A${getTotal().toFixed(2)}</strong></div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
                      <span style={{fontSize:12,color:'var(--gray-500)'}}>Discount ($):</span>
                      <input type="number" step="0.01" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} style={{width:90}} />
                    </div>
                    <div style={{fontSize:16,fontWeight:800,color:'var(--primary-700)',marginTop:8}}>TOTAL: A${getGrandTotal().toFixed(2)}</div>
                  </div>
                </div>

                <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Creating...':'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
