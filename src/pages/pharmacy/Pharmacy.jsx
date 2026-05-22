import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Pill, Plus, Search, AlertTriangle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Pharmacy() {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name:'', generic_name:'', brand:'', category:'Antibiotic', form:'tablet', strength:'', unit:'', current_stock:0, min_stock_level:10, unit_price:'', expiry_date:'', supplier:'', notes:'' });

  const CATEGORIES = ['Antibiotic','Analgesic','Antihypertensive','Antidiabetic','Anticoagulant','Antihistamine','Vitamin & Supplement','Vaccine','IV Fluid','Cardiac','Respiratory','Gastrointestinal','Neurological','Oncology','Topical','Other'];
  const FORMS = ['tablet','capsule','syrup','injection','infusion','inhaler','patch','cream','drops','suppository','powder'];

  useEffect(() => { fetchMeds(); }, []);

  const fetchMeds = async () => {
    setLoading(true);
    const { data } = await supabase.from('medications').select('*').order('name');
    setMeds(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ name:'', generic_name:'', brand:'', category:'Antibiotic', form:'tablet', strength:'', unit:'', current_stock:0, min_stock_level:10, unit_price:'', expiry_date:'', supplier:'', notes:'' });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({ name:m.name, generic_name:m.generic_name||'', brand:m.brand||'', category:m.category||'', form:m.form||'', strength:m.strength||'', unit:m.unit||'', current_stock:m.current_stock||0, min_stock_level:m.min_stock_level||10, unit_price:m.unit_price||'', expiry_date:m.expiry_date||'', supplier:m.supplier||'', notes:m.notes||'' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, unit_price: parseFloat(form.unit_price)||0, current_stock: parseInt(form.current_stock)||0 };
      const { error } = editingId
        ? await supabase.from('medications').update(payload).eq('id', editingId)
        : await supabase.from('medications').insert(payload);
      if (error) throw error;
      toast.success(editingId ? 'Medication updated!' : 'Medication added!');
      setShowModal(false);
      fetchMeds();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const filtered = meds.filter(m =>
    (search === '' || m.name.toLowerCase().includes(search.toLowerCase()) || m.generic_name?.toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === '' || m.category === categoryFilter)
  );

  const lowStock = meds.filter(m => m.current_stock <= m.min_stock_level);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pharmacy</h1>
          <p>{meds.length} medications · {lowStock.length} low stock alerts</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Medication</button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{background:'var(--warning-50)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:'12px 18px',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
          <AlertTriangle size={18} color="var(--warning-600)" />
          <span style={{fontSize:13,color:'var(--warning-600)',fontWeight:600}}>
            ⚠️ Low stock alert: {lowStock.map(m=>m.name).slice(0,3).join(', ')}{lowStock.length>3?` +${lowStock.length-3} more`:''}
          </span>
        </div>
      )}

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search medication..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Medication</th><th>Generic Name</th><th>Category</th><th>Form / Strength</th>
                <th>Stock</th><th>Min Stock</th><th>Unit Price</th><th>Expiry</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : filtered.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{fontWeight:600,fontSize:13}}>{m.name}</div>
                    {m.brand && <div style={{fontSize:11,color:'var(--gray-500)'}}>{m.brand}</div>}
                  </td>
                  <td style={{fontSize:13}}>{m.generic_name||'–'}</td>
                  <td><span className="badge badge-teal">{m.category}</span></td>
                  <td style={{fontSize:12}}>{m.form} {m.strength&&`· ${m.strength}`}</td>
                  <td>
                    <span style={{
                      fontWeight:700, fontSize:14,
                      color: m.current_stock <= m.min_stock_level ? 'var(--danger-600)' : 'var(--success-600)'
                    }}>
                      {m.current_stock} {m.unit}
                      {m.current_stock <= m.min_stock_level && ' ⚠️'}
                    </span>
                  </td>
                  <td style={{fontSize:13}}>{m.min_stock_level}</td>
                  <td style={{fontSize:13}}>${m.unit_price?.toFixed(2)}</td>
                  <td style={{fontSize:12,color: m.expiry_date && new Date(m.expiry_date) < new Date(Date.now()+30*24*3600000) ? 'var(--warning-600)' : 'var(--gray-600)'}}>
                    {m.expiry_date?new Date(m.expiry_date).toLocaleDateString('en-AU'):'–'}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(m)}><Edit size={14}/></button>
                  </td>
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
              <h3>{editingId?'Edit Medication':'Add Medication'}</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group"><label className="label-required">Medication Name</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Paracetamol 500mg Tablets"/></div>
                  <div className="form-group"><label>Generic Name</label><input value={form.generic_name} onChange={e=>setForm(p=>({...p,generic_name:e.target.value}))} placeholder="Acetaminophen"/></div>
                  <div className="form-group"><label>Brand</label><input value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))} placeholder="Panadol"/></div>
                  <div className="form-group"><label>Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div className="form-group"><label>Form</label><select value={form.form} onChange={e=>setForm(p=>({...p,form:e.target.value}))}>{FORMS.map(f=><option key={f}>{f}</option>)}</select></div>
                  <div className="form-group"><label>Strength</label><input value={form.strength} onChange={e=>setForm(p=>({...p,strength:e.target.value}))} placeholder="500mg"/></div>
                  <div className="form-group"><label>Unit</label><input value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="tablet / mL / vial"/></div>
                  <div className="form-group"><label>Unit Price ($)</label><input type="number" step="0.01" value={form.unit_price} onChange={e=>setForm(p=>({...p,unit_price:e.target.value}))} /></div>
                  <div className="form-group"><label>Current Stock</label><input type="number" value={form.current_stock} onChange={e=>setForm(p=>({...p,current_stock:e.target.value}))} /></div>
                  <div className="form-group"><label>Min Stock Level</label><input type="number" value={form.min_stock_level} onChange={e=>setForm(p=>({...p,min_stock_level:e.target.value}))} /></div>
                  <div className="form-group"><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={e=>setForm(p=>({...p,expiry_date:e.target.value}))} /></div>
                  <div className="form-group"><label>Supplier</label><input value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} /></div>
                </div>
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
