const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Définir les headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Chemin du fichier (ignorer la query string)
  const urlWithoutQuery = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlWithoutQuery);
  
  // Si c'est un dossier, servir index.html
  if (req.url === '/') {
    filePath = path.join(__dirname, 'institution-login.html');
  }

  // Éviter les traversées de répertoire
  if (!filePath.startsWith(path.join(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Lire le fichier
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Server Error');
      }
    } else {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🚀 OGOUÉ Frontend Server                    ║
╚════════════════════════════════════════════════════════════════╝

✅ Frontend running on: http://localhost:${PORT}

📝 Pages disponibles:
   - Login Institution:     http://localhost:${PORT}/institution-login.html
   - Register Institution:  http://localhost:${PORT}/institution-register.html
   - Create Product:        http://localhost:${PORT}/institution-creation-produit.html
   - Dashboard Institution: http://localhost:${PORT}/institution-tableau-bord.html
   - Dashboard PME:         http://localhost:${PORT}/pme-tableau-bord-dossiers.html

🔗 Backend (API):          http://localhost:3001

⚠️  Assurez-vous que le backend est en cours d'exécution sur le port 3001

Appuyez sur Ctrl+C pour arrêter le serveur
`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} est déjà utilisé. Essayez un autre port.`);
  } else {
    console.error('Server error:', err);
  }
});
