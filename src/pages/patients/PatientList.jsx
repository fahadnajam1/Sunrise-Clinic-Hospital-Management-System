import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Plus, Eye, Edit, Filter, Download, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PAGE_SIZE = 15;

export default function PatientList({ ehrMode = false }) {
  const navigate = useNavigate();
  const { logAudit } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('patients')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,mrn.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      if (genderFilter) query = query.eq('gender', genderFilter);

      const { data, count, error } = await query;
      if (error) throw error;
      setPatients(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast.error('Could not load patients');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, genderFilter, page]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sunrise Medical Clinic – Patient List', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.autoTable({
      startY: 36,
      head: [['MRN', 'Name', 'DOB', 'Gender', 'Phone', 'Medicare']],
      body: patients.map(p => [
        p.mrn, `${p.first_name} ${p.last_name}`,
        p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '-',
        p.gender || '-', p.phone || '-', p.medicare_number || '-',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save('patient_list.pdf');
    toast.success('PDF exported!');
    logAudit('EXPORT', 'patients', null, 'Exported patient list PDF');
  };

  const getAge = (dob) => {
    if (!dob) return '-';
    const years = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} yrs`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{ehrMode ? 'Electronic Health Records' : 'Patient Management'}</h1>
          <p>{total.toLocaleString()} {ehrMode ? 'records' : 'patients'} registered</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExportPDF}>
            <Download size={15} /> Export PDF
          </button>
          {!ehrMode && (
            <button className="btn btn-primary" onClick={() => navigate('/patients/register')}>
              <Plus size={15} /> Register Patient
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div className="filters-bar" style={{margin:0}}>
            <div className="search-bar">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, MRN, or phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <select value={genderFilter} onChange={e => { setGenderFilter(e.target.value); setPage(0); }} className="filter-select">
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <div style={{marginLeft:'auto',fontSize:13,color:'var(--gray-500)'}}>
              Showing {Math.min(page * PAGE_SIZE + 1, total)}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" style={{width:36,height:36}} /></div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={28} /></div>
              <h3>No patients found</h3>
              <p>{search ? 'Try adjusting your search criteria' : 'Start by registering your first patient'}</p>
              {!ehrMode && !search && (
                <button className="btn btn-primary mt-4" onClick={() => navigate('/patients/register')}>
                  <Plus size={15} /> Register First Patient
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>MRN</th>
                  <th>Patient Name</th>
                  <th>Age / DOB</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Insurance</th>
                  <th>Medicare</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span style={{fontFamily:'monospace',fontSize:12,background:'var(--primary-50)',color:'var(--primary-700)',padding:'2px 8px',borderRadius:4,fontWeight:600}}>
                        {p.mrn}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="avatar avatar-sm">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                        <div>
                          <div style={{fontWeight:600,color:'var(--gray-900)'}}>{p.first_name} {p.last_name}</div>
                          <div style={{fontSize:11,color:'var(--gray-500)'}}>{p.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{getAge(p.date_of_birth)}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)'}}>{p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '–'}</div>
                    </td>
                    <td>
                      <span className={`badge ${p.gender === 'male' ? 'badge-blue' : p.gender === 'female' ? 'badge-purple' : 'badge-gray'}`}>
                        {p.gender || 'N/A'}
                      </span>
                    </td>
                    <td style={{fontSize:13}}>{p.phone || '–'}</td>
                    <td style={{fontSize:13}}>{p.insurance_provider || '–'}</td>
                    <td style={{fontSize:13,fontFamily:'monospace'}}>{p.medicare_number || '–'}</td>
                    <td style={{fontSize:12,color:'var(--gray-500)'}}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={() => navigate(`/patients/${p.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => navigate(`/patients/${p.id}`)}>
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:13,color:'var(--gray-500)'}}>Page {page + 1} of {totalPages}</span>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
