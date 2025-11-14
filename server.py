import http.server
import socketserver
import os
from urllib.parse import unquote

PORT = 5000
DIRECTORY = "."

class GameServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    
    def guess_type(self, path):
        mimetype = super().guess_type(path)
        
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.mjs'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html'):
            return 'text/html'
        elif path.endswith('.json'):
            return 'application/json'
        
        return mimetype
    
    def do_GET(self):
        path = unquote(self.path.split('?')[0])
        
        if path.endswith('/'):
            path += 'index.html'
        
        return super().do_GET()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

print(f"🎮 Iniciando Arcade 3D Pro Server...")
print(f"📂 Directorio: {os.path.abspath(DIRECTORY)}")
print(f"🌐 Puerto: {PORT}")
print(f"✅ Servidor listo en http://0.0.0.0:{PORT}/")
print(f"\n🎯 Juegos disponibles:")
print(f"  - Space Shooter: http://0.0.0.0:{PORT}/games/space-shooter/")
print(f"  - Runner 3D: http://0.0.0.0:{PORT}/games/runner-3d/")
print(f"  - Cube Jumper: http://0.0.0.0:{PORT}/games/cube-jumper/")
print(f"  - Racing 3D: http://0.0.0.0:{PORT}/games/racing/")

with ReusableTCPServer(("0.0.0.0", PORT), GameServerHandler) as httpd:
    httpd.serve_forever()
