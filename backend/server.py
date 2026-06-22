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

    # Handle folder moving/renaming if edit mode passed original coordinates
    original_category = request.form.get('originalCategory')
    original_folder_name = request.form.get('originalFolderName')

    if original_category and original_folder_name:
        orig_category_sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '', original_category)
        orig_folder_sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '', original_folder_name)
        
        old_dir = os.path.abspath(os.path.join(WATCH_DIR, orig_category_sanitized, orig_folder_sanitized))
        
        if old_dir.startswith(abs_watch_dir) and old_dir != abs_watch_dir and os.path.exists(old_dir):
            if old_dir != target_dir:
                import shutil
                if os.path.exists(target_dir):
                    try:
                        shutil.rmtree(target_dir)
                    except:
                        pass
                try:
                    os.makedirs(os.path.dirname(target_dir), exist_ok=True)
                    shutil.move(old_dir, target_dir)
                except Exception as e:
                    print(f"Error moving {old_dir} to {target_dir}: {e}")

    os.makedirs(target_dir, exist_ok=True)

    # Save index.md
    md_file_path = os.path.join(target_dir, "index.md")
    try:
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        return jsonify({"error": f"Failed to save index.md: {str(e)}"}), 500

    # 1. Delete requested files
    delete_files = request.form.getlist('deleteFiles')
    if os.path.exists(target_dir):
        for df in delete_files:
            df_sanitized = re.sub(r'[^a-zA-Z0-9_\-\.]', '', df)
            if df_sanitized and df_sanitized != "index.md":
                file_path = os.path.join(target_dir, df_sanitized)
                if os.path.isfile(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        print(f"Error deleting file {df_sanitized}: {e}")

    # 2. Get main thumbnail choice
    thumbnail_filename = request.form.get('thumbnailFilename')  # original filename of the chosen thumbnail

    # 3. Handle multiple uploaded files
    uploaded_files = request.files.getlist('files')
    for f in uploaded_files:
        if f and f.filename:
            orig_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '', f.filename)
            if not orig_filename or orig_filename == "index.md":
                continue
            ext = os.path.splitext(orig_filename)[1].lower()
            if ext in ['.png', '.jpg', '.jpeg', '.pdf']:
                # Determine target filename: if this file was selected as main thumbnail
                if orig_filename == thumbnail_filename:
                    save_name = f"thumbnail{ext}"
                    # First delete any existing thumbnail files to prevent duplicates
                    for name in ["thumbnail.png", "thumbnail.jpg", "thumbnail.jpeg", "thumbnail.pdf"]:
                        tp = os.path.join(target_dir, name)
                        if os.path.isfile(tp):
                            try:
                                os.remove(tp)
                            except:
                                pass
                else:
                    save_name = orig_filename
                
                file_path = os.path.join(target_dir, save_name)
                try:
                    f.save(file_path)
                except Exception as e:
                    return jsonify({"error": f"Failed to save file {orig_filename}: {str(e)}"}), 500

    # 4. Handle setting an existing file as main thumbnail
    if thumbnail_filename and os.path.exists(target_dir) and not any(f.filename == thumbnail_filename for f in uploaded_files):
        existing_sanitized = re.sub(r'[^a-zA-Z0-9_\-\.]', '', thumbnail_filename)
        ext = os.path.splitext(existing_sanitized)[1].lower()
        if ext in ['.png', '.jpg', '.jpeg', '.pdf']:
            old_path = os.path.join(target_dir, existing_sanitized)
            new_path = os.path.join(target_dir, f"thumbnail{ext}")
            if os.path.isfile(old_path) and existing_sanitized != f"thumbnail{ext}":
                # First delete any existing thumbnail files to prevent duplicates
                for name in ["thumbnail.png", "thumbnail.jpg", "thumbnail.jpeg", "thumbnail.pdf"]:
                    tp = os.path.join(target_dir, name)
                    if os.path.isfile(tp):
                        try:
                            os.remove(tp)
                        except:
                            pass
                try:
                    os.rename(old_path, new_path)
                except Exception as e:
                    print(f"Error renaming {existing_sanitized} to thumbnail{ext}: {e}")

    # Run scan to update database and broadcast WebSocket event
    try:
        data = scan_directory(WATCH_DIR)
        save_data(data)
        broadcast_update(data)
    except Exception as e:
        return jsonify({"error": f"Error updating database: {str(e)}"}), 500

    return jsonify({"success": True})

@app.route('/api/entries/delete', methods=['POST'])
def delete_entry():
    import shutil
    import re
    category = request.form.get('category')
    folder_name = request.form.get('folderName')

    if not category or not folder_name:
        return jsonify({"error": "Category and folderName are required"}), 400

    # Sanitize category and folder_name to prevent directory traversal
    category_sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '', category)
    folder_sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '', folder_name)

    if category_sanitized not in ["proj", "cert", "item", "achv"]:
        return jsonify({"error": "Invalid category"}), 400

    target_dir = os.path.abspath(os.path.join(WATCH_DIR, category_sanitized, folder_sanitized))
    abs_watch_dir = os.path.abspath(WATCH_DIR)

    if not target_dir.startswith(abs_watch_dir) or target_dir == abs_watch_dir:
        return jsonify({"error": "Access denied"}), 403

    if not os.path.exists(target_dir):
        return jsonify({"error": "Directory does not exist"}), 404

    try:
        shutil.rmtree(target_dir)
    except Exception as e:
        return jsonify({"error": f"Failed to delete directory: {str(e)}"}), 500

    # Run scan to update database and broadcast WebSocket event
    try:
        data = scan_directory(WATCH_DIR)
        save_data(data)
        broadcast_update(data)
    except Exception as e:
        return jsonify({"error": f"Error updating database: {str(e)}"}), 500

    return jsonify({"success": True})

@app.route('/api/entries/toggle-done', methods=['POST'])
def toggle_done():
    import re
    import frontmatter
    
    req_data = request.get_json() or {}
    card_id = req_data.get("id")
    done_val = req_data.get("done")
    
    if not card_id or done_val is None:
        return jsonify({"error": "id and done are required"}), 400
        
    # Extract category and entry_name from card_id (e.g., category_entryname)
    category = None
    for cat in ["proj", "cert", "item", "achv"]:
        if card_id.startswith(cat + "_"):
            category = cat
            entry_name = card_id[len(cat) + 1:]
            break
            
    if not category:
        return jsonify({"error": "Invalid card ID structure"}), 400
        
    entry_name_sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '', entry_name)
    target_dir = os.path.abspath(os.path.join(WATCH_DIR, category, entry_name_sanitized))
    abs_watch_dir = os.path.abspath(WATCH_DIR)
    
    # Security check: must be a child of WATCH_DIR
    if not target_dir.startswith(abs_watch_dir) or target_dir == abs_watch_dir:
        return jsonify({"error": "Access denied"}), 403
        
    md_file_path = os.path.join(target_dir, "index.md")
    if not os.path.exists(md_file_path):
        return jsonify({"error": "Entry index.md not found"}), 404
        
    try:
        # Load frontmatter
        with open(md_file_path, "r", encoding="utf-8") as f:
            post = frontmatter.load(f)
            
        # Update metadata field
        post.metadata["done"] = bool(done_val)
        
        # Save back
        content = frontmatter.dumps(post)
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write(content)
            
    except Exception as e:
        return jsonify({"error": f"Failed to update index.md: {str(e)}"}), 500
        
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
