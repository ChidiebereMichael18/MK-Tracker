from flask import Flask
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Stores current locations and metadata
locations = {}

class LocationTracker:
    def __init__(self):
        self.lat = None
        self.lng = None
        self.accuracy = None
        self.speed = None
        self.heading = None
        self.timestamp = None
        self.update_count = 0
        self.device_info = {}
        self.alias = None
        self.platform = "Unknown device"  # Add platform field
    
    def update(self, data):
        self.lat = data.get('lat')
        self.lng = data.get('lng')
        self.accuracy = data.get('accuracy')
        self.speed = data.get('speed')
        self.heading = data.get('heading')
        self.timestamp = data.get('timestamp')
        
        # Update device info if provided
        if 'deviceInfo' in data:
            self.device_info = data['deviceInfo']
            # Extract platform from userAgent for better device name
            self.platform = self._extract_device_name(data['deviceInfo'])
        
        # Update alias if provided
        if 'alias' in data:
            self.alias = data['alias']
            
        self.update_count += 1
    
    def _extract_device_name(self, device_info):
        """Extract readable device name from userAgent"""
        user_agent = device_info.get('userAgent', '').lower()
        platform = device_info.get('platform', '').lower()
        
        # Detect mobile devices
        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            if 'iphone' in user_agent:
                return "iPhone"
            elif 'samsung' in user_agent:
                return "Samsung Phone"
            elif 'pixel' in user_agent:
                return "Google Pixel"
            elif 'android' in user_agent:
                return "Android Phone"
            else:
                return "Mobile Phone"
        
        # Detect tablets
        elif 'ipad' in user_agent:
            return "iPad"
        elif 'tablet' in user_agent:
            return "Tablet"
        
        # Detect desktop OS
        elif 'mac' in user_agent or 'macos' in user_agent:
            return "Mac Computer"
        elif 'windows' in user_agent:
            return "Windows Computer"
        elif 'linux' in user_agent:
            return "Linux Computer"
        
        # Fallback to platform info
        elif platform:
            return platform.capitalize()
        else:
            return "Device"

@socketio.on("connect")
def on_connect():
    print("✅ Client connected")

@socketio.on("disconnect")
def on_disconnect():
    print("❌ Client disconnected")

@socketio.on("join_tracker")
def join_tracker(data):
    tracker_id = data.get("tracker_id")
    device_info = data.get("deviceInfo", {})
    
    join_room(tracker_id)
    print(f"📡 Client joined tracker room: {tracker_id}")
    
    # Initialize tracker with device info
    if tracker_id not in locations:
        locations[tracker_id] = LocationTracker()
    
    # Update device info when joining
    if device_info:
        locations[tracker_id].device_info = device_info
        locations[tracker_id].platform = locations[tracker_id]._extract_device_name(device_info)
        print(f"📱 Device info for {tracker_id}: {locations[tracker_id].platform}")

    # If location exists, send last known with device info
    if tracker_id in locations and locations[tracker_id].lat is not None:
        tracker = locations[tracker_id]
        emit("location_update", {
            "tracker_id": tracker_id,
            "lat": tracker.lat,
            "lng": tracker.lng,
            "accuracy": tracker.accuracy,
            "device_info": tracker.device_info,
            "platform": tracker.platform  # Send the extracted device name
        })

@socketio.on("update_location")
def handle_update(data):
    tracker_id = data.get("tracker_id")
    if not tracker_id:
        return

    # Initialize tracker if needed
    if tracker_id not in locations:
        locations[tracker_id] = LocationTracker()

    tracker = locations[tracker_id]
    tracker.update(data)

    # Only emit if we have valid coordinates
    if tracker.lat is not None and tracker.lng is not None:
        update_data = {
            "tracker_id": tracker_id,
            "lat": tracker.lat,
            "lng": tracker.lng,
            "accuracy": tracker.accuracy,
            "speed": tracker.speed,
            "heading": tracker.heading,
            "timestamp": tracker.timestamp,
            "device_info": tracker.device_info,
            "platform": tracker.platform,  # Send the readable device name
            "alias": tracker.alias
        }
        
        print(f"📍 Update for {tracker_id} ({tracker.platform}): {tracker.lat}, {tracker.lng}")
        emit("location_update", update_data, room=tracker_id)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)