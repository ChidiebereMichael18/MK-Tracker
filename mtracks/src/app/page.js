'use client';

import React from 'react';
import { IconRadar, IconPhone, IconTarget, IconFingerprint } from './components/Icons';

export default function Home() {
  return (
    <main className="cyber-grid" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Visual Accent Spotlights */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: 840, width: '100%', zIndex: 1, position: 'relative' }}>

        {/* Top Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60, borderBottom: '1px solid var(--line)', paddingBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="pulse-indicator" style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px var(--accent-glow)'
            }}>
              <IconRadar size={16} color="white" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
              MK-TRACKER
            </span>
          </div>
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge-live">SYSTEM STATUS: ACTIVE</span>
          </div> */}
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: 48, maxWidth: 580 }}>
          <h1 className="glow-text" style={{
            fontSize: 'clamp(32px, 6vw, 48px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            color: 'var(--t1)',
            marginBottom: 20,
          }}>
            Full-Spectrum <span style={{ background: 'linear-gradient(to right, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>OSINT Tracking</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.7, margin: 0 }}>
            Inspect targets with live coordinate streams over WebSockets, gather intelligence on phone numbers via remote carrier lookups, and configure customized bait hooks in seconds.
          </p>
        </div>

        {/* Feature Grid — 2x2 Clean Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          marginBottom: 56
        }}>
          {[
            {
              icon: <IconTarget size={20} color="var(--accent)" />,
              title: 'Live GPS Mapping',
              desc: 'Real-time GPS coordinate telemetry over robust WebSocket channels. Continuously streams precision logs, speed statistics, and accuracy circles.'
            },
            {
              icon: <IconPhone size={20} color="var(--accent)" />,
              title: 'Phone Number Intelligence',
              desc: 'OSINT phone scanner returning carrier information, dial codes, line types (VoIP/Mobile/Landline), and risk evaluation metrics.'
            },
            {
              icon: <IconRadar size={20} color="var(--accent)" />,
              title: 'Custom Bait Templates',
              desc: 'Design localized delivery reports, suspicious login warnings, job offers, or food deliveries to gather victim signals safely.'
            },
            {
              icon: <IconFingerprint size={20} color="var(--accent)" />,
              title: 'Hardware Fingerprinting',
              desc: 'Extract client technical details automatically: OS build, browser, display screen dimensions, locale timezone, hardware cores, RAM, and current battery level.'
            }
          ].map((f, i) => (
            <div key={i} className="card glow-card" style={{
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: 'rgba(20, 20, 22, 0.6)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 255, 255, 0.03)'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Block */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          borderTop: '1px solid var(--line)',
          paddingTop: 32
        }}>
          <a href="/dashboard" className="landing-cta">
            Open Operations Center
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
              <div>SOCKETS: ONLINE</div>
              <div>VER: 2.1.0-PRO</div>
              <div style={{ color: 'var(--accent)', fontWeight: 600 }}>BUILT BY MIKE</div>
            </div>
            
            {/* Github Star Button */}
            <a 
              href="https://github.com/ChidiebereMichael18/MK-Tracker"
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--t2)',
                textDecoration: 'none',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line)',
                borderRadius: 7,
                padding: '5px 12px',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--mono)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.4)';
                e.currentTarget.style.background = 'rgba(250, 204, 21, 0.06)';
                e.currentTarget.style.color = '#facc15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.color = 'var(--t2)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Star Repository</span>
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}