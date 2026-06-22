'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Component to handle smooth panning of the Leaflet map when active coords change
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export default function LeafletMap({
  center,
  zoom,
  trackers,
  activeId,
  setActiveId,
  setInfoWindowId,
  infoWindowId,
  getName,
}) {
  // Custom Leaflet icons using divIcon to avoid default asset loading issues
  const activeIcon = L.divIcon({
    className: 'custom-leaflet-marker-active',
    html: `
      <div style="
        position: relative;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #6366f1;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
      ">
        <div style="
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.25);
          animation: pulse 1.8s infinite;
        "></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

  const inactiveIcon = L.divIcon({
    className: 'custom-leaflet-marker-inactive',
    html: `
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #71717a;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });

  // Center coordinate format [lat, lng]
  const leafletCenter = center ? [center.lat, center.lng] : [0, 0];

  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'detailed'

  const tileUrl = mapStyle === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }} className={mapStyle === 'dark' ? 'leaflet-theme-dark' : 'leaflet-theme-light'}>
      {/* Scope Leaflet styles to match our premium dark dashboard design */}
      <style>{`
        .leaflet-container {
          background: #09090b !important;
          font-family: inherit;
        }
        
        /* Dark Theme overrides */
        .leaflet-theme-dark .leaflet-popup-content-wrapper {
          background: #18181b !important;
          color: #f4f4f5 !important;
          border: 1px solid #27272a !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          padding: 4px !important;
        }
        .leaflet-theme-dark .leaflet-popup-tip {
          background: #18181b !important;
          border: 1px solid #27272a !important;
        }
        .leaflet-theme-dark .leaflet-bar a {
          background-color: #18181b !important;
          color: #a1a1aa !important;
          border-bottom: 1px solid #27272a !important;
          transition: all 0.15s;
        }
        .leaflet-theme-dark .leaflet-bar a:hover {
          background-color: #27272a !important;
          color: #ffffff !important;
        }
        
        /* Light/Detailed Theme overrides */
        .leaflet-theme-light .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          color: #18181b !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          padding: 4px !important;
        }
        .leaflet-theme-light .leaflet-popup-tip {
          background: #ffffff !important;
        }
        .leaflet-theme-light .leaflet-bar a {
          background-color: #ffffff !important;
          color: #27272a !important;
          border-bottom: 1px solid #e4e4e7 !important;
          transition: all 0.15s;
        }
        .leaflet-theme-light .leaflet-bar a:hover {
          background-color: #f4f4f5 !important;
          color: #000000 !important;
        }

        .leaflet-popup-content {
          margin: 12px 14px !important;
          line-height: 1.4 !important;
        }
        .leaflet-bar {
          border: 1px solid #27272a !important;
          box-shadow: none !important;
        }
        .leaflet-control-attribution {
          background: rgba(24, 24, 27, 0.7) !important;
          color: #71717a !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: #6366f1 !important;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0; }
        }
      `}</style>

      {/* Map Style Selector overlay */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        background: 'rgba(20, 20, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--line-bright)',
        borderRadius: 8,
        padding: 3,
        display: 'flex',
        gap: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {[
          { id: 'dark', label: 'STEALTH' },
          { id: 'detailed', label: 'DETAILED' }
        ].map(style => (
          <button
            key={style.id}
            onClick={() => setMapStyle(style.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: mapStyle === style.id ? 'var(--accent)' : 'transparent',
              color: mapStyle === style.id ? '#ffffff' : 'var(--t3)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
          >
            {style.label}
          </button>
        ))}
      </div>

      <MapContainer
        center={leafletCenter}
        zoom={zoom}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />
        
        <MapRecenter center={center} />

        {Object.entries(trackers).map(([id, t]) => {
          if (!t.coords) return null;
          const isActive = id === activeId;
          return (
            <div key={id}>
              {isActive && (
                <Circle
                  center={[t.coords.lat, t.coords.lng]}
                  radius={t.info?.accuracy || 15}
                  pathOptions={{
                    fillColor: '#6366f1',
                    fillOpacity: 0.12,
                    color: '#6366f1',
                    opacity: 0.35,
                    weight: 1,
                  }}
                />
              )}
              <Marker
                position={[t.coords.lat, t.coords.lng]}
                icon={isActive ? activeIcon : inactiveIcon}
                eventHandlers={{
                  click: () => {
                    setActiveId(id);
                    setInfoWindowId(id);
                  },
                }}
              >
                {infoWindowId === id && (
                  <Popup onClose={() => setInfoWindowId(null)}>
                    <div style={{ minWidth: 200, fontSize: 12, color: '#f4f4f5' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, color: '#ffffff', borderBottom: '1px solid #27272a', paddingBottom: 4 }}>
                        {getName(id, t)}
                      </div>
                      {[
                        ['IP', t.ipAddress],
                        ['Device', t.deviceInfo?.deviceType],
                        ['Browser', t.deviceInfo?.browser],
                        ['Screen', t.deviceInfo?.screenSize],
                        ['Timezone', t.deviceInfo?.timeZone],
                        ['Coords', t.coords ? `${t.coords.lat.toFixed(5)}, ${t.coords.lng.toFixed(5)}` : null],
                        ['Accuracy', t.info?.accuracy ? `±${t.info.accuracy.toFixed(0)}m` : null],
                        ['Speed', t.info?.speed ? `${(t.info.speed * 3.6).toFixed(1)} km/h` : null],
                        ['Battery', t.battery !== undefined ? `${t.battery}%` : null],
                        ['Connection', t.connection]
                      ].map(([k, v]) => v ? (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '2.5px 0' }}>
                          <span style={{ color: '#a1a1aa' }}>{k}</span>
                          <span style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 11, fontWeight: 500 }}>{v}</span>
                        </div>
                      ) : null)}
                      {t.coords && (
                        <div style={{ marginTop: 8, borderTop: '1px solid #27272a', paddingTop: 8, display: 'flex', justifyContent: 'center' }}>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${t.coords.lat},${t.coords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#6366f1',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>View on Google Maps</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </Popup>
                )}
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
