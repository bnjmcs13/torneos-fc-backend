from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import string
import random
import secrets
import re
import socket
from werkzeug.security import generate_password_hash, check_password_hash

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
        
        # Enforce owner permissions
        owner = data.get('owner')
        if code in tournaments_db:
            existing_owner = tournaments_db[code].get('owner')
            if existing_owner and existing_owner != owner:
                return jsonify({"success": False, "message": "No tienes permiso para modificar este torneo (pertenece a otro usuario)"}), 403
                
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

PROFANITIES = {
    'puto', 'puta', 'mierda', 'pene', 'vagina', 'culiao', 'concha', 'weon', 'culon', 'culona', 
    'marica', 'maricon', 'hijodeputa', 'bastardo', 'zorra', 'chupala', 'pingo', 'verga', 
    'orto', 'caca', 'mamon', 'pajero', 'cabron', 'boludo', 'pelotudo', 'wea', 'qlo', 'qlio',
    'conchadesumadre', 'putito', 'putita', 'sapo', 'chupalo'
}

def is_profane(name):
    if not name:
        return False
    clean_name = ''.join(e for e in name if e.isalnum()).lower()
    for word in PROFANITIES:
        if word in clean_name or word in name.lower():
            return True
    return False

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email_existence(email):
    # 1. Format validation
    if not EMAIL_REGEX.match(email):
        return False, "El formato del correo electrónico es inválido ❌"
        
    # 2. Domain existence validation (checking DNS records)
    try:
        domain = email.split('@')[-1]
        socket.getaddrinfo(domain, None)
        return True, None
    except Exception:
        return False, "El correo electrónico no existe (dominio no existente o no resoluble) ❌"

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        username = data.get('username', '').strip()
        
        if not email or not password or not username:
            return jsonify({"success": False, "message": "Email, nombre de usuario y contraseña requeridos"}), 400
            
        # Validate email existence
        is_valid_email, email_error = validate_email_existence(email)
        if not is_valid_email:
            return jsonify({"success": False, "message": email_error}), 400
        
        if len(username) < 3 or len(username) > 20:
            return jsonify({"success": False, "message": "El nombre de usuario debe tener entre 3 y 20 caracteres"}), 400

        if is_profane(username):
            return jsonify({"success": False, "message": "El nombre de usuario contiene palabras obscenas prohibidas ❌"}), 400

        db = load_tournaments()
        if '_USERS_' not in db:
            db['_USERS_'] = {}
            
        if email in db['_USERS_']:
            return jsonify({"success": False, "message": "El correo electrónico ya está registrado"}), 400
            
        # Check if username is already taken
        for u_email, u_data in db['_USERS_'].items():
            if u_data.get('username', '').lower() == username.lower():
                return jsonify({"success": False, "message": "El nombre de usuario ya está en uso"}), 400

        db['_USERS_'][email] = {
            "username": username,
            "password": generate_password_hash(password),
            "reset_token": None
        }
        save_tournaments(db)
        return jsonify({"success": True, "message": "Usuario registrado con éxito"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        identifier = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not identifier or not password:
            return jsonify({"success": False, "message": "Identificador y contraseña requeridos"}), 400
            
        db = load_tournaments()
        users = db.get('_USERS_', {})
        
        matched_email = None
        matched_user = None
        
        # Check if matched directly with registered email key
        if identifier in users:
            matched_email = identifier
            matched_user = users[identifier]
        else:
            # Check if matched with username case-insensitively
            for u_email, u_data in users.items():
                if u_data.get('username', '').strip().lower() == identifier:
                    matched_email = u_email
                    matched_user = u_data
                    break
        
        if not matched_user or not check_password_hash(matched_user['password'], password):
            return jsonify({"success": False, "message": "Correo o contraseña incorrectos"}), 401
            
        return jsonify({
            "success": True, 
            "email": matched_email, 
            "username": matched_user.get('username', matched_email.split('@')[0]),
            "message": "Sesión iniciada correctamente"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"success": False, "message": "Email requerido"}), 400
            
        db = load_tournaments()
        users = db.get('_USERS_', {})
        
        if email not in users:
            return jsonify({
                "success": True, 
                "message": "Si el correo está registrado, se enviará un enlace de restauración."
            })
            
        # Generar token aleatorio
        token = secrets.token_hex(16)
        db['_USERS_'][email]['reset_token'] = token
        save_tournaments(db)
        
        # Enlace de simulación estético
        reset_link = f"{request.host_url}?reset_email={email}&reset_token={token}"
        print(f"\n==================================================")
        print(f"ENLACE SIMULADO DE RECUPERACIÓN PARA {email}:")
        print(f"-> {reset_link} <-")
        print(f"==================================================\n")
        
        return jsonify({
            "success": True,
            "message": "Se ha enviado un enlace de restauración.",
            "debug_reset_link": reset_link
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        
        if not email or not token or not new_password:
            return jsonify({"success": False, "message": "Datos incompletos"}), 400
            
        db = load_tournaments()
        users = db.get('_USERS_', {})
        
        if email not in users or users[email].get('reset_token') != token:
            return jsonify({"success": False, "message": "Token de restauración inválido o expirado"}), 400
            
        # Actualizar contraseña
        db['_USERS_'][email]['password'] = generate_password_hash(new_password)
        db['_USERS_'][email]['reset_token'] = None
        save_tournaments(db)
        
        return jsonify({"success": True, "message": "Contraseña restablecida con éxito"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


def run_app(port):
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    run_app(port)