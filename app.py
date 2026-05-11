from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import string
import random

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

import urllib.request
import json

BLOB_ID = '019e14d1-c92a-716c-ba55-d4e712864ea1'
BLOB_URL = f'https://jsonblob.com/api/jsonBlob/{BLOB_ID}'

def load_tournaments():
    try:
        req = urllib.request.Request(BLOB_URL, headers={'Accept': 'application/json'}, method='GET')
        res = urllib.request.urlopen(req)
        return json.loads(res.read().decode('utf-8'))
    except Exception:
        return {}

def save_tournaments(data):
    try:
        req = urllib.request.Request(BLOB_URL, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
        urllib.request.urlopen(req)
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