import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Shield, AlertTriangle, Calendar, FileText, Activity, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function PatientView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logAudit } = useAuth();
  const [patient, setPatient] = useState(null);
  const [ehrRecords, setEhrRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEhrModal, setShowEhrModal] = useState(false);
  const [ehrForm, setEhrForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    chief_complaint: '', history_of_present_illness: '',
    physical_examination: '', diagnosis: '', icd_code: '',
    treatment_plan: '', follow_up_date: '', notes: '',
    vital_signs: { bp: '', hr: '', temp: '', spo2: '', weight: '', height: '' }
  });
  const [savingEhr, setSavingEhr] = useState(false);

  useEffect(() => {
    fetchPatient();
    logAudit('VIEW', 'patients', id, 'Viewed patient record');
  }, [id]);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: ehr }, { data: appts }] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).single(),
        supabase.from('ehr_records').select('*, consultants(profiles(full_name))').eq('patient_id', id).order('visit_date', { ascending: false }),
        supabase.from('appointments').select('*, consultants(profiles(full_name))').eq('patient_id', id).order('appointment_date', { ascending: false }).limit(10),
      ]);
      setPatient(p);
      setEhrRecords(ehr || []);
      setAppointments(appts || []);
    } catch { toast.error('Could not load patient'); }
    finally { setLoading(false); }
  };

  const handleSaveEhr = async () => {
    setSavingEhr(true);
    try {
      const { error } = await supabase.from('ehr_records').insert({
        patient_id: id,
        ...ehrForm,
      });
      if (error) throw error;
      toast.success('EHR record saved!');
      setShowEhrModal(false);
      fetchPatient();
      logAudit('CREATE', 'ehr', id, 'Added EHR record');
    } catch (err) { toast.error(err.message); }
    finally { setSavingEhr(false); }
  };

  const handlePrintSummary = () => {
    if (!patient) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sunrise Medical Clinic', 14, 20);
    doc.setFontSize(13);
    doc.text('Patient Summary', 14, 28);
    doc.setFontSize(10);
    doc.text(`MRN: ${patient.mrn}`, 14, 38);
    doc.text(`Name: ${patient.first_name} ${patient.last_name}`, 14, 46);
    doc.text(`DOB: ${patient.date_of_birth || 'N/A'} | Gender: ${patient.gender || 'N/A'}`, 14, 54);
    doc.text(`Phone: ${patient.phone || 'N/A'} | Email: ${patient.email || 'N/A'}`, 14, 62);
    doc.text(`Medicare: ${patient.medicare_number || 'N/A'}`, 14, 70);
    doc.text(`Allergies: ${patient.allergies?.join(', ') || 'None known'}`, 14, 78);

    if (ehrRecords.length > 0) {
      doc.setFontSize(12);
      doc.text('Recent EHR Records', 14, 92);
      doc.autoTable({
        startY: 96,
        head: [['Date', 'Chief Complaint', 'Diagnosis', 'ICD Code']],
        body: ehrRecords.slice(0, 10).map(r => [
          r.visit_date, r.chief_complaint || '-', r.diagnosis || '-', r.icd_code || '-'
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 175] },
      });
    }
    doc.save(`patient_${patient.mrn}.pdf`);
    toast.success('Patient summary exported');
  };

  const getAge = (dob) => {
    if (!dob) return 'Unknown';
    const years = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} years old`;
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" style={{width:40,height:40}} /></div>;
  if (!patient) return <div className="empty-state"><AlertTriangle size={40} /><h3>Patient not found</h3></div>;

  return (
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/patients')} style={{marginBottom:8,padding:'6px 10px'}}>
            <ArrowLeft size={16} /> Back to Patients
          </button>
          <h1>{patient.first_name} {patient.last_name}</h1>
          <p>MRN: <strong>{patient.mrn}</strong> · {getAge(patient.date_of_birth)} · {patient.gender || 'Unknown gender'}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handlePrintSummary}>Export PDF</button>
          <button className="btn btn-primary" onClick={() => setShowEhrModal(true)}>
            <Plus size={15} /> Add EHR Record
          </button>
        </div>
      </div>

      {/* Patient Overview Card */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16,marginBottom:20}}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-body" style={{textAlign:'center',padding:'28px 20px'}}>
            <div className="avatar avatar-lg" style={{margin:'0 auto 12px',width:72,height:72,fontSize:26}}>
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <h3 style={{fontWeight:700,fontSize:17}}>{patient.first_name} {patient.last_name}</h3>
            <p style={{color:'var(--gray-500)',fontSize:13,marginTop:2}}>{patient.mrn}</p>

            {patient.allergies?.length > 0 && (
              <div style={{margin:'12px 0',padding:'8px 12px',background:'var(--danger-50)',borderRadius:8,border:'1px solid rgba(239,68,68,0.2)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--danger-600)',marginBottom:4}}>⚠️ ALLERGIES</div>
                <div style={{fontSize:12,color:'var(--danger-700)'}}>{patient.allergies.join(', ')}</div>
              </div>
            )}

            <div style={{textAlign:'left',marginTop:16}}>
              {patient.phone && (
                <div style={{display:'flex',gap:8,alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                  <Phone size={14} color="var(--gray-400)" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div style={{display:'flex',gap:8,alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                  <Mail size={14} color="var(--gray-400)" />
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div style={{display:'flex',gap:8,alignItems:'flex-start',padding:'8px 0',fontSize:13}}>
                  <MapPin size={14} color="var(--gray-400)" style={{flexShrink:0,marginTop:2}} />
                  <span>{patient.address}, {patient.suburb} {patient.postcode} {patient.state}</span>
                </div>
              )}
            </div>

            <div style={{marginTop:16,padding:'12px',background:'var(--gray-50)',borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--gray-500)',marginBottom:8}}>MEDICARE & INSURANCE</div>
              <div style={{fontSize:12,fontFamily:'monospace',color:'var(--gray-700)'}}>Medicare: {patient.medicare_number || 'N/A'}</div>
              <div style={{fontSize:12,color:'var(--gray-600)',marginTop:4}}>{patient.insurance_provider || 'No insurance'}</div>
            </div>
          </div>
        </div>

        {/* Tabs Card */}
        <div className="card">
          <div style={{padding:'0 20px'}}>
            <div className="tabs" style={{borderBottom:'none',marginBottom:0}}>
              {['overview','ehr','appointments'].map(tab => (
                <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}>
                  {tab === 'overview' ? '📋 Overview' : tab === 'ehr' ? '🩺 EHR Records' : '📅 Appointments'}
                </button>
              ))}
            </div>
          </div>
          <div style={{borderTop:'1px solid var(--gray-200)',padding:'16px 20px',maxHeight:420,overflowY:'auto'}}>

            {activeTab === 'overview' && (
              <div className="form-grid form-grid-2" style={{gap:12}}>
                {[
                  { label: 'Full Name', value: `${patient.first_name} ${patient.last_name}` },
                  { label: 'Date of Birth', value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-AU') : '–' },
                  { label: 'Age', value: getAge(patient.date_of_birth) },
                  { label: 'Gender', value: patient.gender || '–' },
                  { label: 'Blood Type', value: patient.blood_type || 'Unknown' },
                  { label: 'Medicare No.', value: patient.medicare_number || '–' },
                  { label: 'Insurance', value: patient.insurance_provider || '–' },
                  { label: 'Policy No.', value: patient.insurance_number || '–' },
                  { label: 'Emergency Contact', value: patient.emergency_contact_name || '–' },
                  { label: 'Emergency Phone', value: patient.emergency_contact_phone || '–' },
                  { label: 'Registered', value: new Date(patient.created_at).toLocaleDateString('en-AU') },
                  { label: 'Status', value: patient.is_active ? 'Active' : 'Inactive' },
                ].map(item => (
                  <div key={item.label} style={{padding:'10px 0',borderBottom:'1px solid var(--gray-50)'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--gray-400)',textTransform:'uppercase',marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--gray-800)'}}>{item.value}</div>
                  </div>
                ))}
                {patient.notes && (
                  <div style={{gridColumn:'span 2',padding:'10px 0'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--gray-400)',textTransform:'uppercase',marginBottom:4}}>Notes</div>
                    <div style={{fontSize:13,color:'var(--gray-700)',background:'var(--gray-50)',padding:'10px 12px',borderRadius:8}}>{patient.notes}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ehr' && (
              <>
                {ehrRecords.length === 0 ? (
                  <div className="empty-state" style={{padding:32}}>
                    <FileText size={28} color="var(--gray-300)"/>
                    <h3>No EHR records</h3>
                    <p>Click "Add EHR Record" to add the first clinical record</p>
                  </div>
                ) : ehrRecords.map(r => (
                  <div key={r.id} style={{padding:'14px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:14,color:'var(--gray-900)'}}>{r.chief_complaint || 'Visit Record'}</span>
                        {r.icd_code && (
                          <span style={{marginLeft:8,background:'var(--primary-50)',color:'var(--primary-700)',padding:'2px 8px',borderRadius:4,fontSize:11,fontFamily:'monospace'}}>
                            ICD: {r.icd_code}
                          </span>
                        )}
                      </div>
                      <span style={{fontSize:12,color:'var(--gray-500)'}}>{new Date(r.visit_date).toLocaleDateString('en-AU')}</span>
                    </div>
                    {r.diagnosis && <div style={{fontSize:13,color:'var(--gray-700)',marginBottom:4}}><strong>Dx:</strong> {r.diagnosis}</div>}
                    {r.treatment_plan && <div style={{fontSize:12,color:'var(--gray-600)'}}><strong>Rx:</strong> {r.treatment_plan}</div>}
                    {r.vital_signs && Object.values(r.vital_signs).some(Boolean) && (
                      <div style={{marginTop:6,display:'flex',gap:12,flexWrap:'wrap'}}>
                        {r.vital_signs.bp && <span style={{fontSize:11,background:'var(--gray-100)',padding:'2px 8px',borderRadius:4}}>BP: {r.vital_signs.bp}</span>}
                        {r.vital_signs.hr && <span style={{fontSize:11,background:'var(--gray-100)',padding:'2px 8px',borderRadius:4}}>HR: {r.vital_signs.hr}</span>}
                        {r.vital_signs.temp && <span style={{fontSize:11,background:'var(--gray-100)',padding:'2px 8px',borderRadius:4}}>Temp: {r.vital_signs.temp}°C</span>}
                        {r.vital_signs.spo2 && <span style={{fontSize:11,background:'var(--gray-100)',padding:'2px 8px',borderRadius:4}}>SpO₂: {r.vital_signs.spo2}%</span>}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {activeTab === 'appointments' && (
              <>
                {appointments.length === 0 ? (
                  <div className="empty-state" style={{padding:32}}>
                    <Calendar size={28} color="var(--gray-300)" />
                    <h3>No appointments</h3>
                  </div>
                ) : appointments.map(a => (
                  <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{new Date(a.appointment_date).toLocaleDateString('en-AU')} at {a.appointment_time?.slice(0,5)}</div>
                      <div style={{fontSize:12,color:'var(--gray-500)'}}>Dr. {a.consultants?.profiles?.full_name || 'Unknown'} · {a.type}</div>
                      {a.reason && <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{a.reason}</div>}
                    </div>
                    <span className={`badge ${a.status === 'completed' ? 'badge-green' : a.status === 'cancelled' ? 'badge-red' : 'badge-blue'}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* EHR Modal */}
      {showEhrModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEhrModal(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Add EHR Record – {patient.first_name} {patient.last_name}</h3>
              <button className="modal-close" onClick={() => setShowEhrModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label>Visit Date</label>
                  <input type="date" value={ehrForm.visit_date} onChange={e => setEhrForm(p=>({...p,visit_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>ICD-10 Code</label>
                  <input placeholder="e.g. J06.9" value={ehrForm.icd_code} onChange={e => setEhrForm(p=>({...p,icd_code:e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label>Chief Complaint</label>
                <input placeholder="Main reason for visit" value={ehrForm.chief_complaint} onChange={e => setEhrForm(p=>({...p,chief_complaint:e.target.value}))} />
              </div>
              <div className="form-group">
                <label>History of Present Illness</label>
                <textarea rows={3} placeholder="Describe history..." value={ehrForm.history_of_present_illness} onChange={e => setEhrForm(p=>({...p,history_of_present_illness:e.target.value}))} />
              </div>

              {/* Vitals */}
              <div style={{background:'var(--primary-50)',borderRadius:8,padding:'14px 16px',marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'var(--primary-700)'}}>🔬 Vital Signs</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[
                    {key:'bp',label:'Blood Pressure',ph:'120/80 mmHg'},
                    {key:'hr',label:'Heart Rate',ph:'72 bpm'},
                    {key:'temp',label:'Temperature',ph:'36.8°C'},
                    {key:'spo2',label:'SpO₂',ph:'98%'},
                    {key:'weight',label:'Weight',ph:'70 kg'},
                    {key:'height',label:'Height',ph:'175 cm'},
                  ].map(v => (
                    <div key={v.key}>
                      <label style={{fontSize:11}}>{v.label}</label>
                      <input placeholder={v.ph} value={ehrForm.vital_signs[v.key]} onChange={e => setEhrForm(p=>({...p,vital_signs:{...p.vital_signs,[v.key]:e.target.value}}))} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Diagnosis</label>
                <input placeholder="Clinical diagnosis" value={ehrForm.diagnosis} onChange={e => setEhrForm(p=>({...p,diagnosis:e.target.value}))} />
              </div>
              <div className="form-group">
                <label>Treatment Plan</label>
                <textarea rows={3} placeholder="Prescriptions, procedures, referrals..." value={ehrForm.treatment_plan} onChange={e => setEhrForm(p=>({...p,treatment_plan:e.target.value}))} />
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label>Follow-up Date</label>
                  <input type="date" value={ehrForm.follow_up_date} onChange={e => setEhrForm(p=>({...p,follow_up_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Additional Notes</label>
                  <input placeholder="Any other notes" value={ehrForm.notes} onChange={e => setEhrForm(p=>({...p,notes:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEhrModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEhr} disabled={savingEhr}>
                {savingEhr ? 'Saving...' : 'Save EHR Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
