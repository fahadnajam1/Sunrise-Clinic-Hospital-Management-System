import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Database, Download, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const REPORT_TEMPLATES = [
  { id:'daily_patients', label:'Daily Patient Summary', desc:'All patients seen today', icon:'👤', query:'patients', cols:['mrn','first_name','last_name','gender','date_of_birth'] },
  { id:'monthly_revenue', label:'Monthly Revenue Report', desc:'Invoice and billing summary', icon:'💰', query:'invoices', cols:['invoice_number','invoice_date','subtotal','total','status'] },
  { id:'appointment_summary', label:'Appointment Summary', desc:'Appointment status by date', icon:'📅', query:'appointments', cols:['appointment_date','appointment_time','type','status','room_number'] },
  { id:'inventory_status', label:'Inventory Status Report', desc:'Current stock levels', icon:'📦', query:'inventory', cols:['item_code','name','category','current_quantity','min_quantity','unit','unit_cost'] },
  { id:'medication_stock', label:'Medication Stock Report', desc:'Pharmacy inventory levels', icon:'💊', query:'medications', cols:['name','category','form','current_stock','min_stock_level','unit_price','expiry_date'] },
  { id:'discharge_summary', label:'Discharge Summary List', desc:'All discharge summaries', icon:'🏥', query:'discharge_summaries', cols:['discharge_date','primary_diagnosis','discharge_condition','discharge_type'] },
  { id:'claims_summary', label:'Insurance Claims Report', desc:'Outstanding and settled claims', icon:'🛡️', query:'claims', cols:['claim_number','claim_date','insurance_provider','claim_amount','status'] },
  { id:'attendance_report', label:'Staff Attendance Report', desc:'Staff attendance for this month', icon:'🕐', query:'attendance', cols:['date','status','check_in','check_out','total_hours'] },
];

export default function Reports() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const runReport = async () => {
    if (!selectedTemplate) { toast.error('Select a report template'); return; }
    setRunning(true);
    try {
      let query = supabase.from(selectedTemplate.query).select('*').limit(500);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z');
      query = query.order('created_at', {ascending:false});

      const { data, error } = await query;
      if (error) throw error;
      setResults(data||[]);
      toast.success(`${data?.length||0} records found`);
    } catch(err) { toast.error(err.message); }
    finally { setRunning(false); }
  };

  const exportPDF = () => {
    if (!results.length || !selectedTemplate) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Sunrise Medical Clinic – ${selectedTemplate.label}`, 14, 20);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Records: ${results.length}`, 14, 28);
    doc.autoTable({
      startY: 34,
      head: [selectedTemplate.cols.map(c => c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()))],
      body: results.slice(0,200).map(row => selectedTemplate.cols.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '–';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (col.includes('date') || col.includes('_at')) {
          try { return new Date(val).toLocaleDateString('en-AU'); } catch { return val; }
        }
        if (col.includes('price') || col.includes('cost') || col.includes('total') || col.includes('amount') || col.includes('salary') || col.includes('fee')) {
          return `$${parseFloat(val).toFixed(2)}`;
        }
        return String(val).slice(0,50);
      })),
      styles:{fontSize:8}, headStyles:{fillColor:[30,64,175]},
    });
    doc.save(`${selectedTemplate.id}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported!');
  };

  const displayCols = selectedTemplate ? selectedTemplate.cols : [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports</h1>
          <p>Generate and export clinical and operational reports</p>
        </div>
        <div className="page-header-actions">
          {results.length > 0 && (
            <button className="btn btn-secondary" onClick={exportPDF}><Download size={15}/> Export PDF</button>
          )}
        </div>
      </div>

      {/* Template Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12,marginBottom:20}}>
        {REPORT_TEMPLATES.map(t=>(
            <div key={t.id}
            onClick={()=>{ setSelectedTemplate(t); setResults([]); }}
            style={{
              background: selectedTemplate?.id===t.id ? 'var(--primary-50)' : 'white',
              borderRadius:10, padding:'16px',
              border:`2px solid ${selectedTemplate?.id===t.id?'var(--primary-500)':'var(--gray-200)'}`,
              cursor:'pointer', transition:'all 0.15s'
            }}
            onMouseEnter={e=>{ if(selectedTemplate?.id!==t.id) e.currentTarget.style.borderColor='var(--primary-200)'; }}
            onMouseLeave={e=>{ if(selectedTemplate?.id!==t.id) e.currentTarget.style.borderColor='var(--gray-200)'; }}
          >
            <div style={{fontSize:24,marginBottom:8}}>{t.icon}</div>
            <div style={{fontWeight:700,fontSize:13,color:selectedTemplate?.id===t.id?'var(--primary-700)':'var(--gray-900)',marginBottom:3}}>{t.label}</div>
            <div style={{fontSize:11,color:'var(--gray-500)'}}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Filters & Run */}
      {selectedTemplate && (
        <div className="card" style={{marginBottom:16}}>
          <div className="card-body" style={{padding:'14px 20px'}}>
            <div className="filters-bar" style={{margin:0}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--gray-800)'}}>{selectedTemplate.icon} {selectedTemplate.label}</div>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{width:'auto'}} placeholder="From date"/>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{width:'auto'}} placeholder="To date"/>
              <button className="btn btn-primary" onClick={runReport} disabled={running}>
                <Play size={14}/> {running?'Running…':'Run Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{results.length} Records Found</div>
            <button className="btn btn-secondary btn-sm" onClick={exportPDF}><Download size={13}/> Export PDF</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {displayCols.map(col=>(
                    <th key={col}>{col.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(0,100).map((row,i)=>(
                  <tr key={i}>
                    {displayCols.map(col=>{
                      const val = row[col];
                      let display = '–';
                      if (val !== null && val !== undefined) {
                        if (col.includes('date') || col.includes('_at')) {
                          try { display = new Date(val).toLocaleDateString('en-AU'); } catch { display = String(val); }
                        } else if (['price','cost','total','amount','salary','fee'].some(k=>col.includes(k))) {
                          display = `$${parseFloat(val).toFixed(2)}`;
                        } else {
                          display = String(val).slice(0, 60);
                        }
                      }
                      return <td key={col} style={{fontSize:12}}>{display}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length > 100 && (
            <div className="card-footer" style={{fontSize:12,color:'var(--gray-500)'}}>
              Showing 100 of {results.length} records. Export PDF to see all.
            </div>
          )}
        </div>
      )}

      {!selectedTemplate && (
        <div className="empty-state">
          <div className="empty-state-icon"><Database size={28}/></div>
          <h3>Select a report template</h3>
          <p>Choose a template above and click Run Report to generate your report</p>
        </div>
      )}
    </div>
  );
}
