import os
import threading
import subprocess
import urllib.request
import re
import http.server
import socketserver

PORT = 8000

def start_server():
    from app import run_app
    print(f"Servidor local (Flask) sirviendo en puerto {PORT}")
    run_app(PORT)

def start_tunnel():
    EXE_PATH = "cloudflared.exe"
    URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    
    if not os.path.exists(EXE_PATH):
        print("\nDescargando herramienta para compartir en internet... (solo la primera vez)")
        urllib.request.urlretrieve(URL, EXE_PATH)

    print("\nGenerando enlace público seguro (HTTPS) para PWA...")
    process = subprocess.Popen([EXE_PATH, "tunnel", "--url", f"http://127.0.0.1:{PORT}"],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               universal_newlines=True, encoding='utf-8', errors='ignore')
    for line in iter(process.stderr.readline, ''):
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
        if match:
            url = match.group(0)
            print("\n" + "============================================================")
            print(">>> ¡LISTO! ABRE ESTE ENLACE EN TU CELULAR: <<<")
            print(f"->  {url}  <-")
            print("(ES SEGURO [HTTPS], ASÍ QUE PODRÁS INSTALAR LA PWA)")
            print("============================================================\n")

if __name__ == '__main__':
    # Ejecutamos ambos en hilos separados
    threading.Thread(target=start_server, daemon=True).start()
    start_tunnel()
    
    # Mantener el script corriendo
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\nApagando servidor...")
