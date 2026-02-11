#!/usr/bin/env node

/**
 * CamBridge Development Server
 * Serves static files + Express API on same port
 * Usage: node server.js
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const result = dotenv.config({ path: path.join(__dirname, '.env.local') });

if (result.error) {
  console.error('❌ Failed to load .env.local:', result.error.message);
  process.exit(1);
}

console.log('✓ Environment variables loaded from .env.local');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Not set');
console.log('  BETA_MODE:', process.env.BETA_MODE ? '✓ Set' : '✗ Not set');

// Start server in async IIFE to support dynamic imports
(async () => {
  console.log('📦 Starting module imports...');
  
  let passwordRegisterHandler, passwordLoginHandler, creatorPublicInfoHandler;
  
  try {
    console.log('  Importing password-register handler...');
    try {
      const mod = await import('./api/auth/password-register.js');
      passwordRegisterHandler = mod.default;
      console.log('    ✓ password-register loaded');
    } catch (e) {
      console.error('    ✗ Failed to load password-register:', e.message);
      throw e;
    }
    
    console.log('  Importing password-login handler...');
    try {
      const mod = await import('./api/auth/password-login.js');
      passwordLoginHandler = mod.default;
      console.log('    ✓ password-login loaded');
    } catch (e) {
      console.error('    ✗ Failed to load password-login:', e.message);
      throw e;
    }
    
    console.log('  Importing creator public-info handler...');
    try {
      const mod = await import('./api/creator/public-info.js');
      creatorPublicInfoHandler = mod.default;
      console.log('    ✓ public-info loaded');
    } catch (e) {
      console.error('    ✗ Failed to load public-info:', e.message);
      throw e;
    }
    
    console.log('✓ All handlers loaded successfully\n');
    
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware
    app.use(express.json());
    app.use(express.static(path.join(__dirname)));
    app.use(express.static(path.join(__dirname, 'public')));

    // API Routes
    app.post('/api/auth/password-register', (req, res) => passwordRegisterHandler(req, res));
    app.post('/api/auth/password-login', (req, res) => passwordLoginHandler(req, res));
    app.get('/api/creator/public-info', (req, res) => creatorPublicInfoHandler(req, res));

    // Serve index.html for SPA routes
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 CamBridge Development Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✓ HTTP Server: http://localhost:${PORT}`);
      console.log(`✓ API: http://localhost:${PORT}/api/`);
      console.log(`✓ Static Files: Served from root + /public`);
      console.log(`✓ BETA_MODE: ${process.env.BETA_MODE === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`\n📍 Quick Links:`);
      console.log(`  - Home: http://localhost:${PORT}`);
      console.log(`  - Creator Login: http://localhost:${PORT}/public/pages/creator-login.html`);
      console.log(`  - Creator Signup: http://localhost:${PORT}/public/pages/creator-signup.html`);
      console.log(`\n💡 Test Credentials:`);
      console.log(`  - Email: test@cambridge.app`);
      console.log(`  - Password: TestPassword123!`);
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
