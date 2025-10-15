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

// Enhanced device info detection
const getEnhancedDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  let deviceType = 'Device';
  let browser = 'Unknown Browser';
  
  if (/iPhone/.test(userAgent)) deviceType = 'iPhone';
  else if (/iPad/.test(userAgent)) deviceType = 'iPad';
  else if (/Android/.test(userAgent)) deviceType = 'Android Phone';
  else if (/Mac/.test(platform)) deviceType = 'Mac Computer';
  else if (/Win/.test(platform)) deviceType = 'Windows Computer';
  else if (/Linux/.test(platform)) deviceType = 'Linux Computer';
  
  if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/.test(userAgent)) browser = 'Firefox';
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
  else if (/Edg/.test(userAgent)) browser = 'Edge';
  
  return {
    userAgent: userAgent,
    platform: platform,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceType: deviceType,
    browser: browser,
    cores: navigator.hardwareConcurrency || 'Unknown',
    memory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'Unknown'
  };
};

// Main Dashboard Component
export default function Dashboard() {
  // State for managing trackers and UI
  const [trackers, setTrackers] = useState({});
  const [activeTrackerId, setActiveTrackerId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);

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

  // Share tracker link
  const shareTrackerLink = async () => {
    const trackUrl = `${window.location.origin}/track?id=${trackerId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Track My Location',
          text: 'Click this link to share your location with me:',
          url: trackUrl
        });
      } else {
        await navigator.clipboard.writeText(trackUrl);
        alert('Tracking link copied! Send this to anyone you want to track.');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Automatically add tracker when location data is received
  const autoAddTracker = (trackerId, data) => {
    setTrackers(prev => ({
      ...prev,
      [trackerId]: {
        coords: { lat: data.lat, lng: data.lng },
        info: {
          accuracy: data.accuracy,
          speed: data.speed,
          heading: data.heading,
          timestamp: data.timestamp
        },
        deviceInfo: data.device_info,
        platform: data.platform,
        ipAddress: data.ip_address,
        alias: data.alias,
        autoAdded: true,
        lastUpdate: Date.now()
      }
    }));

    if (!activeTrackerId || Object.keys(prev).length === 0) {
      setActiveTrackerId(trackerId);
    }
  };

  // Remove a tracker
  const removeTracker = (id) => {
    if (id === trackerId) return;
    
    setTrackers(prev => {
      const newTrackers = { ...prev };
      delete newTrackers[id];
      return newTrackers;
    });

    if (activeTrackerId === id) {
      const remainingIds = Object.keys(trackers).filter(tid => tid !== id);
      setActiveTrackerId(remainingIds.length > 0 ? remainingIds[0] : trackerId);
    }
  };

  // Load and re-join all tracked rooms
  const reloadTrackedRooms = () => {
    if (!socket) return;

    const deviceInfo = getEnhancedDeviceInfo();
    
    socket.emit("join_tracker", { tracker_id: trackerId, deviceInfo });
    
    const savedTrackers = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
    const currentTrackerIds = Object.keys(trackers);
    
    const allTrackerIds = [...new Set([...savedTrackers, ...currentTrackerIds, trackerId])];
    
    allTrackerIds.forEach(id => {
      if (id && id !== trackerId) {
        socket.emit("join_tracker", { tracker_id: id, deviceInfo });
      }
    });

    console.log(`🔄 Re-joined ${allTrackerIds.length} tracker rooms`);
  };

  useEffect(() => {
    const newSocket = io("https://mk-tracker.onrender.com");
    setSocket(newSocket);

    const deviceInfo = getEnhancedDeviceInfo();

    newSocket.emit("join_tracker", { tracker_id: trackerId, deviceInfo });
    setActiveTrackerId(trackerId);

    const savedTrackers = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
    savedTrackers.forEach(id => {
      if (id && id !== trackerId) {
        newSocket.emit("join_tracker", { tracker_id: id, deviceInfo });
      }
    });

    newSocket.on("location_update", (data) => {
      console.log("📍 Location update received:", data.tracker_id);
      autoAddTracker(data.tracker_id, data);
      
      if (data.tracker_id !== trackerId) {
        const savedTrackers = JSON.parse(localStorage.getItem('watchedTrackers') || '[]');
        if (!savedTrackers.includes(data.tracker_id)) {
          const newTrackerIds = [...savedTrackers, data.tracker_id];
          localStorage.setItem('watchedTrackers', JSON.stringify(newTrackerIds));
        }
      }
    });

    newSocket.on("reconnect", () => {
      console.log("🔌 Socket reconnected, reloading tracker rooms...");
      reloadTrackedRooms();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [trackerId]);

  useEffect(() => {
    if (socket) {
      reloadTrackedRooms();
    }
  }, [socket]);

  // Get display name for tracker
  const getTrackerDisplayName = (currentTrackerId, tracker) => {
    if (currentTrackerId === trackerId) return "Your Location";
    return tracker.alias || tracker.platform || `Device ${currentTrackerId.slice(0, 6)}`;
  };

  // Refresh all tracker connections
  const refreshAllTrackers = () => {
    if (socket) {
      reloadTrackedRooms();
      alert('Refreshed all tracker connections!');
    }
  };

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
                Your Tracker:
                <code className="px-2 py-1 bg-gray-50 rounded font-mono text-gray-800 text-xs">
                  {trackerId.slice(0, 8)}...
                </code>
              </div>
              <button
                onClick={shareTrackerLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Get Tracking Link</span>
              </button>
              <button
                onClick={refreshAllTrackers}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Refresh all tracker connections"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{Object.keys(trackers).length} devices</span> being tracked
            </div>
            <div className="text-xs text-gray-500">
              Share your link • Click = Tracked • Auto-reconnect on refresh
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
              <span>Tracked Devices ({Object.keys(trackers).length})</span>
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
                          {getTrackerDisplayName(id, tracker)}
                        </div>
                        <div className="mt-1 text-sm text-gray-500 truncate">
                          {tracker.platform || tracker.deviceInfo?.platform || 'Device'}
                          {tracker.autoAdded && <span className="text-blue-500 ml-1">• Live</span>}
                        </div>
                        {/* NEW: Display IP Address */}
                        {tracker.ipAddress && (
                          <div className="mt-1 text-xs text-gray-400 truncate">
                            IP: {tracker.ipAddress}
                          </div>
                        )}
                      </div>
                      {id !== trackerId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTracker(id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"
                          title="Remove tracker"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {tracker.info && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          Accuracy: ±{tracker.info.accuracy?.toFixed(0) || '?'}m • 
                          Last update: {tracker.lastUpdate ? new Date(tracker.lastUpdate).toLocaleTimeString() : 'Now'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty state */}
                {Object.keys(trackers).length === 0 && (
                  <div className="text-center p-6 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>No locations yet</p>
                    <p className="text-sm mt-1">Share your link to start tracking</p>
                  </div>
                )}
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
                    {getTrackerDisplayName(activeTrackerId, trackers[activeTrackerId])}
                  </div>
                  <div className="text-sm text-gray-500">
                    {trackers[activeTrackerId].platform || trackers[activeTrackerId].deviceInfo?.platform || 'Device'}
                  </div>
                  {/* NEW: Display IP in mobile view */}
                  {trackers[activeTrackerId].ipAddress && (
                    <div className="text-xs text-gray-400">
                      IP: {trackers[activeTrackerId].ipAddress}
                    </div>
                  )}
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
                    opacity={id === activeTrackerId ? 1 : 0.7}
                  >
                    <Popup className="rounded-lg">
                      <div className="p-3">
                        <div className="font-medium text-gray-900">
                          {getTrackerDisplayName(id, tracker)}
                        </div>
                        {/* NEW: Display IP in popup */}
                        {tracker.ipAddress && (
                          <div className="text-sm text-gray-600 mb-2">
                            IP: {tracker.ipAddress}
                          </div>
                        )}
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
                            <div>{tracker.platform || tracker.deviceInfo.platform}</div>
                            <div>{tracker.deviceInfo.screenSize}</div>
                            <div>{tracker.deviceInfo.timeZone}</div>
                            {/* NEW: Enhanced device info */}
                            {tracker.deviceInfo.browser && (
                              <div>Browser: {tracker.deviceInfo.browser}</div>
                            )}
                            {tracker.deviceInfo.cores && (
                              <div>CPU Cores: {tracker.deviceInfo.cores}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="text-xl font-medium text-gray-900 mb-2">Ready to Track</div>
                  <p className="text-gray-600 mb-4">
                    Click "Get Tracking Link" and share it with anyone. Their location will appear here automatically when they click your link.
                  </p>
                  <button
                    onClick={shareTrackerLink}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Get Your Tracking Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}