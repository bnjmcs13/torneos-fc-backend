import re

keywords = ["unirse", "join", "shareCode", "codigo", "código", "/api/tournaments", "cargarTorneo", "buscarTorneo"]
filename = r"c:\Users\benja\Downloads\torneos-fc\app.js"

with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    for kw in keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', line, re.IGNORECASE) or kw in line:
            print(f"Line {i+1}: {line.strip()}")
            break
