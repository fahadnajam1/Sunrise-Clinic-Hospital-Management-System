import React, { useState } from 'react';
import { Shield, Download, ChevronDown, ChevronRight, Lock, Eye, FileText, Globe, Server, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const POLICY_SECTIONS = [
  {
    id: 'overview',
    icon: '🏛️',
    title: '1. Policy Overview & Governance',
    content: `Sunrise Medical Clinic ("the Clinic") is committed to protecting the confidentiality, integrity, and availability (CIA) of all electronic Protected Health Information (ePHI) and organizational data.

This Cybersecurity Policy establishes the framework for managing information security risks in accordance with:
• The Privacy Act 1988 (Cth) and Australian Privacy Principles (APPs)
• Health Records Act 2001 (Vic)
• My Health Records Act 2012 (Cth)
• HIPAA Security Rule (as adopted practice)
• ISO/IEC 27001:2013 Information Security Management Standard
• NIST Cybersecurity Framework v1.1
• Essential Eight Maturity Model (ACSC)

POLICY OWNER: Chief Information Security Officer (CISO)
REVIEW CYCLE: Annual (or following significant incident)
EFFECTIVE DATE: April 2025
VERSION: 3.2`,
    subsections: [
      { title: '1.1 Scope', content: 'Applies to all staff, contractors, vendors, and systems that process, store, or transmit patient data or Clinic information.' },
      { title: '1.2 Policy Objectives', content: 'Protect patient privacy; ensure regulatory compliance; prevent unauthorized access; maintain business continuity; enable rapid incident response.' },
    ]
  },
  {
    id: 'access',
    icon: '🔐',
    title: '2. Access Control & Identity Management',
    content: `All system access is governed by the principle of least privilege and need-to-know basis. Role-Based Access Control (RBAC) is enforced across all clinical information systems.`,
    subsections: [
      { title: '2.1 Authentication Requirements', content: 'Multi-Factor Authentication (MFA) is mandatory for all administrative accounts and remote access. Passwords must be ≥14 characters, include uppercase, lowercase, numbers, and special characters. Passwords expire every 90 days. Account lockout triggers after 5 failed attempts.' },
      { title: '2.2 Role Definitions', content: 'Administrator: Full system access, requires dual approval for privilege changes.\nClinician: Read/write access to clinical records of assigned patients.\nNursing Staff: Read access to clinical records, write access to vitals and nursing notes.\nReception: Access to scheduling, registration, and billing only.\nAudit: Read-only access to audit logs and reports.\nBilling: Access to financial records only.' },
      { title: '2.3 Privileged Access Management', content: 'All administrative actions are logged. Privileged accounts are separate from standard accounts. Just-In-Time (JIT) access is used for elevated privileges. Quarterly access reviews are conducted by department heads.' },
    ]
  },
  {
    id: 'data',
    icon: '🗄️',
    title: '3. Data Protection & Encryption',
    content: `All data containing ePHI must be protected using industry-standard encryption methods both in transit and at rest.`,
    subsections: [
      { title: '3.1 Encryption Standards', content: 'Data at Rest: AES-256-GCM encryption for all databases and file storage.\nData in Transit: TLS 1.2 minimum, TLS 1.3 preferred for all API communications.\nKey Management: AWS KMS or equivalent FIPS 140-2 validated HSM.\nDatabase: Supabase Row-Level Security (RLS) enforced on all patient tables.' },
      { title: '3.2 Data Classification', content: 'Level 1 – Confidential (ePHI): Patient medical records, diagnoses, treatments, prescriptions. Maximum protection required.\nLevel 2 – Internal: Staff records, financial data, operational documents. Standard protection.\nLevel 3 – Public: Marketing materials, public announcements. Minimal controls.' },
      { title: '3.3 Data Retention', content: 'Patient records: 7 years after last contact (10 years for minors).\nAudit logs: 6 years minimum.\nBackup retention: 30 days for daily, 12 months for monthly backups.\nSecure deletion: NIST 800-88 compliant media sanitization.' },
    ]
  },
  {
    id: 'network',
    icon: '🌐',
    title: '4. Network Security',
    content: `The Clinic maintains a layered network architecture with multiple security zones to segregate clinical, administrative, and guest traffic.`,
    subsections: [
      { title: '4.1 Network Architecture', content: 'DMZ Zone: Public-facing web services and APIs with WAF protection.\nClinical Zone: EMR systems, medical devices (strict access control).\nAdmin Zone: HR, finance, management systems.\nGuest Zone: Isolated WiFi for patients and visitors.\nIoT Zone: Medical devices and sensors on isolated VLAN.' },
      { title: '4.2 Firewall & Perimeter Security', content: 'Next-Generation Firewall (NGFW) with IPS/IDS signatures.\nApplication-layer filtering for all outbound traffic.\nDNS filtering to block known malicious domains.\nGeo-blocking of high-risk countries.\nDDoS protection via upstream ISP and cloud CDN.' },
      { title: '4.3 Monitoring & Detection', content: 'Security Information and Event Management (SIEM) system monitors all network traffic.\n24/7 Security Operations Centre (SOC) capability.\nIntrusion Detection System (IDS) on all clinical network segments.\nUser and Entity Behavior Analytics (UEBA) for insider threat detection.' },
    ]
  },
  {
    id: 'incident',
    icon: '🚨',
    title: '5. Incident Response',
    content: `The Clinic maintains a documented Incident Response Plan (IRP) aligned with NIST SP 800-61 and the ACSC Cyber Incident Response Plan.`,
    subsections: [
      { title: '5.1 Incident Classification', content: 'P1 – Critical: Active breach of ePHI, ransomware, system outage (respond within 1 hour).\nP2 – High: Suspected unauthorized access, malware detection (respond within 4 hours).\nP3 – Medium: Policy violations, failed intrusions, phishing attempts (respond within 24 hours).\nP4 – Low: Minor security events, awareness issues (respond within 72 hours).' },
      { title: '5.2 Response Phases', content: '1. PREPARE – Maintain runbooks, train responders, test procedures quarterly.\n2. IDENTIFY – Detect and analyze the incident scope.\n3. CONTAIN – Isolate affected systems to prevent spread.\n4. ERADICATE – Remove malicious artifacts and vulnerabilities.\n5. RECOVER – Restore systems from clean backups.\n6. LESSONS LEARNED – Post-incident review within 72 hours.' },
      { title: '5.3 Breach Notification', content: 'Notify OAIC within 30 days of an eligible data breach (per NDB Scheme).\nNotify affected patients where reasonable likelihood of serious harm.\nNotify health information custodians (e.g., My Health Record System Operator).\nDirect patient notification within 30 days via letter for P1 breaches.' },
    ]
  },
  {
    id: 'training',
    icon: '📚',
    title: '6. Security Awareness & Training',
    content: `All staff must complete mandatory security awareness training to reduce human risk factors.`,
    subsections: [
      { title: '6.1 Mandatory Training', content: 'Annual security awareness training for all staff (4 hours minimum).\nPhishing simulation exercises quarterly.\nHIPAA privacy training on induction and annually.\nPrivileged user training: additional 8-hour technical training.\nIncident response tabletop exercises biannually.' },
      { title: '6.2 Training Topics', content: 'Phishing and social engineering recognition.\nPassword hygiene and MFA setup.\nSafe use of email and USB devices.\nPatient privacy and data handling.\nBYOD and remote work security.\nReporting security incidents.\nPhysical security (tailgating, clean desk policy).' },
    ]
  },
  {
    id: 'vendor',
    icon: '🤝',
    title: '7. Third-Party & Vendor Management',
    content: `All vendors with access to Clinic systems or data must meet the Clinic's security standards.`,
    subsections: [
      { title: '7.1 Vendor Assessment', content: 'Security questionnaire required before onboarding.\nAnnual security assessments for critical vendors.\nSOC 2 Type II or ISO 27001 certification preferred.\nPenetration testing results reviewed for high-risk vendors.' },
      { title: '7.2 Contractual Requirements', content: 'Data Processing Agreements (DPA) required for all vendors handling ePHI.\nRight to audit clauses in all vendor contracts.\nBreach notification within 24 hours of discovery.\nData return/deletion upon contract termination.' },
    ]
  },
  {
    id: 'physical',
    icon: '🏢',
    title: '8. Physical Security',
    content: `Physical security controls protect against unauthorized physical access to systems and data.`,
    subsections: [
      { title: '8.1 Access Controls', content: 'Badge access required for all secure areas (server rooms, medication storage, records).\nVisitor management system with mandatory sign-in/out.\nCCTV monitoring of all entry points and server areas (90-day retention).\nClean desk policy enforced across all workstations.' },
      { title: '8.2 Device Security', content: 'All laptops and workstations have full-disk encryption enabled.\nUSB ports restricted/disabled on clinical workstations.\nAutomatic screen lock after 5 minutes of inactivity.\nMobile Device Management (MDM) for all Clinic-owned devices.\nPrinter access logging and secure print release.' },
    ]
  },
  {
    id: 'compliance',
    icon: '✅',
    title: '9. Compliance & Audit',
    content: `Regular audits ensure ongoing compliance with regulatory requirements and internal policies.`,
    subsections: [
      { title: '9.1 Audit Schedule', content: 'Monthly: Access control reviews, privilege audit.\nQuarterly: Vulnerability assessments, patch compliance.\nAnnual: Penetration testing, full security audit, policy review.\nAs-needed: Post-incident reviews, regulatory inquiries.' },
      { title: '9.2 Regulatory Compliance Checklist', content: '☑ Privacy Act 1988 – APPs 1-13 compliance verified\n☑ Health Records Act 2001 – HPP compliance\n☑ HIPAA Security Rule – Administrative, Physical, Technical safeguards\n☑ PCIDSS v4.0 – Payment processing security\n☑ Essential Eight – Maturity level 2 implemented\n☑ ISO 27001 – Aligned (certification in progress)' },
    ]
  }
];

export default function CybersecurityPolicy() {
  const [openSections, setOpenSections] = useState({ overview: true });

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {};
    POLICY_SECTIONS.forEach(s => { all[s.id] = true; });
    setOpenSections(all);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Cover Page
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text('CYBERSECURITY', pageW/2, 80, {align:'center'});
    doc.text('POLICY', pageW/2, 96, {align:'center'});
    doc.setFontSize(14);
    doc.text('Sunrise Medical Clinic', pageW/2, 118, {align:'center'});
    doc.setFontSize(11);
    doc.text('HIPAA & Australian Privacy Law Compliant', pageW/2, 130, {align:'center'});
    doc.setFontSize(10);
    doc.text('Version 3.2 | April 2025 | Classification: CONFIDENTIAL', pageW/2, 160, {align:'center'});
    doc.setFontSize(9);
    doc.text('This document contains sensitive security information and is intended', pageW/2, 200, {align:'center'});
    doc.text('for authorized personnel only. Unauthorized distribution is prohibited.', pageW/2, 207, {align:'center'});

    POLICY_SECTIONS.forEach((section, i) => {
      doc.addPage();
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(section.title, 14, 16);
      doc.setTextColor(0);

      let y = 36;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(section.content, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 8;

      (section.subsections || []).forEach(sub => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(sub.title, 14, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const subLines = doc.splitTextToSize(sub.content, pageW - 28);
        doc.text(subLines, 14, y);
        y += subLines.length * 4.5 + 8;
      });
    });

    doc.save('Sunrise_Cybersecurity_Policy_v3.2.pdf');
  };

  return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Cybersecurity Policy</h1>
          <p>Version 3.2 · April 2025 · HIPAA & Australian Privacy Law Compliant</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={expandAll}>Expand All</button>
          <button className="btn btn-primary" onClick={exportPDF}><Download size={15}/> Export PDF</button>
        </div>
      </div>

      {/* Policy Banner */}
      <div style={{background:'linear-gradient(135deg, var(--primary-600), var(--primary-800))',borderRadius:14,padding:'24px 28px',marginBottom:24,color:'white',display:'flex',gap:20,alignItems:'center'}}>
        <Shield size={52} strokeWidth={1.5} style={{flexShrink:0,opacity:0.9}} />
        <div>
          <h2 style={{fontSize:18,fontWeight:800,marginBottom:6}}>Information Security & HIPAA Compliance Framework</h2>
          <p style={{fontSize:13,opacity:0.85,margin:0}}>
            This policy governs all aspects of information security at Sunrise Medical Clinic. All staff, contractors, and vendors must read, understand, and comply with this policy. Non-compliance may result in disciplinary action, termination, or legal prosecution.
          </p>
          <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
            {['Privacy Act 1988','HIPAA Compliant','ISO 27001 Aligned','Essential Eight L2','NIST CSF'].map(b=>(
              <span key={b} style={{fontSize:11,fontWeight:700,background:'rgba(255,255,255,0.2)',padding:'4px 10px',borderRadius:20,backdropFilter:'blur(4px)'}}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><div className="card-title">📋 Table of Contents</div></div>
        <div className="card-body" style={{columns:2,columnGap:24}}>
          {POLICY_SECTIONS.map(s => (
            <div key={s.id} style={{breakInside:'avoid',padding:'4px 0',display:'flex',alignItems:'center',gap:8,fontSize:13}}>
              <span>{s.icon}</span>
              <span style={{color:'var(--primary-600)',fontWeight:600}}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {POLICY_SECTIONS.map(section => (
        <div key={section.id} className="card" style={{marginBottom:12,overflow:'hidden'}}>
          <button
            onClick={() => toggleSection(section.id)}
            style={{width:'100%',background:'none',border:'none',cursor:'pointer',padding:'16px 20px',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}
          >
            <span style={{fontSize:20}}>{section.icon}</span>
            <h3 style={{flex:1,fontSize:15,fontWeight:700,color:'var(--gray-900)',margin:0}}>{section.title}</h3>
            {openSections[section.id] ? <ChevronDown size={18} color="var(--gray-400)"/> : <ChevronRight size={18} color="var(--gray-400)"/>}
          </button>

          {openSections[section.id] && (
            <div style={{borderTop:'1px solid var(--gray-100)',padding:'0 20px 20px'}}>
              <p style={{color:'var(--gray-700)',fontSize:13,lineHeight:1.8,marginTop:16,marginBottom:0,whiteSpace:'pre-line'}}>{section.content}</p>

              {section.subsections?.map(sub => (
                <div key={sub.title} style={{marginTop:16,background:'var(--gray-50)',borderRadius:8,padding:'14px 16px',borderLeft:'3px solid var(--primary-400)'}}>
                  <h4 style={{fontSize:13,fontWeight:700,color:'var(--primary-700)',marginBottom:6}}>{sub.title}</h4>
                  <p style={{fontSize:12,color:'var(--gray-700)',lineHeight:1.8,margin:0,whiteSpace:'pre-line'}}>{sub.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Acknowledgment Footer */}
      <div className="card" style={{background:'var(--primary-50)',border:'1px solid rgba(30,64,175,0.15)'}}>
        <div className="card-body" style={{textAlign:'center',padding:'28px'}}>
          <Shield size={32} color="var(--primary-600)" style={{marginBottom:12}} />
          <h3 style={{fontWeight:700,color:'var(--primary-700)',marginBottom:8}}>Policy Acknowledgment Required</h3>
          <p style={{fontSize:13,color:'var(--gray-600)',maxWidth:520,margin:'0 auto'}}>
            All staff must sign the Policy Acknowledgment Form (PAF-2025) confirming they have read and understood this Cybersecurity Policy. This acknowledgment is retained in the employee HR file.
          </p>
          <div style={{display:'flex',justifyContent:'center',gap:12,marginTop:16}}>
            <button className="btn btn-primary" onClick={exportPDF}><Download size={15}/> Download Full Policy PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
