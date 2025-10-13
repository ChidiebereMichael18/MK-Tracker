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
        
        # Update alias if provided
        if 'alias' in data:
            self.alias = data['alias']
            
        self.update_count += 1

@socketio.on("connect")
def on_connect():
    print("✅ Client connected")

@socketio.on("disconnect")
def on_disconnect():
    print("❌ Client disconnected")

@socketio.on("join_tracker")
def join_tracker(data):
    tracker_id = data.get("tracker_id")
    join_room(tracker_id)
    print(f"📡 Client joined tracker room: {tracker_id}")

    # If location exists, send last known
    if tracker_id in locations:
        emit("location_update", {
            "tracker_id": tracker_id,
            "lat": locations[tracker_id]["lat"],
            "lng": locations[tracker_id]["lng"],
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
            "alias": tracker.alias
        }
        
        print(f"📍 Update for {tracker_id}: {tracker.lat}, {tracker.lng} (accuracy: {tracker.accuracy}m)")
        emit("location_update", update_data, room=tracker_id)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)