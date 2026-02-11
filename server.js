#!/usr/bin/env node

/**
 * CamBridge Development Server - Minimal Version
 * Serves static files + Express API on same port
 * Usage: node server.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env.local, but don't fail if it doesn't exist
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('✓ Environment check:');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Using default');
console.log('  DB:', process.env.POSTGRES_URL ? '✓ Connected' : '⚠ Mock mode');

// Start server in async IIFE to support dynamic imports
(async () => {
  console.log('📦 Starting module imports...');
  
  let registerHandler, loginHandler, meHandler, createRoomHandler, joinRequestHandler, approveHandler, joinStatusHandler, initDbHandler, logoutHandler, forgotPasswordHandler;
  
  try {
    // Import all handlers
    registerHandler = (await import('./api/register.js')).default;
    loginHandler = (await import('./api/login.js')).default;
    meHandler = (await import('./api/me.js')).default;
    createRoomHandler = (await import('./api/create-room.js')).default;
    joinRequestHandler = (await import('./api/join-request.js')).default;
    approveHandler = (await import('./api/approve.js')).default;
    joinStatusHandler = (await import('./api/join-status.js')).default;
    initDbHandler = (await import('./api/init-db.js')).default;
    logoutHandler = (await import('./api/logout.js')).default;
    forgotPasswordHandler = (await import('./api/forgot-password.js')).default;
    
    console.log('✓ All handlers loaded successfully\n');
    
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware
    app.use(express.json());
    
    // Serve static files from specific directories only (not entire repo root)
    app.use('/assets', express.static(path.join(__dirname, 'assets')));
    app.use('/styles', express.static(path.join(__dirname, 'styles')));
    app.use('/public', express.static(path.join(__dirname, 'public')));
    
    // Serve HTML files from root (index.html, app.html, etc.)
    app.use(express.static(path.join(__dirname), {
      index: false, // Don't auto-serve index.html
      dotfiles: 'deny', // Deny access to dotfiles
      extensions: ['html'] // Only serve HTML files
    }));

    // API Routes
    app.post('/api/register', (req, res) => registerHandler(req, res));
    app.post('/api/login', (req, res) => loginHandler(req, res));
    app.get('/api/me', (req, res) => meHandler(req, res));
    app.post('/api/logout', (req, res) => logoutHandler(req, res));
    app.post('/api/forgot-password', (req, res) => forgotPasswordHandler(req, res));
    app.post('/api/create-room', (req, res) => createRoomHandler(req, res));
    app.post('/api/join-request', (req, res) => joinRequestHandler(req, res));
    app.post('/api/approve', (req, res) => approveHandler(req, res));
    app.get('/api/join-status', (req, res) => joinStatusHandler(req, res));
    app.get('/api/init-db', (req, res) => initDbHandler(req, res));
    app.post('/api/init-db', (req, res) => initDbHandler(req, res));

    // Serve index.html for root
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Serve room.html for /room/* routes
    app.get('/room/:slug', (req, res) => {
      res.sendFile(path.join(__dirname, 'room.html'));
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 CamBridge Development Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✓ HTTP Server: http://localhost:${PORT}`);
      console.log(`✓ API: http://localhost:${PORT}/api/`);
      console.log(`\n📍 Quick Links:`);
      console.log(`  - Home: http://localhost:${PORT}`);
      console.log(`  - App: http://localhost:${PORT}/app.html`);
      console.log(`  - Init DB: http://localhost:${PORT}/api/init-db`);
      console.log(`\n✅ Ready to accept requests...\n`);
    });

    process.on('SIGINT', () => {
      console.log('\n\n👋 Server stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
