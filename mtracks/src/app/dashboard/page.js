'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import dynamic from 'next/dynamic';

// Dynamic imports for map components
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">Loading map...</div>
    </div>
  )
});

const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(m => m.ZoomControl), { ssr: false });

// Generate a secure random ID
function generateTrackerId() {
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined') {
    crypto.getRandomValues(array);
  }
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

// Main Dashboard Component
export default function Dashboard() {
  // State for managing trackers and UI
  const [trackers, setTrackers] = useState({});
  const [activeTrackerId, setActiveTrackerId] = useState(null);
  const [newTrackerId, setNewTrackerId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Generate and manage primary tracker ID
  const [trackerId] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('trackerId');
      if (savedId) return savedId;
      const newId = generateTrackerId();
      localStorage.setItem('trackerId', newId);
      return newId;
    }
    return '';
  });

  // Get device info for tracking
  const getDeviceInfo = () => ({
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    language: window.navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  // Share tracker ID
  const shareTrackerId = async () => {
    const shareData = {
      title: 'MK-Tracker Location Share',
      text: `Track my location using this ID: ${trackerId}`,
      url: `${window.location.origin}/track?id=${trackerId}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyToClipboard(shareData.url);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Copy to clipboard with feedback
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle adding a new tracker
  const addTracker = (id) => {
    if (!id || id === trackerId) return;
    if (Object.keys(trackers).length >= 5) {
      alert('Maximum limit of 5 trackers reached');
      return;
    }

    const savedTrackers = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
    if (!savedTrackers.includes(id)) {
      const newTrackerIds = [...savedTrackers, id];
      localStorage.setItem('watchedTrackers', JSON.stringify(newTrackerIds));
      
      const socket = io("https://mk-tracker.onrender.com");
      socket.emit("join_tracker", { 
        tracker_id: id,
        deviceInfo: getDeviceInfo()
      });
    }
  };

  // Remove a tracker
  const removeTracker = (id) => {
    if (id === trackerId) return;
    const savedTrackers = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
    const newTrackerIds = savedTrackers.filter(t => t !== id);
    localStorage.setItem('watchedTrackers', JSON.stringify(newTrackerIds));
    
    setTrackers(prev => {
      const newTrackers = { ...prev };
      delete newTrackers[id];
      return newTrackers;
    });

    if (activeTrackerId === id) {
      setActiveTrackerId(trackerId);
    }
  };

  useEffect(() => {
    const socket = io("https://mk-tracker.onrender.com");
    const deviceInfo = getDeviceInfo();

    // Join primary tracker
    socket.emit("join_tracker", { tracker_id: trackerId, deviceInfo });
    setActiveTrackerId(trackerId);

    // Load saved trackers
    const savedTrackers = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
    savedTrackers.forEach(id => {
      if (id !== trackerId) {
        socket.emit("join_tracker", { tracker_id: id, deviceInfo });
      }
    });

    // Handle location updates
    socket.on("location_update", (data) => {
      setTrackers(prev => ({
        ...prev,
        [data.tracker_id]: {
          coords: { lat: data.lat, lng: data.lng },
          info: {
            accuracy: data.accuracy,
            speed: data.speed,
            heading: data.heading,
            timestamp: data.timestamp
          },
          deviceInfo: data.device_info,
          alias: data.alias
        }
      }));
    });

    return () => socket.disconnect();
  }, [trackerId]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">MK-Tracker</h1>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Live
              </span>
            </div>

            {/* Share Section */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                Your ID:
                <code className="px-2 py-1 bg-gray-50 rounded font-mono text-gray-800">
                  {trackerId}
                </code>
              </div>
              <button
                onClick={shareTrackerId}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share TrackingId</span>
                <span className="sm:hidden">Share</span>
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="w-full sm:w-auto flex items-center gap-2">
              <input
                type="text"
                value={newTrackerId}
                onChange={(e) => setNewTrackerId(e.target.value)}
                placeholder="Enter tracker ID to follow"
                className="flex-1 sm:flex-none min-w-0 sm:w-64 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newTrackerId) {
                    addTracker(newTrackerId);
                    setNewTrackerId('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newTrackerId) {
                    addTracker(newTrackerId);
                    setNewTrackerId('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Tracking <span className="font-medium">{Object.keys(trackers).length}/5</span> devices
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Tracker list - Collapsible on mobile */}
        <div className="lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="lg:hidden p-2 border-b border-gray-100">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <span>Active Trackers ({Object.keys(trackers).length})</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <div className={`lg:block ${isSidebarOpen ? 'block' : 'hidden'}`}>
            <div className="lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <div className="p-4 space-y-3">
                {Object.entries(trackers).map(([id, tracker]) => (
                  <div
                    key={id}
                    className={`p-3 rounded-lg border ${
                      activeTrackerId === id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    } cursor-pointer transition-colors hover:border-blue-200`}
                    onClick={() => {
                      setActiveTrackerId(id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {tracker.alias || `Tracker ${id.slice(0, 6)}`}
                        </div>
                        <div className="mt-1 text-sm text-gray-500 truncate">
                          {tracker.deviceInfo?.platform || 'Unknown device'}
                        </div>
                      </div>
                      {id !== trackerId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTracker(id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {tracker.deviceInfo && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 truncate">
                          {tracker.deviceInfo.screenSize} • {tracker.deviceInfo.timeZone}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {/* Mobile tracker switcher */}
          {activeTrackerId && trackers[activeTrackerId] && (
            <div className="lg:hidden absolute top-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {trackers[activeTrackerId].alias || `Tracker ${activeTrackerId.slice(0, 6)}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {trackers[activeTrackerId].deviceInfo?.platform || 'Unknown device'}
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="h-full">
            {activeTrackerId && trackers[activeTrackerId]?.coords ? (
              <MapContainer
                key={`${trackers[activeTrackerId].coords.lat}-${trackers[activeTrackerId].coords.lng}`}
                center={[
                  trackers[activeTrackerId].coords.lat,
                  trackers[activeTrackerId].coords.lng
                ]}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom={true}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  maxNativeZoom={19}
                  maxZoom={19}
                />
                <ZoomControl position="topleft" />
                
                {Object.entries(trackers).map(([id, tracker]) => (
                  <Marker
                    key={id}
                    position={[tracker.coords.lat, tracker.coords.lng]}
                    opacity={id === activeTrackerId ? 1 : 0.6}
                  >
                    <Popup className="rounded-lg">
                      <div className="p-3">
                        <div className="font-medium text-gray-900">
                          {tracker.alias || `Tracker ${id.slice(0, 6)}`}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div>Lat: {tracker.coords.lat.toFixed(6)}</div>
                          <div>Lng: {tracker.coords.lng.toFixed(6)}</div>
                          {tracker.info?.accuracy && (
                            <div>Accuracy: ±{tracker.info.accuracy.toFixed(0)}m</div>
                          )}
                          {tracker.info?.speed && (
                            <div>
                              Speed: {(tracker.info.speed * 3.6).toFixed(1)} km/h
                            </div>
                          )}
                        </div>
                        {tracker.deviceInfo && (
                          <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                            <div>{tracker.deviceInfo.platform}</div>
                            <div>{tracker.deviceInfo.screenSize}</div>
                            <div>{tracker.deviceInfo.timeZone}</div>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                  <div className="text-xl font-medium text-gray-900 mb-2">No tracker selected</div>
                  <p className="text-gray-500">
                    Select a tracker from the list {isSidebarOpen ? '' : 'or click the menu button'} to view its location
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}