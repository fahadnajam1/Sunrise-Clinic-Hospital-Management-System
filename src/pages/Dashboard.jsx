import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Calendar, Activity, DollarSign, TrendingUp, Clock,
  AlertTriangle, CheckCircle2, XCircle, HeartPulse,
  Stethoscope, Pill, Package, MessageSquare, ChevronRight,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Title, Filler);

const CHART_COLORS = {
  blue: '#3b82f6',
  teal: '#06b6d4',
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f97316',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    totalRevenue: 0,
    newPatientsThisMonth: 0,
    lowStockItems: 0,
    pendingFeedback: 0,
    activeConsultants: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [
        { count: patientCount },
        { count: todayAppts },
        { count: pendingClaimsCount },
        { data: revenueData },
        { count: newPatients },
        { count: lowStock },
        { count: pendingFb },
        { count: consultantCount },
        { data: appts },
        { data: patients },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('invoices').select('total,paid_amount,status').neq('status', 'draft').neq('status', 'cancelled'),
        supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('inventory').select('*', { count: 'exact', head: true }).lte('current_quantity', 5),
        supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('consultants').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('appointments').select('*, patients(first_name,last_name), consultants(profiles(full_name))').eq('appointment_date', today).order('appointment_time').limit(5),
        supabase.from('patients').select('id,mrn,first_name,last_name,created_at,gender').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalRevenue = revenueData?.reduce((sum, i) => {
        if (i.status === 'paid')    return sum + (i.total       || 0);
        if (i.status === 'partial') return sum + (i.paid_amount || 0);
        return sum; // sent/overdue — not yet collected
      }, 0) || 0;

      setStats({
        totalPatients: patientCount || 0,
        todayAppointments: todayAppts || 0,
        pendingClaims: pendingClaimsCount || 0,
        totalRevenue,
        newPatientsThisMonth: newPatients || 0,
        lowStockItems: lowStock || 0,
        pendingFeedback: pendingFb || 0,
        activeConsultants: consultantCount || 0,
      });
      setRecentAppointments(appts || []);
      setRecentPatients(patients || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const appointmentStatusData = {
    labels: ['Scheduled', 'Confirmed', 'Completed', 'Cancelled'],
    datasets: [{
      data: [35, 28, 112, 8],
      backgroundColor: [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.red],
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  const weeklyAdmissionsData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Patients',
      data: [24, 31, 28, 35, 29, 18, 12],
      backgroundColor: 'rgba(59,130,246,0.15)',
      borderColor: CHART_COLORS.blue,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: CHART_COLORS.blue,
      pointRadius: 4,
    }],
  };

  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [42000, 55000, 48000, 67000, 72000, 58000],
        backgroundColor: 'rgba(59,130,246,0.85)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: [28000, 32000, 30000, 38000, 41000, 35000],
        backgroundColor: 'rgba(6,182,212,0.85)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } } },
  };

  const barOpts = {
    ...chartOpts,
    scales: {
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const STAT_CARDS = [
    { label: 'Total Patients', value: stats.totalPatients.toLocaleString(), icon: Users, color: 'blue', change: `+${stats.newPatientsThisMonth} this month`, trend: 'up' },
    { label: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: 'teal', change: 'Scheduled today', trend: 'neutral' },
    { label: 'Active Consultants', value: stats.activeConsultants, icon: Stethoscope, color: 'green', change: 'Available', trend: 'neutral' },
    { label: 'Revenue (Paid)', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'purple', change: 'Total collected', trend: 'up' },
    { label: 'Pending Claims', value: stats.pendingClaims, icon: Activity, color: 'yellow', change: 'Awaiting response', trend: 'down' },
    { label: 'Low Stock Items', value: stats.lowStockItems, icon: Package, color: 'red', change: 'Need reorder', trend: 'down' },
    { label: 'New Feedback', value: stats.pendingFeedback, icon: MessageSquare, color: 'orange', change: 'Awaiting review', trend: 'neutral' },
    { label: 'Avg Wait Time', value: '18 min', icon: Clock, color: 'pink', change: '-3 min vs last week', trend: 'up' },
  ];

  const getStatusBadge = (status) => {
    const map = {
      scheduled: 'badge-blue',
      confirmed: 'badge-teal',
      completed: 'badge-green',
      cancelled: 'badge-red',
      checked_in: 'badge-yellow',
      in_progress: 'badge-purple',
      no_show: 'badge-gray',
    };
    return `badge ${map[status] || 'badge-gray'}`;
  };

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" style={{width:40,height:40}} />
    </div>
  );

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '24px 28px',
        marginBottom: 24,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(29,78,216,0.3)',
      }}>
        <div>
          <h2 style={{fontFamily:'Outfit',fontSize:22,fontWeight:800,marginBottom:4}}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0] || 'Doctor'} 👋
          </h2>
          <p style={{opacity:0.8,fontSize:14}}>
            {new Date().toLocaleDateString('en-AU', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} · Sunrise Medical Clinic
          </p>
        </div>
        <div style={{display:'flex',gap:12}}>
          <button className="btn" onClick={() => navigate('/patients/register')} style={{background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.3)',backdropFilter:'blur(4px)'}}>
            + New Patient
          </button>
          <button className="btn" onClick={() => navigate('/appointments')} style={{background:'white',color:'#1d4ed8',fontWeight:700}}>
            + Appointment
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card card-hover">
              <div className={`stat-icon ${card.color}`}>
                <Icon size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-label">{card.label}</div>
                <div className="stat-value">{card.value}</div>
                <div className={`stat-change ${card.trend}`}>
                  {card.trend === 'up' && <ArrowUpRight size={12} style={{display:'inline'}} />}
                  {card.trend === 'down' && <ArrowDownRight size={12} style={{display:'inline'}} />}
                  {card.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:24}}>
        {/* Weekly Admissions */}
        <div className="card" style={{gridColumn:'span 2'}}>
          <div className="card-header">
            <div>
              <div className="card-title">Weekly Patient Admissions</div>
              <div className="card-subtitle">Last 7 days trend</div>
            </div>
          </div>
          <div className="card-body" style={{height:220}}>
            <Line data={weeklyAdmissionsData} options={barOpts} />
          </div>
        </div>

        {/* Appointment Status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Appointment Status</div>
          </div>
          <div className="card-body" style={{height:220,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Doughnut data={appointmentStatusData} options={{...chartOpts, cutout:'70%'}} />
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:24}}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue vs Expenses</div>
              <div className="card-subtitle">Last 6 months (AUD)</div>
            </div>
          </div>
          <div className="card-body" style={{height:220}}>
            <Bar data={revenueData} options={barOpts} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
          </div>
          <div className="card-body" style={{padding:'12px 16px'}}>
            {[
              { label: 'Register New Patient', path: '/patients/register', color: 'var(--primary-600)', icon: Users },
              { label: 'Book Appointment', path: '/appointments', color: 'var(--accent-600)', icon: Calendar },
              { label: 'Generate Discharge', path: '/discharge', color: 'var(--success-600)', icon: HeartPulse },
              { label: 'Create Invoice', path: '/invoices', color: 'var(--warning-600)', icon: DollarSign },
              { label: 'View Analytics', path: '/analytics', color: '#7c3aed', icon: Activity },
              { label: 'Cybersecurity Policy', path: '/cybersecurity-policy', color: '#dc2626', icon: AlertTriangle },
            ].map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  style={{
                    width:'100%',display:'flex',alignItems:'center',gap:10,
                    padding:'10px 12px',borderRadius:8,border:'none',
                    background:'var(--gray-50)',cursor:'pointer',
                    transition:'all 0.2s',marginBottom:6,
                    fontSize:13,fontWeight:600,color:'var(--gray-700)',
                    textAlign:'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-50)'}
                >
                  <div style={{width:28,height:28,borderRadius:7,background:`${action.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Icon size={14} color={action.color} />
                  </div>
                  {action.label}
                  <ChevronRight size={14} style={{marginLeft:'auto',color:'var(--gray-400)'}} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Appointments */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Today's Appointments</div>
              <div className="card-subtitle">{new Date().toLocaleDateString('en-AU', {weekday:'long', month:'long', day:'numeric'})}</div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/appointments')}>View All</button>
          </div>
          <div>
            {recentAppointments.length === 0 ? (
              <div className="empty-state" style={{padding:32}}>
                <Calendar size={32} color="var(--gray-300)" />
                <p style={{marginTop:8}}>No appointments today</p>
              </div>
            ) : recentAppointments.map(appt => (
              <div key={appt.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:'1px solid var(--gray-100)'}}>
                <div className="avatar avatar-sm">{appt.patients?.first_name?.[0]}{appt.patients?.last_name?.[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {appt.patients?.first_name} {appt.patients?.last_name}
                  </div>
                  <div style={{fontSize:12,color:'var(--gray-500)'}}>{appt.appointment_time?.slice(0,5)} · {appt.type}</div>
                </div>
                <span className={getStatusBadge(appt.status)}>{appt.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recently Registered</div>
              <div className="card-subtitle">Newest patients</div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/patients')}>View All</button>
          </div>
          <div>
            {recentPatients.length === 0 ? (
              <div className="empty-state" style={{padding:32}}>
                <Users size={32} color="var(--gray-300)" />
                <p style={{marginTop:8}}>No patients yet</p>
              </div>
            ) : recentPatients.map(p => (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:'1px solid var(--gray-100)'}}>
                <div className="avatar avatar-sm">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)'}}>{p.first_name} {p.last_name}</div>
                  <div style={{fontSize:12,color:'var(--gray-500)'}}>{p.mrn} · {p.gender}</div>
                </div>
                <div style={{fontSize:11,color:'var(--gray-400)'}}>{new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
