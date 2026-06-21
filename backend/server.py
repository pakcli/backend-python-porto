import os
import sys
import json
import threading
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_sock import Sock
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Include backend directory in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import WATCH_DIR, PORT, CERT_PATH, KEY_PATH, DEBOUNCE_SECONDS
from scan import scan_directory, save_data

# Ensure certs are generated
from generate_certs import generate_self_signed_cert
generate_self_signed_cert(os.path.dirname(CERT_PATH))

# Initialize Flask
DIST_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
app = Flask(__name__, static_folder=DIST_FOLDER, static_url_path="")
sock = Sock(app)

# WebSocket Clients
active_clients = set()
clients_lock = threading.Lock()

# Initial scan
print("[SERVER] Running initial scan...")
initial_data = scan_directory(WATCH_DIR)
save_data(initial_data)

def broadcast_update(data):
    msg = json.dumps({"event": "dashboard_update", "data": data})
    with clients_lock:
        closed_clients = []
        for ws in active_clients:
            try:
                ws.send(msg)
            except Exception as e:
                print(f"[WS] Failed to send update to client: {e}")
                closed_clients.append(ws)
        for ws in closed_clients:
            active_clients.discard(ws)

# Debounced Scanner
class DebouncedScanner:
    def __init__(self, watch_dir, debounce_seconds):
        self.watch_dir = watch_dir
        self.debounce_seconds = debounce_seconds
        self.timer = None
        self.lock = threading.Lock()

    def trigger(self):
        with self.lock:
            if self.timer is not None:
                self.timer.cancel()
            self.timer = threading.Timer(self.debounce_seconds, self._run_scan)
            self.timer.start()

    def _run_scan(self):
        print("[WATCHER] Scan triggered by file change...")
        data = scan_directory(self.watch_dir)
        save_data(data)
        broadcast_update(data)

scanner = DebouncedScanner(WATCH_DIR, DEBOUNCE_SECONDS)

# Watchdog File System Event Handler
class DevQuestHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        # Ignore directory events and changes to temp files/output JSONs
        if event.is_directory:
            return
        # Only watch for markdown and image changes
        ext = os.path.splitext(event.src_path)[1].lower()
        if ext in ['.md', '.png', '.jpg', '.jpeg']:
            # Trigger debounce
            scanner.trigger()

# Start Watchdog
def start_watchdog():
    if not os.path.exists(WATCH_DIR):
        os.makedirs(WATCH_DIR, exist_ok=True)
        print(f"[WATCHER] Created watch directory: {WATCH_DIR}")

    event_handler = DevQuestHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_DIR, recursive=True)
    observer.start()
    print(f"[WATCHER] Started watching {WATCH_DIR}")
    return observer

observer = start_watchdog()

# WebSocket Endpoint
@sock.route('/ws')
def handle_ws(ws):
    print("[WS] Client connected")
    with clients_lock:
        active_clients.add(ws)
    
    # Send current data immediately on connection
    try:
        current_data = scan_directory(WATCH_DIR)
        ws.send(json.dumps({"event": "dashboard_update", "data": current_data}))
    except Exception as e:
        print(f"[WS] Error sending initial data: {e}")

    try:
        while True:
            # Keep-alive loop
            message = ws.receive(timeout=10)
            if message is None:
                break
    except Exception as e:
        pass
    finally:
        print("[WS] Client disconnected")
        with clients_lock:
            active_clients.discard(ws)

# API Endpoints
@app.route('/api/entries')
def get_entries():
    # Read from data.json or scan on demand
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_file = os.path.join(root_dir, "data.json")
    if os.path.exists(data_file):
        try:
            with open(data_file, "r", encoding="utf-8") as f:
                return jsonify(json.load(f))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        # Fallback to direct scan
        data = scan_directory(WATCH_DIR)
        save_data(data)
        return jsonify(data)

