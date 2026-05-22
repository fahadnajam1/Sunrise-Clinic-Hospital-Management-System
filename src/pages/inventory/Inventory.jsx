import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Package, Plus, Search, AlertTriangle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ item_code:'', name:'', category:'consumable', description:'', current_quantity:0, min_quantity:1, unit:'', unit_cost:'', supplier:'', location:'', notes:'' });

  const CATS = ['equipment','consumable','furniture','IT','other'];

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('inventory').select('*').order('name');
    setItems(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, unit_cost: parseFloat(form.unit_cost)||0, current_quantity: parseInt(form.current_quantity)||0, min_quantity: parseInt(form.min_quantity)||1 };
      const { error } = editingId
        ? await supabase.from('inventory').update(payload).eq('id', editingId)
        : await supabase.from('inventory').insert(payload);
      if (error) throw error;
      toast.success(editingId?'Item updated!':'Item added!');
      setShowModal(false);
      fetchItems();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({ item_code:item.item_code, name:item.name, category:item.category, description:item.description||'', current_quantity:item.current_quantity, min_quantity:item.min_quantity, unit:item.unit||'', unit_cost:item.unit_cost||'', supplier:item.supplier||'', location:item.location||'', notes:item.notes||'' });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ item_code:'', name:'', category:'consumable', description:'', current_quantity:0, min_quantity:1, unit:'', unit_cost:'', supplier:'', location:'', notes:'' });
    setShowModal(true);
  };

  const filtered = items.filter(i =>
    (search===''||i.name.toLowerCase().includes(search.toLowerCase())||i.item_code.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter===''||i.category===catFilter)
  );

  const lowStock = items.filter(i=>i.current_quantity<=i.min_quantity);
  const totalValue = items.reduce((s,i)=>s+(i.unit_cost||0)*(i.current_quantity||0),0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inventory Management</h1>
          <p>{items.length} items · {lowStock.length} low stock · Total value: ${totalValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Item</button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{background:'var(--danger-50)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,padding:'12px 18px',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
          <AlertTriangle size={18} color="var(--danger-600)" />
          <span style={{fontSize:13,color:'var(--danger-600)',fontWeight:600}}>
            Critical: {lowStock.length} item(s) below minimum stock: {lowStock.map(i=>i.name).slice(0,3).join(', ')}
          </span>
        </div>
      )}

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar"><Search size={15} className="search-icon"/><input placeholder="Search by name or code..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
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
              <tr><th>Code</th><th>Item</th><th>Category</th><th>Qty</th><th>Min Qty</th><th>Unit Cost</th><th>Total Value</th><th>Location</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}><div className="loading-overlay"><div className="spinner"/></div></td></tr>
              : filtered.map(i => (
                <tr key={i.id}>
                  <td><span style={{fontFamily:'monospace',fontSize:12}}>{i.item_code}</span></td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{i.name}</div>{i.description&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{i.description}</div>}</td>
                  <td><span className={`badge ${i.category==='equipment'?'badge-blue':i.category==='consumable'?'badge-teal':'badge-gray'}`}>{i.category}</span></td>
                  <td>
                    <span style={{fontWeight:700,color:i.current_quantity<=i.min_quantity?'var(--danger-600)':i.current_quantity<=i.min_quantity*2?'var(--warning-600)':'var(--success-600)'}}>
                      {i.current_quantity} {i.unit}
                    </span>
                  </td>
                  <td style={{fontSize:13}}>{i.min_quantity}</td>
                  <td style={{fontSize:13}}>${(i.unit_cost||0).toFixed(2)}</td>
                  <td style={{fontSize:13,fontWeight:600}}>${((i.unit_cost||0)*(i.current_quantity||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  <td style={{fontSize:12}}>{i.location||'–'}</td>
                  <td><button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(i)}><Edit size={14}/></button></td>
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
              <h3>{editingId?'Edit Item':'Add Inventory Item'}</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group"><label className="label-required">Item Code</label><input required value={form.item_code} onChange={e=>setForm(p=>({...p,item_code:e.target.value}))} placeholder="EQ-001"/></div>
                  <div className="form-group"><label className="label-required">Item Name</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
                  <div className="form-group"><label>Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
                  <div className="form-group"><label>Unit</label><input value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="piece / box / set"/></div>
                  <div className="form-group"><label>Current Quantity</label><input type="number" value={form.current_quantity} onChange={e=>setForm(p=>({...p,current_quantity:e.target.value}))}/></div>
                  <div className="form-group"><label>Min Quantity</label><input type="number" value={form.min_quantity} onChange={e=>setForm(p=>({...p,min_quantity:e.target.value}))}/></div>
                  <div className="form-group"><label>Unit Cost ($)</label><input type="number" step="0.01" value={form.unit_cost} onChange={e=>setForm(p=>({...p,unit_cost:e.target.value}))}/></div>
                  <div className="form-group"><label>Supplier</label><input value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))}/></div>
                  <div className="form-group"><label>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Store Room A"/></div>
                  <div className="form-group"><label>Description</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
