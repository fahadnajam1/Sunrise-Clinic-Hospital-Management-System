import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MessageSquare, Plus, Star, ThumbsUp, ThumbsDown, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_name:'', service_type:'consultation', rating:5, comments:'', feedback_type:'general', is_anonymous:false });

  useEffect(() => { fetchFeedback(); }, []);
  const fetchFeedback = async () => {
    setLoading(true);
    const { data } = await supabase.from('patient_feedback').select('*').order('created_at',{ascending:false}).limit(100);
    setFeedbacks(data||[]);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('patient_feedback').insert(form);
      if (error) throw error;
      toast.success('Feedback submitted!');
      setShowModal(false);
      fetchFeedback();
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((s,f)=>s+(f.rating||0),0)/feedbacks.length).toFixed(1) : '–';
  const positive = feedbacks.filter(f=>f.rating>=4).length;
  const negative = feedbacks.filter(f=>f.rating<=2).length;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Sunrise Medical Clinic – Patient Feedback Report', 14, 20);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${feedbacks.length} | Avg Rating: ${avgRating}/5`, 14, 28);
    doc.autoTable({
      startY: 34,
      head: [['Date','Patient','Service','Rating','Comments']],
      body: feedbacks.map(f=>[new Date(f.created_at).toLocaleDateString('en-AU'), f.is_anonymous?'Anonymous':f.patient_name||'–', f.service_type, `${f.rating}/5`, (f.comments||'').slice(0,60)]),
      styles:{fontSize:9}, headStyles:{fillColor:[30,64,175]},
    });
    doc.save('feedback_report.pdf');
    toast.success('Feedback report exported!');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Patient Feedback</h1>
          <p>Avg Rating: ⭐ {avgRating}/5 · {positive} positive · {negative} negative</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={exportPDF}><Download size={15}/> Export</button>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={15}/> Add Feedback</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Total Feedback', value:feedbacks.length, color:'#3b82f6' },
          { label:'Average Rating', value:`${avgRating} ⭐`, color:'#f59e0b' },
          { label:'Positive (4-5⭐)', value:positive, color:'#22c55e' },
          { label:'Negative (1-2⭐)', value:negative, color:'#ef4444' },
        ].map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:12,padding:'16px 20px',border:'1px solid var(--gray-200)'}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',color:'var(--gray-500)'}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.color,fontFamily:'Outfit'}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {loading ? (
          <div className="loading-overlay" style={{gridColumn:'span 3'}}><div className="spinner"/></div>
        ) : feedbacks.length === 0 ? (
          <div className="empty-state" style={{gridColumn:'span 3'}}>
            <MessageSquare size={32} color="var(--gray-300)"/>
            <h3>No feedback yet</h3>
            <p>Patient feedback will appear here</p>
          </div>
        ) : feedbacks.map(f => (
          <div key={f.id} className="card" style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{f.is_anonymous?'Anonymous Patient':f.patient_name||'Patient'}</div>
                <div style={{fontSize:11,color:'var(--gray-500)',textTransform:'capitalize'}}>{f.service_type} · {new Date(f.created_at).toLocaleDateString('en-AU')}</div>
              </div>
              <div style={{display:'flex',gap:2}}>
                {[1,2,3,4,5].map(i=>(
                  <Star key={i} size={14} fill={i<=f.rating?'#f59e0b':'none'} color={i<=f.rating?'#f59e0b':'#d1d5db'} />
                ))}
              </div>
            </div>
            {f.comments && <p style={{fontSize:13,color:'var(--gray-700)',fontStyle:'italic',lineHeight:1.6,margin:0}}>"{f.comments}"</p>}
            <div style={{marginTop:10,display:'flex',justifyContent:'flex-end'}}>
              {f.rating>=4 ? <ThumbsUp size={14} color="var(--success-600)"/> : f.rating<=2 ? <ThumbsDown size={14} color="var(--danger-600)"/> : null}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal">
            <div className="modal-header"><h3>Record Patient Feedback</h3><button className="modal-close" onClick={()=>setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.is_anonymous} onChange={e=>setForm(p=>({...p,is_anonymous:e.target.checked,patient_name:e.target.checked?'':p.patient_name}))}/>
                  <span style={{fontSize:13}}>Anonymous feedback</span>
                </label>
                {!form.is_anonymous && (
                  <div className="form-group"><label>Patient Name</label><input value={form.patient_name} onChange={e=>setForm(p=>({...p,patient_name:e.target.value}))}/></div>
                )}
                <div className="form-group"><label>Service Type</label>
                  <select value={form.service_type} onChange={e=>setForm(p=>({...p,service_type:e.target.value}))}>
                    {['consultation','emergency','pharmacy','lab','nursing','reception','billing'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="label-required">Rating</label>
                  <div style={{display:'flex',gap:8,marginTop:6}}>
                    {[1,2,3,4,5].map(r=>(
                      <button key={r} type="button" onClick={()=>setForm(p=>({...p,rating:r}))}
                        style={{width:40,height:40,border:`2px solid ${r<=form.rating?'#f59e0b':'var(--gray-200)'}`,borderRadius:8,background:r<=form.rating?'#fffbeb':'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Star size={18} fill={r<=form.rating?'#f59e0b':'none'} color={r<=form.rating?'#f59e0b':'#d1d5db'}/>
                      </button>
                    ))}
                    <span style={{fontSize:13,color:'var(--gray-600)',alignSelf:'center'}}>{form.rating}/5</span>
                  </div>
                </div>
                <div className="form-group"><label>Comments</label><textarea rows={3} value={form.comments} onChange={e=>setForm(p=>({...p,comments:e.target.value}))} placeholder="Describe your experience..."/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
