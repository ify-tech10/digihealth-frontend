import { useState } from 'react';
import styles from './Hmo.module.css';

import { API_BASE } from '../../Api/apiFetch';

const BENEFITS = [
  {
    title: 'Quality Home Care',
    body: 'Empower your workforce with the convenience of professional medical attention at their doorstep. Our network of certified healthcare specialists provides high-quality clinical care, reducing the need for stressful commutes and long waiting times.',
  },
  {
    title: 'Improved Productivity',
    body: 'Proactive health management minimizes absenteeism and prevents burnout. By investing in accessible care, you ensure your team remains energized, focused, and present — turning wellness into a competitive advantage.',
  },
  {
    title: 'Access to Verified Hospitals & Clinics Nationwide',
    body: 'Wherever your team operates, we have them covered. Gain peace of mind with instant access to a premium, nationwide network of vetted hospitals and clinics, ensuring consistent, high-standard medical care regardless of location.',
  },
  {
    title: 'Flexible Plans',
    body: "Healthcare isn't one-size-fits-all. We offer highly customizable plans designed to align with your company's specific size, budget, and cultural needs, providing the right level of protection as your organization grows.",
  },
];

const STEPS = [
  'Submit your company details',
  'Our team reviews and contacts you',
  'Get a customized healthcare plan',
  'Start providing care to your employees',
];

const INITIAL = {
  companyName: '', companySize: '', email: '',
  phoneNumber: '', companyAddress: '', industry: '',
  hrContactName: '', startDate: '',
};

export default function HMO() {
  const [form,       setForm]       = useState(INITIAL);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.companyName)    e.companyName    = 'Company name is required';
    if (!form.companySize)    e.companySize    = 'Please select company size';
    if (!form.email)          e.email          = 'Email is required';
    if (!form.phoneNumber)    e.phoneNumber    = 'Phone number is required';
    if (!form.companyAddress) e.companyAddress = 'Company address is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    const payload = {
      companyName:    form.companyName,
      companySize:    form.companySize,
      email:          form.email.trim().toLowerCase(),
      phoneNumber:    form.phoneNumber,
      companyAddress: form.companyAddress,
      hrContactName:  form.hrContactName.trim(),
      industry:       form.industry,
      startDate:      form.startDate,
    };

    try {
      const res  = await fetch(`${API_BASE}/hmo/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = {};
      try { data = await res.json(); } catch {
        setErrors({ general: `Server error (${res.status}). Please try again.` });
        return;
      }

      if (!res.ok) {
        const fieldErrors = data.errors || data.validationErrors;
        if (fieldErrors && typeof fieldErrors === 'object') {
          const fieldMap = {
            companyName:    'companyName',
            companySize:    'companySize',
            email:          'email',
            phoneNumber:    'phoneNumber',
            companyAddress: 'companyAddress',
            hrContactName:  'hrContactName',
            industry:       'industry',
          };
          const mapped = {};
          Object.entries(fieldErrors).forEach(([k, v]) => {
            mapped[fieldMap[k] || k] = v;
          });
          setErrors(mapped);
        } else {
          setErrors({ general: data.message || 'Submission failed. Please try again.' });
        }
        return;
      }

      if (data.applicationStatus === 'PENDING' && data.enabled === false) {
        setErrors({ general: 'An application for this company is already under review.' });
        return;
      }

      setSubmitted(true);
      setForm(INITIAL);
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const err = (f) => errors[f]
    ? <span className={styles.errText}>{errors[f]}</span>
    : null;

  return (
    <>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>HMO Partnership</span>
          <h1>Partner With Us for Better Employee Healthcare</h1>
          <p>
            Join our HMO network and equip your organization with dependable, end-to-end home
            healthcare services for your employees. From preventive care to post-illness recovery,
            we help your organization lower healthcare disruptions, optimize employee wellbeing,
            and drive sustained productivity across your workforce.
          </p>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionLabel}>Why Join Our HMO?</p>
          <h2>Real benefits for your organization.</h2>
          <div className={styles.benefits}>
            {BENEFITS.map(b => (
              <div key={b.title} className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <h4>{b.title}</h4>
                  <p>{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionLabel}>How It Works</p>
          <h2>Get started in four simple steps.</h2>
          <div className={styles.steps}>
            {STEPS.map((step, i) => (
              <div key={step} className={styles.step}>
                <div className={styles.stepNum}>{i + 1}</div>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM ── */}
      <section className={styles.formSection}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <p className={styles.sectionLabel}>Get Started</p>
            <h2>Submit your company details.</h2>
            <p className={styles.formDesc}>Fill in the form below and our team will reach out within 2 business days to discuss a plan tailored to your organisation.</p>
          </div>

          {/* Errors / Success */}
          {errors.general && (
            <div className={styles.errBanner}>{errors.general}</div>
          )}
          {submitted && (
            <div className={styles.successBanner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:18, height:18, flexShrink:0 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Application submitted! We'll be in touch within 2 business days.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.formGrid}>

              <div className={styles.group}>
                <label>Company Name <span className={styles.req}>*</span></label>
                <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Your company name" className={errors.companyName ? styles.inputErr : ''}/>
                {err('companyName')}
              </div>

              <div className={styles.group}>
                <label>Company Size <span className={styles.req}>*</span></label>
                <select value={form.companySize} onChange={set('companySize')} className={errors.companySize ? styles.inputErr : ''}>
                  <option value="" disabled>Select size</option>
                  <option value="SIZE_1_10">1 – 10</option>
                  <option value="SIZE_11_50">11 – 50</option>
                  <option value="SIZE_51_200">51 – 200</option>
                  <option value="SIZE_201_500">201 – 500</option>
                  <option value="SIZE_500_1000">500 – 1,000</option>
                  <option value="SIZE_1000_PLUS">1,000+</option>
                </select>
                {err('companySize')}
              </div>

              <div className={styles.group}>
                <label>Email <span className={styles.req}>*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="hr@company.com" className={errors.email ? styles.inputErr : ''}/>
                {err('email')}
              </div>

              <div className={styles.group}>
                <label>Phone Number <span className={styles.req}>*</span></label>
                <input type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+234 XXX XXX XXXX" className={errors.phoneNumber ? styles.inputErr : ''}/>
                {err('phoneNumber')}
              </div>

              <div className={`${styles.group} ${styles.full}`}>
                <label>Company Address <span className={styles.req}>*</span></label>
                <textarea value={form.companyAddress} onChange={set('companyAddress')} placeholder="Full company address" rows={3} className={errors.companyAddress ? styles.inputErr : ''}/>
                {err('companyAddress')}
              </div>

              <div className={styles.group}>
                <label>Industry</label>
                <input type="text" value={form.industry} onChange={set('industry')} placeholder="e.g. Technology, Finance, Healthcare"/>
              </div>

              <div className={styles.group}>
                <label>HR Contact Name</label>
                <input type="text" value={form.hrContactName} onChange={set('hrContactName')} placeholder="Full name of HR contact"/>
              </div>

              <div className={styles.group}>
                <label>Preferred Start Date</label>
                <input type="date" value={form.startDate} onChange={set('startDate')}/>
              </div>

            </div>

            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            <p className={styles.submitNote}>We review all applications within 2 business days.</p>
          </form>
        </div>
      </section>
    </>
  );
}