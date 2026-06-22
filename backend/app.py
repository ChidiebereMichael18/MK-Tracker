from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory location store
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
        self.platform = "Unknown device"
        self.ip_address = None
        self.battery = None
        self.connection = None

    def update(self, data):
        self.lat = data.get('lat')
        self.lng = data.get('lng')
        self.accuracy = data.get('accuracy')
        self.speed = data.get('speed')
        self.heading = data.get('heading')
        self.timestamp = data.get('timestamp')

        if 'deviceInfo' in data:
            self.device_info = data['deviceInfo']
            self.platform = self._extract_device_name(data['deviceInfo'])

        if 'alias' in data:
            self.alias = data['alias']

        # New enriched fields
        if 'battery' in data and data['battery'] is not None:
            self.battery = data['battery']
        if 'connection' in data and data['connection']:
            self.connection = data['connection']

        self.update_count += 1

    def _extract_device_name(self, device_info):
        """Extract readable device name from userAgent"""
        user_agent = device_info.get('userAgent', '').lower()
        platform = device_info.get('platform', '').lower()
        device_type = device_info.get('deviceType', '')

        if device_type:
            return device_type

        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            if 'iphone' in user_agent: return "iPhone"
            elif 'samsung' in user_agent: return "Samsung Phone"
            elif 'pixel' in user_agent: return "Google Pixel"
            elif 'android' in user_agent: return "Android Phone"
            else: return "Mobile Phone"
        elif 'ipad' in user_agent: return "iPad"
        elif 'tablet' in user_agent: return "Tablet"
        elif 'mac' in user_agent or 'macos' in user_agent: return "Mac"
        elif 'windows' in user_agent: return "Windows"
        elif 'linux' in user_agent: return "Linux"
        elif platform: return platform.capitalize()
        else: return "Device"

def get_client_ip():
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0].strip()
    return request.environ.get('REMOTE_ADDR', 'Unknown')

@socketio.on("connect")
def on_connect():
    client_ip = get_client_ip()
    print(f"✅ Client connected from IP: {client_ip}")

@socketio.on("disconnect")
def on_disconnect():
    print("❌ Client disconnected")

@socketio.on("join_tracker")
def join_tracker(data):
    tracker_id = data.get("tracker_id")
    device_info = data.get("deviceInfo", {})
    client_ip = get_client_ip()

    join_room(tracker_id)
    print(f"📡 Joined tracker room: {tracker_id} | IP: {client_ip}")

    if tracker_id not in locations:
        locations[tracker_id] = LocationTracker()

    tracker = locations[tracker_id]
    if device_info:
        tracker.device_info = device_info
        tracker.platform = tracker._extract_device_name(device_info)
        tracker.ip_address = client_ip
        print(f"📱 Device: {tracker.platform} | IP: {client_ip}")

    # Send last known location to newly joined client
    if tracker.lat is not None:
        emit("location_update", {
            "tracker_id": tracker_id,
            "lat": tracker.lat,
            "lng": tracker.lng,
            "accuracy": tracker.accuracy,
            "speed": tracker.speed,
            "heading": tracker.heading,
            "timestamp": tracker.timestamp,
            "device_info": tracker.device_info,
            "platform": tracker.platform,
            "ip_address": tracker.ip_address,
            "battery": tracker.battery,
            "connection": tracker.connection,
            "alias": tracker.alias,
        })

@socketio.on("update_location")
def handle_update(data):
    tracker_id = data.get("tracker_id")
    if not tracker_id:
        return

    if tracker_id not in locations:
        locations[tracker_id] = LocationTracker()

    tracker = locations[tracker_id]
    tracker.update(data)

    if not tracker.ip_address:
        tracker.ip_address = get_client_ip()

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
            "platform": tracker.platform,
            "ip_address": tracker.ip_address,
            "battery": tracker.battery,
            "connection": tracker.connection,
            "alias": tracker.alias,
        }
        bat_str = f" | 🔋{tracker.battery}%" if tracker.battery is not None else ""
        conn_str = f" | 📶{tracker.connection}" if tracker.connection else ""
        print(f"📍 {tracker_id} ({tracker.platform}) | IP: {tracker.ip_address}{bat_str}{conn_str}: {tracker.lat:.5f}, {tracker.lng:.5f}")
        emit("location_update", update_data, room=tracker_id)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)