import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Contact.module.css';

/* ================================================================
   API CONFIG
================================================================ */
import { API_BASE } from '../../Api/apiFetch';

/* ── ICONS ── */
const PhoneIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

/* ── INITIAL FORM STATE ── */
const INITIAL = {
  fullName: '', email: '', phone: '', address: '',
  locationArea: '', serviceNeeded: '', description: '', preferredContactTime: '',
};

export default function Contact() {
  const [form,       setForm]       = useState(INITIAL);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  /* { email, newAccount } once sent — newAccount=false when the email already has a login */
  const [submitted,  setSubmitted]  = useState(null);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  /* ── VALIDATE ── */
  const validate = () => {
    const e = {};
    if (!form.fullName)           e.fullName           = 'Full name is required';
    if (!form.email)              e.email              = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email — your account link is sent here';
    if (!form.phone)              e.phone              = 'Phone number is required';
    if (!form.serviceNeeded)      e.serviceNeeded      = 'Please select a service';
    if (!form.preferredContactTime) e.preferredContactTime = 'Please select a preferred time';
    return e;
  };

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    const payload = {
      fullName:             form.fullName,
      email:                form.email.trim().toLowerCase(),
      phoneNumber:          form.phone,
      address:              form.address,
      locationArea:         form.locationArea,
      serviceNeeded:        form.serviceNeeded,
      description:          form.description,
      preferredContactTime: form.preferredContactTime,
    };

    try {
      const res  = await fetch(`${API_BASE}/care-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let data = {};
      try { data = await res.json(); } catch {
        if (!res.ok) { setErrors({ general: `Server error (${res.status}). Please try again.` }); return; }
      }

      if (!res.ok) {
        // ✅ Map backend field-level errors back to form fields
        if (data.errors && typeof data.errors === 'object') {
          const fieldMap = {
            fullName:             'fullName',
            email:                'email',
            phoneNumber:          'phone',
            serviceNeeded:        'serviceNeeded',
            locationArea:         'locationArea',
            description:          'description',
            preferredContactTime: 'preferredContactTime',
          };
          const mapped = {};
          Object.entries(data.errors).forEach(([k, v]) => {
            mapped[fieldMap[k] || k] = v;
          });
          setErrors(mapped);
        } else {
          setErrors({ general: data.message || 'Submission failed. Please try again.' });
        }
        return;
      }

      setSubmitted({ email: form.email.trim().toLowerCase(), newAccount: data.accountCreated !== false });
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
        <div className={styles.heroGrid}>
          <div>
            <span className={styles.heroBadge}>Contact / Book Care</span>
            <h1>Get in touch. We make it easy.</h1>
            <p className={styles.heroDesc}>
              Call, WhatsApp, or submit a request online. For urgent needs, WhatsApp or
              phone is the fastest route. The form below is for scheduling a callback or
              structured handoff.
            </p>
            <div className={styles.heroCta}>
              <a href="tel:+2340974562456" className={styles.btnOutlineWhite}>
                <PhoneIcon /> Call Now
              </a>
              <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.btnGreen}>
                <WhatsAppIcon /> WhatsApp Us
              </a>
            </div>
          </div>

          <div className={styles.responsePromise}>
            <h4>Response Promise</h4>
            <p>We respond within 1 hour during operating hours. Immediate needs should go to phone or WhatsApp.</p>
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <div className={styles.body}>

        {/* LEFT */}
        <div className={styles.left}>

          {/* Contact tiles */}
          <div className={styles.tiles}>
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>,
                title: 'Phone', sub: 'Call Now',
                value: '+234 097 456 2456', href: 'tel:+2340974562456',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                title: 'WhatsApp', sub: 'Chat With Us Instantly',
                value: 'Start a WhatsApp chat', href: 'https://wa.me/2340974562456',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                title: 'Email', sub: 'For Non-Urgent Queries',
                value: 'hello@digihealth.com', href: 'mailto:hello@digihealth.com',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                title: 'Operating Hours', sub: 'Availability',
                value: 'Monday to Sunday, 6:00 AM to 8:00 PM', href: null,
              },
            ].map(tile => (
              <div key={tile.title} className={styles.tile}>
                <div className={styles.tileTop}>
                  <div className={styles.tileIcon}>{tile.icon}</div>
                  <h3>{tile.title}</h3>
                </div>
                <p className={styles.tileSub}>{tile.sub}</p>
                {tile.href
                  ? <a href={tile.href} className={styles.tileValue} target={tile.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{tile.value}</a>
                  : <span className={styles.tileValue}>{tile.value}</span>
                }
              </div>
            ))}
          </div>

          {/* Location tile */}
          <div className={styles.tile}>
            <div className={styles.tileTop}>
              <div className={styles.tileIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3>Location</h3>
            </div>
            <p className={styles.locationText}>Ikeja, Lagos, Nigeria</p>
            <a href="https://maps.google.com/?q=Ikeja,Lagos,Nigeria" target="_blank" rel="noreferrer" className={styles.btnMaps}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Open in Google Maps
            </a>
          </div>

          {/* ── BOOKING FORM ── */}
          <div className={styles.formSection}>
            <p className={styles.formLabelTop}>Book Care</p>
            <h2>Request care in a few minutes.</h2>
            <p className={styles.formDesc}>Fill out the form below. If you need immediate help, call or WhatsApp us instead.</p>

            {/* General error */}
            {errors.general && <div className={styles.errBanner}>{errors.general}</div>}

            {/* Success */}
            {submitted && (
              <div className={styles.successBanner}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:18, height:18, flexShrink:0 }}><polyline points="20 6 9 17 4 12"/></svg>
                <span>
                  Request submitted! We'll contact you within 1 hour during operating hours.
                  {submitted.newAccount ? (
                    <>{' '}We've also emailed <strong>{submitted.email}</strong> a link to set your password — use it to sign in and follow your care online.</>
                  ) : (
                    <>{' '}You already have an account with <strong>{submitted.email}</strong> — <Link to="/login" style={{ color: 'inherit', fontWeight: 700 }}>sign in</Link> to follow this request.</>
                  )}
                </span>
              </div>
            )}

            <div className={styles.formRow}>
              <div className={styles.group}>
                <label>Full Name <span className={styles.req}>*</span></label>
                <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="Your full name" className={errors.fullName ? styles.inputErr : ''}/>
                {err('fullName')}
              </div>
              <div className={styles.group}>
                <label>Email <span className={styles.req}>*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="Your email" className={errors.email ? styles.inputErr : ''}/>
                {err('email')}
              </div>
              <div className={styles.group}>
                <label>Phone Number <span className={styles.req}>*</span></label>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+234 XXX XXX XXXX" className={errors.phone ? styles.inputErr : ''}/>
                {err('phone')}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.group}>
                <label>Address</label>
                <input type="text" value={form.address} onChange={set('address')} placeholder="Your home address"/>
              </div>
              <div className={styles.group}>
                <label>Location / Area</label>
                <select value={form.locationArea} onChange={set('locationArea')}>
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
              <div className={styles.group}>
                <label>Service Needed <span className={styles.req}>*</span></label>
                <select value={form.serviceNeeded} onChange={set('serviceNeeded')} className={errors.serviceNeeded ? styles.inputErr : ''}>
                  <option value="" disabled>Select a service</option>
                  <option>Post-Discharge Recovery</option>
                  <option>Home Nursing Care</option>
                  <option>Chronic Care Management</option>
                  <option>Elderly Care Support</option>
                  <option>Postnatal Mother and Baby Care</option>
                  <option>Physiotherapy and Rehabilitation</option>
                  <option>Lab and Diagnostic Services</option>
                  <option>Telemedicine</option>
                  <option>Not sure — need guidance</option>
                </select>
                {err('serviceNeeded')}
              </div>
            </div>

            <div className={styles.formRowFull}>
              <div className={styles.group}>
                <label>Brief Description</label>
                <textarea value={form.description} onChange={set('description')} placeholder="Briefly describe the care needed or situation..."/>
              </div>
            </div>

            <div className={styles.formRowFull}>
              <div className={styles.group}>
                <label>Preferred Contact Time <span className={styles.req}>*</span></label>
                <select value={form.preferredContactTime} onChange={set('preferredContactTime')} className={errors.preferredContactTime ? styles.inputErr : ''}>
                  <option value="" disabled>Select a preferred time</option>
                  <option value="AS_SOON_AS_POSSIBLE">As soon as possible</option>
                  <option value="MORNING_6AM_TO_12PM">Morning (6:00 AM – 12:00 PM)</option>
                  <option value="AFTERNOON_12PM_TO_5PM">Afternoon (12:00 PM – 5:00 PM)</option>
                  <option value="EVENING_5PM_TO_8PM">Evening (5:00 PM – 8:00 PM)</option>
                </select>
                {err('preferredContactTime')}
              </div>
            </div>

            <div className={styles.submitRow}>
              <button className={styles.btnSubmit} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <span className={styles.formNote}>We respond within 1 hour during operating hours.</span>
            </div>
          </div>

        </div>

        {/* RIGHT: Map */}
        <div className={styles.right}>
          <div className={styles.mapWrap}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126846.01254230349!2d3.281127054967959!3d6.52952875554641!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b9228fa2a3999%3A0xd7a8324bddbba1f0!2sIkeja%2C%20Lagos!5e0!3m2!1sen!2sng!4v1776831704747!5m2!1sen!2sng"
              title="DiGi Health Location"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className={styles.mapLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14, flexShrink:0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Ikeja, Lagos, Nigeria
            </div>
          </div>
        </div>

      </div>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLabel}>Still Unsure?</p>
        <h2>That's OK. Talk to Us — We'll Guide You.</h2>
        <p>No pressure. No commitment. Just a conversation with someone who understands healthcare and can help you decide what care makes sense next.</p>
        <div className={styles.ctaBtns}>
          <a href="tel:+2340974562456" className={styles.btnOutlineNavy}><PhoneIcon /> Call Now</a>
          <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.btnGreenDark}><WhatsAppIcon /> WhatsApp Us</a>
          <button onClick={() => document.querySelector(`.${styles.formSection}`)?.scrollIntoView({ behavior: 'smooth' })} className={styles.btnOutlineNavy}><CalendarIcon /> Book a Visit</button>
        </div>
      </section>
    </>
  );
}