import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Shield, Search, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchLogs(); }, [actionFilter, dateFrom, dateTo]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('audit_logs')
        .select('*, profiles(full_name,role)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionFilter) query = query.eq('action', actionFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z');

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch { toast.error('Could not load audit logs'); }
    finally { setLoading(false); }
  };

  const filtered = logs.filter(l =>
    search === '' ||
    l.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.table_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Sunrise Medical Clinic – Audit Log Report', 14, 20);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Records: ${filtered.length}`, 14, 28);
    doc.autoTable({
      startY: 34,
      head: [['Timestamp','User','Role','Action','Table','Record ID','IP Address','Description']],
      body: filtered.map(l => [
        new Date(l.created_at).toLocaleString('en-AU'),
        l.profiles?.full_name || l.user_id?.slice(0,8) + '…',
        l.profiles?.role || '–',
        l.action,
        l.table_name,
        l.record_id?.slice(0,8) + '…' || '–',
        l.ip_address || '–',
        (l.description || '').slice(0, 50),
      ]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save(`audit_log_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Audit log exported!');
  };

  const ACTION_COLORS = {
    LOGIN: 'badge-green', LOGOUT: 'badge-gray', CREATE: 'badge-blue', UPDATE: 'badge-yellow',
    DELETE: 'badge-red', VIEW: 'badge-teal', EXPORT: 'badge-purple', FAILED_LOGIN: 'badge-red',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Audit Logs</h1>
          <p>HIPAA-compliant activity log · {filtered.length} records</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={exportPDF}><Download size={15}/> Export PDF</button>
        </div>
      </div>

      {/* HIPAA Notice */}
      <div style={{background:'var(--primary-50)',border:'1px solid rgba(30,64,175,0.2)',borderRadius:10,padding:'12px 18px',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
        <Shield size={18} color="var(--primary-600)" />
        <span style={{fontSize:13,color:'var(--primary-700)',fontWeight:600}}>
          HIPAA Audit Trail – All access to patient data is logged and retained for 6 years. Logs are tamper-evident.
        </span>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0,flexWrap:'wrap'}}>
            <div className="search-bar">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by user, table, description..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={actionFilter} onChange={e=>setActionFilter(e.target.value)}>
              <option value="">All Actions</option>
              {['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','VIEW','EXPORT','FAILED_LOGIN'].map(a=><option key={a}>{a}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{width:'auto'}} placeholder="From date" />
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{width:'auto'}} placeholder="To date" />
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setActionFilter(''); setDateFrom(''); setDateTo(''); fetchLogs(); }}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th><th>User</th><th>Role</th><th>Action</th>
                <th>Table</th><th>Record ID</th><th>IP Address</th><th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="loading-overlay"><div className="spinner" style={{width:36,height:36}}/></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state" style={{padding:40}}>
                    <Shield size={32} color="var(--gray-300)"/>
                    <h3>No audit logs found</h3>
                    <p>Adjust your filters to view logs</p>
                  </div>
                </td></tr>
              ) : filtered.map(l => (
                <tr key={l.id}>
                  <td style={{fontSize:11,whiteSpace:'nowrap'}}>{new Date(l.created_at).toLocaleString('en-AU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'})}</td>
                  <td>
                    <div style={{fontWeight:600,fontSize:12}}>{l.profiles?.full_name || 'System'}</div>
                    <div style={{fontSize:10,color:'var(--gray-400)',fontFamily:'monospace'}}>{l.user_id?.slice(0,12)}…</div>
                  </td>
                  <td style={{fontSize:12,textTransform:'capitalize'}}>{l.profiles?.role || '–'}</td>
                  <td><span className={`badge ${ACTION_COLORS[l.action]||'badge-gray'}`} style={{fontSize:10}}>{l.action}</span></td>
                  <td style={{fontSize:12,fontFamily:'monospace'}}>{l.table_name||'–'}</td>
                  <td style={{fontSize:10,fontFamily:'monospace',color:'var(--gray-400)'}}>{l.record_id?l.record_id.slice(0,10)+'…':'–'}</td>
                  <td style={{fontSize:11,fontFamily:'monospace'}}>{l.ip_address||'–'}</td>
                  <td style={{fontSize:12,color:'var(--gray-600)',maxWidth:240}}>
                    <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.description||'–'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
