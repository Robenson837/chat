import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

// Suppress specific deprecation warning from http-proxy-middleware
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return;
  }
  if (warning && warning.name === 'DeprecationWarning' && warning.code === 'DEP0060') {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Enable trust proxy for proper IP forwarding
app.set('trust proxy', true);

// Add CORS headers for external access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

console.log('🚀 Starting Vigi Development Proxy on port 3000...');

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'info',
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error('❌ Backend proxy error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Backend service unavailable' });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);
  }
}));

// Proxy uploads to backend
app.use('/uploads', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'info'
}));

// Proxy Socket.io to backend with better error handling
app.use('/socket.io', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true,
  logLevel: 'info',
  timeout: 60000,
  proxyTimeout: 60000,
  onError: (err, req, res) => {
    console.error('❌ Socket.io proxy error:', err.message);
    if (res && !res.headersSent) {
      res.status(500).json({ error: 'WebSocket connection failed' });
    }
  },
  onProxyReqWs: (proxyReq, req, socket) => {
    socket.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Vigi Development Proxy',
    timestamp: new Date().toISOString(),
    backend: 'http://localhost:3001',
    frontend: 'http://localhost:5173'
  });
});

// Proxy everything else to Vite dev server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true,
  logLevel: 'info',
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error('❌ Frontend proxy error:', err.message);
    if (!res.headersSent) {
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>🚫 Frontend Service Unavailable</h1>
            <p>Make sure the frontend dev server is running on port 5173</p>
            <p>Run: <code>cd frontend && npm run dev</code></p>
            <button onclick="location.reload()">🔄 Retry</button>
          </body>
        </html>
      `);
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);
  }
}));

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Vigi Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Backend API: http://0.0.0.0:${PORT}/api`);
  console.log(`🌐 Frontend: http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/socket.io`);
  console.log(`📁 Uploads: http://0.0.0.0:${PORT}/uploads`);
  console.log(`❤️ Health: http://0.0.0.0:${PORT}/health`);
  console.log('');
  console.log('🎯 All services accessible through port 3000!');
  console.log(`🌍 External access: http://${await getLocalIP()}:${PORT}`);
});

async function getLocalIP() {
  const { networkInterfaces } = await import('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}