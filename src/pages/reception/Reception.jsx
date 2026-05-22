import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Building2, Calendar, Clock, Users, Search, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reception() {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: appts }, { data: recentPats }] = await Promise.all([
      supabase.from('appointments')
        .select('*, patients(first_name,last_name,mrn,phone,insurance_provider), consultants(profiles(full_name),specialization,department)')
        .eq('appointment_date', today)
        .order('appointment_time'),
      supabase.from('patients').select('*').order('created_at',{ascending:false}).limit(10),
    ]);
    setTodayAppointments(appts || []);
    setPatients(recentPats || []);
    setLoading(false);
  };

  const checkIn = async (apptId) => {
    const { error } = await supabase.from('appointments').update({ status:'checked_in' }).eq('id', apptId);
    if (!error) { toast.success('Patient checked in!'); fetchData(); }
  };

  const STATUS_STYLE = {
    scheduled: { bg:'var(--primary-50)', color:'var(--primary-700)' },
    confirmed: { bg:'#f0fdfa', color:'#0d9488' },
    checked_in: { bg:'var(--warning-50)', color:'var(--warning-600)' },
    in_progress: { bg:'#faf5ff', color:'#7c3aed' },
    completed: { bg:'var(--success-50)', color:'var(--success-600)' },
    cancelled: { bg:'var(--danger-50)', color:'var(--danger-600)' },
  };

  const stats = {
    total: todayAppointments.length,
    checkedIn: todayAppointments.filter(a=>a.status==='checked_in').length,
    completed: todayAppointments.filter(a=>a.status==='completed').length,
    waiting: todayAppointments.filter(a=>['scheduled','confirmed'].includes(a.status)).length,
  };

  const filteredAppts = todayAppointments.filter(a =>
    search === '' ||
    `${a.patients?.first_name} ${a.patients?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    a.patients?.mrn?.toLowerCase().includes(search.toLowerCase())
  );

  const timeSlots = {};
  filteredAppts.forEach(a => {
    const hour = a.appointment_time?.slice(0,2);
    if (!timeSlots[hour]) timeSlots[hour] = [];
    timeSlots[hour].push(a);
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reception Management</h1>
          <p>Front desk operations – {new Date().toLocaleDateString('en-AU',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <div className="page-header-actions">
          <div style={{fontSize:13,fontWeight:600,color:'var(--gray-600)',background:'white',padding:'8px 16px',borderRadius:8,border:'1px solid var(--gray-200)'}}>
            🕐 {new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label: 'Total Today', value: stats.total, icon: Calendar, color:'#3b82f6' },
          { label: 'Waiting', value: stats.waiting, icon: Clock, color:'#f59e0b' },
          { label: 'Checked In', value: stats.checkedIn, icon: Activity, color:'#7c3aed' },
          { label: 'Completed', value: stats.completed, icon: Users, color:'#22c55e' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{background:'white',borderRadius:12,padding:'16px 20px',border:'1px solid var(--gray-200)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',color:'var(--gray-500)'}}>{s.label}</div>
                <div style={{fontSize:26,fontWeight:800,color:'var(--gray-900)',fontFamily:'Outfit'}}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        {/* Appointment Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Today's Appointment Queue</div>
              <div className="card-subtitle">Manage patient check-ins</div>
            </div>
            <div className="search-bar" style={{maxWidth:220}}>
              <Search size={14} className="search-icon" />
              <input placeholder="Search patient..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{maxHeight:500,overflowY:'auto'}}>
            {loading ? (
              <div className="loading-overlay"><div className="spinner" /></div>
            ) : filteredAppts.length === 0 ? (
              <div className="empty-state" style={{padding:32}}>
                <Calendar size={32} color="var(--gray-300)" />
                <h3>No appointments today</h3>
              </div>
            ) : filteredAppts.map(a => {
              const st = STATUS_STYLE[a.status] || STATUS_STYLE.scheduled;
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:'1px solid var(--gray-100)',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--gray-50)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}
                >
                  <div style={{textAlign:'center',width:52,flexShrink:0}}>
                    <div style={{fontSize:17,fontWeight:800,color:'var(--gray-900)'}}>{a.appointment_time?.slice(0,5)}</div>
                    <div style={{fontSize:10,color:'var(--gray-400)'}}>{a.duration_minutes}min</div>
                  </div>
                  <div className="avatar">{a.patients?.first_name?.[0]}{a.patients?.last_name?.[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--gray-900)'}}>{a.patients?.first_name} {a.patients?.last_name}</div>
                    <div style={{fontSize:12,color:'var(--gray-500)'}}>{a.patients?.mrn} · Dr. {a.consultants?.profiles?.full_name}</div>
                    {a.reason && <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{a.reason}</div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                    <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,background:st.bg,color:st.color}}>
                      {a.status?.replace('_',' ')}
                    </span>
                    {a.status === 'scheduled' && (
                      <button className="btn btn-primary btn-sm" onClick={() => checkIn(a.id)}>Check In</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Patient Search & Info */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quick Patient Lookup</div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Search Patient</label>
                <input placeholder="Name, MRN, or phone..." />
              </div>
              <div style={{borderTop:'1px solid var(--gray-100)',paddingTop:12}}>
                <div style={{fontSize:12,color:'var(--gray-500)',marginBottom:8,fontWeight:600}}>RECENTLY REGISTERED</div>
                {patients.slice(0,5).map(p => (
                  <div key={p.id} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-50)'}}>
                    <div className="avatar avatar-sm">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.first_name} {p.last_name}</div>
                      <div style={{fontSize:11,color:'var(--gray-500)'}}>{p.mrn}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="card">
            <div className="card-header"><div className="card-title">Clinic Status</div></div>
            <div className="card-body">
              {[
                { label: 'Consultants On Duty', value: '4', icon: '👨‍⚕️' },
                { label: 'Average Wait Time', value: '18 min', icon: '⏱️' },
                { label: 'Rooms Available', value: '3 of 8', icon: '🏥' },
                { label: 'Emergency Status', value: 'Normal', icon: '🟢' },
              ].map(item => (
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--gray-50)'}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',fontSize:13}}>
                    <span>{item.icon}</span>
                    <span style={{color:'var(--gray-600)'}}>{item.label}</span>
                  </div>
                  <span style={{fontWeight:700,fontSize:13,color:'var(--gray-900)'}}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
