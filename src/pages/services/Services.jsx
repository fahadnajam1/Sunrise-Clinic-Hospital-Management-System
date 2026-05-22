import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Activity, Plus, Search, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code:'', name:'', category:'consultation', base_price:'', panel_price:'', emergency_surcharge:'0', night_surcharge:'0', gst_applicable:false, description:'', is_active:true });

  const CATS = ['consultation','procedure','lab','imaging','pharmacy','ward','other'];

  useEffect(() => { fetchServices(); }, []);
  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('category').order('name');
    setServices(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, base_price:parseFloat(form.base_price)||0, panel_price:parseFloat(form.panel_price)||0, emergency_surcharge:parseFloat(form.emergency_surcharge)||0, night_surcharge:parseFloat(form.night_surcharge)||0 };
      const { error } = editingId
        ? await supabase.from('services').update(payload).eq('id', editingId)
        : await supabase.from('services').insert(payload);
      if (error) throw error;
      toast.success('Service saved!');
      setShowModal(false);
      fetchServices();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({ code:s.code, name:s.name, category:s.category, base_price:s.base_price, panel_price:s.panel_price||'', emergency_surcharge:s.emergency_surcharge||0, night_surcharge:s.night_surcharge||0, gst_applicable:s.gst_applicable, description:s.description||'', is_active:s.is_active });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ code:'', name:'', category:'consultation', base_price:'', panel_price:'', emergency_surcharge:'0', night_surcharge:'0', gst_applicable:false, description:'', is_active:true });
    setShowModal(true);
  };

  const filtered = services.filter(s =>
    (search===''||s.name.toLowerCase().includes(search.toLowerCase())||s.code.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter===''||s.category===catFilter)
  );

  const CAT_COLORS = { consultation:'badge-blue', procedure:'badge-teal', lab:'badge-green', imaging:'badge-purple', pharmacy:'badge-yellow', ward:'badge-orange' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Service Management</h1>
          <p>{services.length} services in catalog</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Service</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar"><Search size={15} className="search-icon"/><input placeholder="Search services..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <select className="filter-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Code</th><th>Service Name</th><th>Category</th><th>Base Price</th><th>Panel Price</th><th>Emergency Surcharge</th><th>Night Surcharge</th><th>GST</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={10}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : filtered.map(s => (
                <tr key={s.id}>
                  <td><span style={{fontFamily:'monospace',fontSize:12,background:'var(--gray-100)',padding:'2px 7px',borderRadius:4}}>{s.code}</span></td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{s.name}</div>{s.description&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{s.description}</div>}</td>
                  <td><span className={`badge ${CAT_COLORS[s.category]||'badge-gray'}`}>{s.category}</span></td>
                  <td style={{fontSize:13,fontWeight:700,color:'var(--primary-700)'}}>A${s.base_price?.toFixed(2)}</td>
                  <td style={{fontSize:13}}>{s.panel_price?`A$${s.panel_price.toFixed(2)}`:'–'}</td>
                  <td style={{fontSize:13}}>{s.emergency_surcharge>0?`+A$${s.emergency_surcharge.toFixed(2)}`:'–'}</td>
                  <td style={{fontSize:13}}>{s.night_surcharge>0?`+A$${s.night_surcharge.toFixed(2)}`:'–'}</td>
                  <td><span className={`badge ${s.gst_applicable?'badge-yellow':'badge-gray'}`}>{s.gst_applicable?'10% GST':'No GST'}</span></td>
                  <td><span className={`badge ${s.is_active?'badge-green':'badge-gray'}`}>{s.is_active?'Active':'Inactive'}</span></td>
                  <td><button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(s)}><Edit size={14}/></button></td>
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
              <h3>{editingId?'Edit Service':'Add Service'}</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group"><label className="label-required">Service Code</label><input required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} placeholder="CONS-GP"/></div>
                  <div className="form-group"><label className="label-required">Service Name</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
                  <div className="form-group"><label>Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
                  <div className="form-group"><label>Description</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
                  <div className="form-group"><label className="label-required">Base Price ($)</label><input required type="number" step="0.01" value={form.base_price} onChange={e=>setForm(p=>({...p,base_price:e.target.value}))}/></div>
                  <div className="form-group"><label>Panel Price ($)</label><input type="number" step="0.01" value={form.panel_price} onChange={e=>setForm(p=>({...p,panel_price:e.target.value}))}/></div>
                  <div className="form-group"><label>Emergency Surcharge ($)</label><input type="number" step="0.01" value={form.emergency_surcharge} onChange={e=>setForm(p=>({...p,emergency_surcharge:e.target.value}))}/></div>
                  <div className="form-group"><label>Night Surcharge ($)</label><input type="number" step="0.01" value={form.night_surcharge} onChange={e=>setForm(p=>({...p,night_surcharge:e.target.value}))}/></div>
                </div>
                <div style={{display:'flex',gap:20,marginTop:8}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                    <input type="checkbox" checked={form.gst_applicable} onChange={e=>setForm(p=>({...p,gst_applicable:e.target.checked}))} />
                    GST Applicable (10%)
                  </label>
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                    <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} />
                    Active Service
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