@app.route('/api/open-folder', methods=['POST'])
def open_folder():
    req_data = request.get_json() or {}
    folder_path = req_data.get("folderPath")
    if not folder_path:
        return jsonify({"error": "folderPath is required"}), 400

    abs_watch_dir = os.path.abspath(WATCH_DIR)
    abs_target_path = os.path.abspath(folder_path)

    # Security check: must be a child of WATCH_DIR
    if not abs_target_path.startswith(abs_watch_dir):
        return jsonify({"error": "Access denied: Path is outside the watched directory"}), 403

    if not os.path.exists(abs_target_path):
        return jsonify({"error": "Directory does not exist"}), 404

    try:
        os.startfile(abs_target_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Failed to open directory: {str(e)}"}), 500

@app.route('/api/entries/create', methods=['POST'])
def create_entry():
    category = request.form.get('category')  # 'proj', 'cert', 'item', 'achv'
    folder_name = request.form.get('folderName')  # directory name
    content = request.form.get('content')  # index.md contents

    if not category or not folder_name or not content:
        return jsonify({"error": "category, folderName, and content are required"}), 400

    import re
    # Sanitize category and folder name
    category = re.sub(r'[^a-zA-Z0-9_\-]', '', category)
    folder_name = re.sub(r'[^a-zA-Z0-9_\-]', '', folder_name)

    if category not in ["proj", "cert", "item", "achv"]:
        return jsonify({"error": "Invalid category"}), 400

    if not folder_name:
        return jsonify({"error": "Invalid folder name"}), 400

    # Resolve target path securely
    target_dir = os.path.abspath(os.path.join(WATCH_DIR, category, folder_name))
    abs_watch_dir = os.path.abspath(WATCH_DIR)

    # Security check: must be a child of WATCH_DIR
    if not target_dir.startswith(abs_watch_dir):
        return jsonify({"error": "Access denied: Path is outside the watched directory"}), 403

    os.makedirs(target_dir, exist_ok=True)

    # Save index.md
    md_file_path = os.path.join(target_dir, "index.md")
    try:
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        return jsonify({"error": f"Failed to save index.md: {str(e)}"}), 500

    # Save uploaded file if any
    uploaded_file = request.files.get('file')
    if uploaded_file and uploaded_file.filename:
        filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '', uploaded_file.filename)
        if filename:
            ext = os.path.splitext(filename)[1].lower()
            if ext in ['.png', '.jpg', '.jpeg', '.pdf']:
                file_path = os.path.join(target_dir, filename)
                try:
                    uploaded_file.save(file_path)
                except Exception as e:
                    return jsonify({"error": f"Failed to save uploaded file: {str(e)}"}), 500

    # Run scan to update database and broadcast WebSocket event
    try:
        data = scan_directory(WATCH_DIR)
        save_data(data)
        broadcast_update(data)
    except Exception as e:
        return jsonify({"error": f"Error updating database: {str(e)}"}), 500

    return jsonify({"success": True})

@app.route('/api/media/<category>/<entry_name>/<filename>')
def serve_media(category, entry_name, filename):
    safe_path = os.path.abspath(os.path.join(WATCH_DIR, category, entry_name))
    abs_watch_dir = os.path.abspath(WATCH_DIR)

    if not safe_path.startswith(abs_watch_dir):
        return "Access denied", 403

    return send_from_directory(safe_path, filename)

# SPA routing for frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    ssl_context = None
    if os.path.exists(CERT_PATH) and os.path.exists(KEY_PATH):
        ssl_context = (CERT_PATH, KEY_PATH)
        print(f"[SERVER] SSL Enabled. Server starting at https://localhost:{PORT}")
    else:
        print(f"[SERVER] Starting in HTTP mode at http://localhost:{PORT}")

    try:
        app.run(host='127.0.0.1', port=PORT, ssl_context=ssl_context, debug=False)
    finally:
        print("[SERVER] Shutting down watcher observer...")
        observer.stop()
        observer.join()
