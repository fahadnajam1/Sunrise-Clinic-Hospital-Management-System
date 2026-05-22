import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BarChart3, TrendingUp, Users, CreditCard, Calendar } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Analytics() {
  const [stats, setStats] = useState({ patients:0, appointments:0, invoices:0, revenue:0 });
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ count: pCount }, { count: aCount }, { data: invoices, error: invErr }] = await Promise.all([
      supabase.from('patients').select('id',{count:'exact'}).eq('is_active',true),
      supabase.from('appointments').select('id',{count:'exact'}),
      supabase.from('invoices').select('total,paid_amount,status,created_at').order('created_at'),
    ]);

    if (invErr) console.warn('Analytics invoices error:', invErr.message);

    // Sum only collected revenue: full amount if paid, paid_amount if partial
    const calcRevenue = (list) => (list||[]).reduce((s, i) => {
      if (i.status === 'paid')    return s + (i.total       || 0);
      if (i.status === 'partial') return s + (i.paid_amount || 0);
      return s;
    }, 0);

    const revenue = calcRevenue(invoices);

    // Build monthly buckets for last 6 months
    const months = [];
    for (let i=5; i>=0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ label: d.toLocaleString('default',{month:'short'}), month: d.getMonth(), year: d.getFullYear() });
    }
    const monthlyData = months.map(m => {
      const monthInvoices = (invoices||[]).filter(i => {
        const d = new Date(i.created_at);
        return d.getMonth()===m.month && d.getFullYear()===m.year;
      });
      return { ...m, revenue: calcRevenue(monthInvoices) };
    });

    setStats({ patients: pCount||0, appointments: aCount||0, invoices: invoices?.length||0, revenue });
    setMonthly(monthlyData);
    setLoading(false);
  };


  const CHART_OPTS = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } };
  const COLORS = { blue: 'rgba(59,130,246,0.85)', teal: 'rgba(20,184,166,0.85)', green: 'rgba(34,197,94,0.85)' };

  const revenueData = {
    labels: monthly.map(m=>m.label),
    datasets: [{ label:'Revenue', data: monthly.map(m=>m.revenue), backgroundColor: CHART_OPTS.scales?.y ? COLORS.blue : '#3b82f6', borderRadius: 6 }]
  };

  const doughnutData = {
    labels: ['Inpatient','Outpatient','Emergency','Follow-up'],
    datasets: [{ data:[35,42,13,10], backgroundColor:['#3b82f6','#14b8a6','#f59e0b','#8b5cf6'], hoverOffset:6 }]
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Analytics & Business Intelligence</h1>
          <p>Performance metrics and clinical insights</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:24}}>
        {[
          { label:'Total Patients', value:stats.patients.toLocaleString(), icon:Users, color:'#3b82f6', trend:'+12.4%' },
          { label:'Appointments', value:stats.appointments.toLocaleString(), icon:Calendar, color:'#14b8a6', trend:'+8.1%' },
          { label:'Total Invoices', value:stats.invoices.toLocaleString(), icon:CreditCard, color:'#8b5cf6', trend:'+5.3%' },
          { label:'Total Revenue', value:`A$${stats.revenue.toLocaleString(undefined,{minimumFractionDigits:0})}`, icon:TrendingUp, color:'#22c55e', trend:'+18.7%' },
        ].map(s=>{
          const Icon = s.icon;
          return (
            <div key={s.label} style={{background:'white',borderRadius:14,padding:'20px 22px',border:'1px solid var(--gray-200)',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${s.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon size={20} color={s.color}/>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:'var(--success-600)',background:'var(--success-50)',padding:'3px 8px',borderRadius:20}}>{s.trend}</span>
              </div>
              <div style={{fontSize:26,fontWeight:900,color:'var(--gray-900)',fontFamily:'Outfit',marginBottom:4}}>{loading?'…':s.value}</div>
              <div style={{fontSize:12,color:'var(--gray-500)',fontWeight:600}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Monthly Revenue</div><div className="card-subtitle">Last 6 months</div></div>
          <div className="card-body" style={{height:260}}>
            <Bar data={revenueData} options={{...CHART_OPTS,maintainAspectRatio:false}} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🍩 Visit Types</div></div>
          <div className="card-body" style={{height:260,display:'flex',justifyContent:'center',alignItems:'center'}}>
            <Doughnut data={doughnutData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {[
          { label:'Patient Satisfaction', value:'94%', sub:'Based on 234 reviews', color:'#22c55e', icon:'⭐' },
          { label:'Appointment Completion', value:'87%', sub:'vs 81% last month', color:'#3b82f6', icon:'✅' },
          { label:'Bed Occupancy Rate', value:'73%', sub:'24/33 beds occupied', color:'#f59e0b', icon:'🏥' },
          { label:'Average Wait Time', value:'18 min', sub:'Target: <20 min ✓', color:'#22c55e', icon:'⏱️' },
          { label:'Staff Attendance', value:'96.4%', sub:'This month', color:'#8b5cf6', icon:'👥' },
          { label:'Revenue per Patient', value:'A$342', sub:'vs A$318 last month', color:'#14b8a6', icon:'💰' },
        ].map(m=>(
          <div key={m.label} style={{background:'white',borderRadius:12,padding:'20px',border:'1px solid var(--gray-200)'}}>
            <div style={{fontSize:28,marginBottom:8}}>{m.icon}</div>
            <div style={{fontSize:28,fontWeight:900,color:m.color,fontFamily:'Outfit'}}>{m.value}</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--gray-800)',marginTop:4}}>{m.label}</div>
            <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
