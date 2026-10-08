import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Apply.module.css';

import { API_BASE } from '../../Api/apiFetch';

/* ── ICONS ── */
const SendIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const CalendarIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const WhatsAppIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

/* ── DATA ── */
const PERKS = [
  { icon: 'shield',   title: 'Verified & Trusted',   body: 'Work with a professional team that values your credentials.' },
  { icon: 'clock',    title: 'Flexible Hours',        body: 'Set your availability and work on a schedule that suits you.' },
  { icon: 'dollar',   title: 'Competitive Pay',       body: 'Fair compensation for skilled, professional care work.' },
  { icon: 'team',     title: 'Supportive Team',       body: 'Coordination and support from our care management team.' },
];

const PROCESS_STEPS = [
  { title: 'Application reviewed', body: 'We review your details and documents within 2 business days.' },
  { title: 'Screening call',       body: 'A brief call to verify your experience and discuss expectations.' },
  { title: 'Verification',         body: 'We verify your credentials, references, and background.' },
  { title: 'Onboarding',           body: "Once approved, you're onboarded and matched to patients." },
];

const WHO_CAN_APPLY = [
  'Registered Nurses (RN)', 'Community Health Nurses', 'Physiotherapists',
  'Lab & Diagnostic Technicians', 'Postnatal Care Specialists',
  'Elderly Care Assistants', 'Home Health Aides',
];

const SPEC_OPTIONS = [
  { value: 'Post-Discharge Recovery',        label: 'Post-Discharge Recovery' },
  { value: 'Chronic Disease Management',     label: 'Chronic Disease Management' },
  { value: 'Postnatal & Newborn Care',       label: 'Postnatal & Newborn Care' },
  { value: 'Elderly Care',                   label: 'Elderly Care' },
  { value: 'Physiotherapy & Rehabilitation', label: 'Physiotherapy & Rehabilitation' },
  { value: 'Lab & Diagnostic Services',      label: 'Lab & Diagnostic Services' },
  { value: 'Telemedicine Support',           label: 'Telemedicine Support' },
];

const HOURS_OPTIONS = [
  { value: 'Morning (6AM - 12PM)',   label: 'Morning (6AM - 12PM)' },
  { value: 'Afternoon (12PM - 5PM)', label: 'Afternoon (12PM - 5PM)' },
  { value: 'Evening (5PM - 8PM)',    label: 'Evening (5PM - 8PM)' },
  { value: 'Night shifts',           label: 'Night shifts' },
  { value: 'Live-in care',           label: 'Live-in care' },
];

/* ── FILE BOX ── */
function FileBox({ id, label, accept, hint, fileName, onChange }) {
  return (
    <div className={styles.group}>
      <label>{label}</label>
      <div className={styles.fileBox} onClick={() => document.getElementById(id).click()}>
        <input type="file" id={id} accept={accept} onChange={onChange} style={{ display:'none' }} />
        <svg className={styles.fileBoxIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p>Click to upload</p>
        <span>{hint}</span>
        {fileName && <p className={styles.fileName}>{fileName}</p>}
      </div>
    </div>
  );
}

function SectionHead({ num, title }) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionNum}>{num}</div>
      <h3>{title}</h3>
    </div>
  );
}

