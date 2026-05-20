from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import string
import random

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

import urllib.request
import urllib.error
import json

CONFIG_FILE = 'blob_config.json'
LOCAL_DB = 'torneos.json'
DEFAULT_BLOB_ID = '019e14d1-c92a-716c-ba55-d4e712864ea1'

def get_blob_id():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                cfg = json.load(f)
                return cfg.get('blob_id', DEFAULT_BLOB_ID)
        except Exception:
            pass
    return DEFAULT_BLOB_ID

def save_blob_id(blob_id):
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump({'blob_id': blob_id}, f)
    except Exception as e:
        print("Error saving blob config:", e)

def load_local_db():
    if os.path.exists(LOCAL_DB):
        try:
            with open(LOCAL_DB, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print("Error loading local torneos.json:", e)
    return {}

def save_local_db(data):
    try:
        with open(LOCAL_DB, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print("Error saving to local torneos.json:", e)

def create_new_blob(data):
    try:
        req = urllib.request.Request(
            'https://jsonblob.com/api/jsonBlob',
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            method='POST'
        )
        res = urllib.request.urlopen(req)
        location = res.getheader('Location')
        new_id = location.split('/')[-1]
        save_blob_id(new_id)
        print(f"Self-healed: Created new JSONBlob with ID: {new_id}")
        return new_id
    except Exception as e:
        print("Error creating new JSONBlob during self-heal:", e)
        return None

def load_tournaments():
    blob_id = get_blob_id()
    blob_url = f'https://jsonblob.com/api/jsonBlob/{blob_id}'
    
    try:
        req = urllib.request.Request(blob_url, headers={'Accept': 'application/json'}, method='GET')
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode('utf-8'))
        # Sync with local backup
        local_data = load_local_db()
        merged = {**local_data, **data}
        if merged != local_data:
            save_local_db(merged)
        return merged
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"Blob ID {blob_id} not found (404). Initiating self-heal...")
            local_data = load_local_db()
            new_id = create_new_blob(local_data)
            if new_id:
                return local_data
        print(f"HTTP Error loading from JSONBlob ({e.code}): {e}")
        return load_local_db()
    except Exception as e:
        print("Exception loading from JSONBlob, falling back to local DB:", e)
        return load_local_db()

def save_tournaments(data):
    # Always save locally first
    save_local_db(data)
    
    blob_id = get_blob_id()
    blob_url = f'https://jsonblob.com/api/jsonBlob/{blob_id}'
    
    try:
        req = urllib.request.Request(
            blob_url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            method='PUT'
        )
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"Blob ID {blob_id} not found (404) during PUT. Creating new blob...")
            create_new_blob(data)
        else:
            print("HTTP Error saving to JSONBlob:", e)
    except Exception as e:
        print("Error saving to JSONBlob:", e)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/tournaments', methods=['POST'])
def save_tournament():
    try:
        data = request.json
        tournaments_db = load_tournaments()
        
        if 'shareCode' not in data or not data['shareCode']:
            while True:
                code = 'FC-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
                if code not in tournaments_db:
                    data['shareCode'] = code
                    break
        
        code = data['shareCode']
        tournaments_db[code] = data
        save_tournaments(tournaments_db)
        
        return jsonify({"success": True, "shareCode": code})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/tournaments/<code>', methods=['GET'])
def get_tournament(code):
    tournaments_db = load_tournaments()
    code = code.upper()
    if code in tournaments_db:
        return jsonify({"success": True, "tournament": tournaments_db[code]})
    return jsonify({"success": False, "message": "Torneo no encontrado"}), 404

def run_app(port):
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    run_app(port)