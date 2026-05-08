from flask import Flask, send_from_directory, request, jsonify
import os
import string
import random

app = Flask(__name__, static_folder='.', static_url_path='')

import json

DATA_FILE = 'torneos.json'

def load_tournaments():
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_tournaments(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

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
    port = int(os.environ.get("PORT", 8000))
    run_app(port)