/* ── MAIN ── */
export default function Apply() {
  const [form, setForm] = useState({
    fullName:'', email:'', phone:'', address:'', gender:'', dob:'',
    caregiverType:'', experience:'', qualification:'', employmentStatus:'',
    professionalSummary:'', specialisations:[],
    ref1Name:'', ref1Relationship:'', ref1Phone:'', ref1Email:'',
    ref2Name:'', ref2Relationship:'', ref2Phone:'', ref2Email:'',
    availabilityType:'', startDate:'', preferredHours:[],
    clinicalCoverage:'', additionalInfo:'',
  });

  const [files,     setFiles]     = useState({ cv:null, cert:null, id:null, license:null });
  const [fileNames, setFileNames] = useState({ cv:'',   cert:'',   id:'',   license:'' });
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors,    setErrors]    = useState({});
  const formRef = useRef(null);

  const set    = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const toggle = (f, v) => setForm(p => ({
    ...p, [f]: p[f].includes(v) ? p[f].filter(x => x !== v) : [...p[f], v]
  }));
  const handleFile = (k) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFiles(f => ({ ...f, [k]: file }));
    setFileNames(n => ({ ...n, [k]: file.name }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName)        e.fullName        = 'Full name is required';
    if (!form.email)           e.email           = 'Email is required';
    if (!form.phone)           e.phone           = 'Phone is required';
    if (!form.address)         e.address         = 'Address is required';
    if (!form.caregiverType)   e.caregiverType   = 'Please select your role';
    if (!form.experience)      e.experience      = 'Please select experience range';
    if (!files.cv)             e.cv              = 'CV / Resume is required';
    if (!form.availabilityType)e.availabilityType= 'Please select availability';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); formRef.current?.scrollIntoView({ behavior:'smooth' }); return; }
    setErrors({});
    setSubmitting(true);

    const fd = new FormData();
    fd.append('fullName',             form.fullName);
    fd.append('email',                form.email.trim().toLowerCase());
    fd.append('phoneNumber',          form.phone);
    fd.append('serviceProviderType',  form.caregiverType);
    fd.append('address',              form.address);
    fd.append('gender',               form.gender);
    fd.append('yearsOfExperience',    form.experience);
    fd.append('qualification',        form.qualification);
    fd.append('employmentStatus',     form.employmentStatus);
    fd.append('specialisations',      form.specialisations.join(', ') || 'None selected');
    fd.append('professionalSummary',  form.professionalSummary);
    if (files.cv)      fd.append('cv',          files.cv);
    if (files.cert)    fd.append('certificate', files.cert);
    if (files.id)      fd.append('governmentId',files.id);
    if (files.license) fd.append('license',     files.license);
    fd.append('ref1FullName',    form.ref1Name         || 'Not provided');
    fd.append('ref1Relationship',form.ref1Relationship || 'Not provided');
    fd.append('ref1Phone',       form.ref1Phone        || 'Not provided');
    fd.append('ref1Email',       form.ref1Email        || 'Not provided');
    fd.append('ref2FullName',    form.ref2Name         || 'Not provided');
    fd.append('ref2Relationship',form.ref2Relationship || 'Not provided');
    fd.append('ref2Phone',       form.ref2Phone        || 'Not provided');
    fd.append('ref2Email',       form.ref2Email        || 'Not provided');
    fd.append('availabilityType',form.availabilityType);
    fd.append('preferredHours',  form.preferredHours.join(', ') || 'None selected');
    fd.append('locationArea',    form.clinicalCoverage || 'Not specified');
    fd.append('startDate',       form.startDate        || 'Not specified');
    fd.append('additionalInfo',  form.additionalInfo   || 'None');

    try {
      const res  = await fetch(`${API_BASE}/auth/provider/apply`, { method:'POST', body:fd });
      let data = {};
      try { data = await res.json(); } catch {
        if (!res.ok) { setErrors({ general: `Server error (${res.status}). Please try again.` }); return; }
      }

      if (!res.ok) {
        const fieldErrors = data.errors || data.validationErrors;
        if (fieldErrors && typeof fieldErrors === 'object') {
          const mapped = {};
          const map = { email:'email', phoneNumber:'phone', serviceProviderType:'caregiverType', yearsOfExperience:'experience', locationArea:'clinicalCoverage' };
          Object.entries(fieldErrors).forEach(([k,v]) => { mapped[map[k]||k] = v; });
          setErrors(mapped);
        } else {
          setErrors({ general: data.message || 'Submission failed. Please try again.' });
        }
        return;
      }

      setSubmitted(true);
      window.scrollTo({ top:0, behavior:'smooth' });
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const err = (f) => errors[f] ? <span className={styles.errText}>{errors[f]}</span> : null;

  /* ── SUCCESS ── */
  if (submitted) {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2>Application Submitted!</h2>
          <p>Thank you for applying to join the DiGi Health care team. We'll review your application and get back to you within <strong>2 business days</strong>.</p>
          <p style={{ marginTop:8 }}>Check your email for a confirmation message.</p>
          <Link to="/" className={styles.btnBack}>Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <p className={styles.pageLabel}>Service Provider Application</p>
          <h1>Join the DiGi Health care team.</h1>
          <p>We work with qualified nurses, physiotherapists, lab technicians, postnatal specialists, and elderly care professionals. If you're committed to delivering professional home healthcare, we want to hear from you.</p>
        </div>
        <div className={styles.headerRight}>
          {PERKS.map(p => (
            <div key={p.title} className={styles.perkCard}>
              <div className={styles.perkIcon}>
                {p.icon === 'shield' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                {p.icon === 'clock'  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                {p.icon === 'dollar' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                {p.icon === 'team'   && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              </div>
              <h4>{p.title}</h4>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WRAPPER */}
      <div className={styles.wrapper} ref={formRef}>

        {/* FORM */}
        <div className={styles.form}>
          {errors.general && <div className={styles.errBanner}>{errors.general}</div>}

          {/* 1 — Personal */}
          <SectionHead num="1" title="Personal Details" />
          <div className={styles.body}>
            <div className={styles.row}>
              <div className={styles.group}><label>Full Name <span className={styles.req}>*</span></label><input type="text" value={form.fullName} onChange={set('fullName')} placeholder="Your full name" className={errors.fullName ? styles.inputErr : ''}/>{err('fullName')}</div>
              <div className={styles.group}><label>Email Address <span className={styles.req}>*</span></label><input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" className={errors.email ? styles.inputErr : ''}/>{err('email')}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}><label>Phone Number <span className={styles.req}>*</span></label><input type="tel" value={form.phone} onChange={set('phone')} placeholder="+234 XXX XXX XXXX" className={errors.phone ? styles.inputErr : ''}/>{err('phone')}</div>
              <div className={styles.group}><label>Address <span className={styles.req}>*</span></label><input type="text" value={form.address} onChange={set('address')} placeholder="Your residential address" className={errors.address ? styles.inputErr : ''}/>{err('address')}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}><label>Gender</label><select value={form.gender} onChange={set('gender')}><option value="" disabled>Select gender</option><option>Male</option><option>Female</option><option>Prefer not to say</option></select></div>
              <div className={styles.group}><label>Date of Birth</label><input type="date" value={form.dob} onChange={set('dob')}/></div>
            </div>
          </div>

          <div className={styles.divider}/>

          {/* 2 — Professional */}
          <SectionHead num="2" title="Professional Details" />
          <div className={styles.body}>
            <div className={styles.row}>
              <div className={styles.group}><label>Service Type <span className={styles.req}>*</span></label><select value={form.caregiverType} onChange={set('caregiverType')} className={errors.caregiverType ? styles.inputErr : ''}><option value="" disabled>Select your role</option><option>Registered Nurse (RN)</option><option>Community Health Nurse</option><option>Physiotherapist</option><option>Lab Technician</option><option>Postnatal Care Specialist</option><option>Elderly Care Assistant</option><option>Home Health Aide</option><option>Other</option></select>{err('caregiverType')}</div>
              <div className={styles.group}><label>Years of Experience <span className={styles.req}>*</span></label><select value={form.experience} onChange={set('experience')} className={errors.experience ? styles.inputErr : ''}><option value="" disabled>Select range</option><option>Less than 1 year</option><option>1 – 2 years</option><option>3 – 5 years</option><option>6 – 10 years</option><option>More than 10 years</option></select>{err('experience')}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}><label>Highest Qualification</label><select value={form.qualification} onChange={set('qualification')}><option value="" disabled>Select qualification</option><option>Certificate</option><option>Diploma</option><option>Bachelor's Degree</option><option>Master's Degree</option><option>PhD / Doctorate</option><option>Other</option></select></div>
              <div className={styles.group}><label>Current Employment Status</label><select value={form.employmentStatus} onChange={set('employmentStatus')}><option value="" disabled>Select status</option><option>Employed full-time</option><option>Employed part-time</option><option>Freelance / Self-employed</option><option>Unemployed</option></select></div>
            </div>
            <div className={`${styles.row} ${styles.single}`}>
              <div className={styles.group}>
                <label>Areas of Specialisation</label>
                <div className={styles.checkGroup}>
                  {SPEC_OPTIONS.map(o => (
                    <label key={o.value} className={styles.checkItem}>
                      <input type="checkbox" checked={form.specialisations.includes(o.value)} onChange={() => toggle('specialisations', o.value)}/>
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className={`${styles.row} ${styles.single}`}>
              <div className={styles.group}><label>Brief Professional Summary</label><textarea value={form.professionalSummary} onChange={set('professionalSummary')} placeholder="Briefly describe your experience, skills, and what you bring to home healthcare..."/></div>
            </div>
          </div>

          <div className={styles.divider}/>

          {/* 3 — Documents */}
          <SectionHead num="3" title="Documents" />
          <div className={styles.body}>
            <div className={styles.row}>
              <FileBox id="cv_file" label={<>CV / Resume <span className={styles.req}>*</span></>} accept=".pdf,.doc,.docx" hint="PDF, DOC up to 5MB" fileName={fileNames.cv} onChange={handleFile('cv')}/>
              <FileBox id="cert_file" label="Professional Certificate(s)" accept=".pdf,.jpg,.jpeg,.png" hint="PDF, JPG, PNG up to 5MB" fileName={fileNames.cert} onChange={handleFile('cert')}/>
            </div>
            {err('cv')}
            <div className={styles.row}>
              <FileBox id="id_file" label="Government-issued ID" accept=".pdf,.jpg,.jpeg,.png" hint="PDF, JPG, PNG up to 5MB" fileName={fileNames.id} onChange={handleFile('id')}/>
              <FileBox id="license_file" label="Professional License (if applicable)" accept=".pdf,.jpg,.jpeg,.png" hint="PDF, JPG, PNG up to 5MB" fileName={fileNames.license} onChange={handleFile('license')}/>
            </div>
          </div>

          <div className={styles.divider}/>

          {/* 4 — References */}
          <SectionHead num="4" title="References" />
          <div className={styles.body}>
            <p className={styles.refNote}>Please provide at least one professional reference — a former employer, supervisor, or colleague who can speak to your work.</p>
            <div className={styles.row}>
              <div className={styles.group}><label>Reference 1 — Full Name</label><input type="text" value={form.ref1Name} onChange={set('ref1Name')} placeholder="Reference name"/></div>
              <div className={styles.group}><label>Reference 1 — Relationship</label><input type="text" value={form.ref1Relationship} onChange={set('ref1Relationship')} placeholder="e.g. Former supervisor"/></div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}><label>Reference 1 — Phone</label><input type="tel" value={form.ref1Phone} onChange={set('ref1Phone')} placeholder="+234 XXX XXX XXXX"/></div>
              <div className={styles.group}><label>Reference 1 — Email</label><input type="email" value={form.ref1Email} onChange={set('ref1Email')} placeholder="reference@email.com"/></div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}><label>Reference 2 — Full Name</label><input type="text" value={form.ref2Name} onChange={set('ref2Name')} placeholder="Reference name"/></div>
              <div className={styles.group}><label>Reference 2 — Relationship</label><input type="text" value={form.ref2Relationship} onChange={set('ref2Relationship')} placeholder="e.g. Former colleague"/></div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}><label>Reference 2 — Phone</label><input type="tel" value={form.ref2Phone} onChange={set('ref2Phone')} placeholder="+234 XXX XXX XXXX"/></div>
              <div className={styles.group}><label>Reference 2 — Email</label><input type="email" value={form.ref2Email} onChange={set('ref2Email')} placeholder="reference@email.com"/></div>
            </div>
          </div>

          <div className={styles.divider}/>

          {/* 5 — Availability */}
          <SectionHead num="5" title="Availability" />
          <div className={styles.body}>
            <div className={styles.row}>
              <div className={styles.group}><label>Availability Type <span className={styles.req}>*</span></label><select value={form.availabilityType} onChange={set('availabilityType')} className={errors.availabilityType ? styles.inputErr : ''}><option value="" disabled>Select availability</option><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="WEEKENDS_ONLY">Weekends only</option><option value="ON_CALL">On-call / as needed</option><option value="FLEXIBLE">Flexible</option></select>{err('availabilityType')}</div>
              <div className={styles.group}><label>Earliest Start Date</label><input type="date" value={form.startDate} onChange={set('startDate')}/></div>
            </div>
            <div className={`${styles.row} ${styles.single}`}>
              <div className={styles.group}>
                <label>Preferred Working Hours</label>
                <div className={styles.checkGroup}>
                  {HOURS_OPTIONS.map(o => (
                    <label key={o.value} className={styles.checkItem}>
                      <input type="checkbox" checked={form.preferredHours.includes(o.value)} onChange={() => toggle('preferredHours', o.value)}/>
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className={`${styles.row} ${styles.single}`}>
              <div className={styles.group}>
                <label>Coverage Areas</label>
                <select value={form.clinicalCoverage} onChange={set('clinicalCoverage')}>
                  <option value="">Select area</option>
                  <optgroup label="ABUJA">
                    <option value="ABUJA_MUNICIPAL">Abuja Municipal</option>
                    <option value="ABAJI">Abaji</option>
                    <option value="BWARI">Bwari</option>
                    <option value="GWAGWALADA">Gwagwalada</option>
                    <option value="KUJE">Kuje</option>
                    <option value="KWALI">Kwali</option>
                  </optgroup>
                  <optgroup label="LAGOS">
                    <option value="AGEGE">Agege</option>
                    <option value="AJEROMI_IFELODUN">Ajeromi-Ifelodun</option>
                    <option value="ALIMOSHO">Alimosho</option>
                    <option value="AMUWO_OTUN">Amuwo-Otun</option>
                    <option value="APAPA">Apapa</option>
                    <option value="BADAGRY">Badagry</option>
                    <option value="EPE">Epe</option>
                    <option value="ETI_OSA">Eti-Osa</option>
                    <option value="IBEJU_LEKKI">Ibeju-Lekki</option>
                    <option value="IFAKO_IJAIYE">Ifako-Ijaiye</option>
                    <option value="IKEJA">Ikeja</option>
                    <option value="IKORODU">Ikorodu</option>
                    <option value="KOSOFE">Kosofe</option>
                    <option value="LAGOS_ISLAND">Lagos Island</option>
                    <option value="LAGOS_MAINLAND">Lagos Mainland</option>
                    <option value="MUSHIN">Mushin</option>
                    <option value="OJO">Ojo</option>
                    <option value="OSHODI_ISOLO">Oshodi-Isolo</option>
                    <option value="SHOMOLU">Shomolu</option>
                    <option value="SURULERE">Surulere</option>
                  </optgroup>
                </select>
              </div>
            </div>
            <div className={`${styles.row} ${styles.single}`}>
              <div className={styles.group}><label>Anything else you'd like us to know?</label><textarea value={form.additionalInfo} onChange={set('additionalInfo')} placeholder="Optional — any additional information..."/></div>
            </div>
          </div>

          {/* SUBMIT */}
          <div className={styles.submitArea}>
            <button className={styles.btnSubmit} onClick={handleSubmit} disabled={submitting}>
              <SendIcon/>{submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            <span className={styles.submitNote}>We review all applications within 2 business days.</span>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h4>What happens next</h4>
            {PROCESS_STEPS.map((s, i) => (
              <div key={s.title} className={styles.processStep}>
                <div className={styles.stepDot}>{i + 1}</div>
                <div><h5>{s.title}</h5><p>{s.body}</p></div>
              </div>
            ))}
          </div>
          <div className={styles.sidebarCard}>
            <h4>Who can apply</h4>
            <ul className={styles.whoList}>{WHO_CAN_APPLY.map(r => <li key={r}>{r}</li>)}</ul>
          </div>
          <div className={styles.sidebarContact}>
            <h4>Questions about applying?</h4>
            <p>WhatsApp us directly and a team member will guide you through the process.</p>
            <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.sidebarWa}>
              <WhatsAppIcon/> WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLabel}>Looking for Care Instead?</p>
        <h2>Book professional home healthcare today.</h2>
        <p>If you're a patient or family member looking for care, visit our contact page to book a nurse or speak to a care coordinator.</p>
        <div className={styles.ctaBtns}>
          <Link to="/contact" className={styles.btnOutlineNavy}><CalendarIcon/> Book Care</Link>
          <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.btnGreenCta}><WhatsAppIcon/> WhatsApp Us</a>
        </div>
      </section>
    </>
  );
}