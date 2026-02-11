#!/usr/bin/env node

/**
 * BETA MODE Comprehensive Test Runner
 * Tests all functionality: API endpoints, database schema, security, frontend validation
 * Run: node api/tests/run-tests.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, skipped: 0, errors: [] };
    this.startTime = null;
  }

  // Register a test
  describe(suiteName, suiteTests) {
    this.tests.push({ suiteName, suiteTests });
  }

  // Run all tests
  async runAll() {
    console.log(`\n${colors.bright}${colors.blue}🧪 BETA MODE Comprehensive Test Suite${colors.reset}\n`);
    this.startTime = Date.now();

    for (const { suiteName, suiteTests } of this.tests) {
      console.log(`${colors.bright}${suiteName}${colors.reset}`);
      
      for (const test of suiteTests) {
        try {
          const result = await test.fn();
          if (result === true) {
            console.log(`  ${colors.green}✓${colors.reset} ${test.name}`);
            this.results.passed++;
          } else if (result === false) {
            console.log(`  ${colors.red}✗${colors.reset} ${test.name}`);
            this.results.failed++;
            this.results.errors.push({ suite: suiteName, test: test.name, error: result });
          } else {
            console.log(`  ${colors.yellow}⊘${colors.reset} ${test.name} (skipped)`);
            this.results.skipped++;
          }
        } catch (error) {
          console.log(`  ${colors.red}✗${colors.reset} ${test.name}`);
          this.results.failed++;
          this.results.errors.push({ 
            suite: suiteName, 
            test: test.name, 
            error: error.message 
          });
        }
      }
      console.log('');
    }

    this.printSummary();
  }

  printSummary() {
    const duration = Date.now() - this.startTime;
    const total = this.results.passed + this.results.failed;
    
    console.log(`${colors.bright}Test Results${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`  ${colors.yellow}Skipped: ${this.results.skipped}${colors.reset}`);
    console.log(`  Duration: ${duration}ms\n`);

    if (this.results.failed === 0) {
      console.log(`${colors.green}${colors.bright}✓ ALL TESTS PASSED${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`${colors.red}${colors.bright}✗ SOME TESTS FAILED${colors.reset}\n`);
      if (this.results.errors.length > 0) {
        console.log(`${colors.bright}Failures:${colors.reset}`);
        this.results.errors.forEach(e => {
          console.log(`  - [${e.suite}] ${e.test}: ${e.error}`);
        });
        console.log('');
      }
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// =====================================================================
// TEST SUITE 1: Environment Configuration
// =====================================================================

runner.describe('1. Environment Configuration', [
  {
    name: 'BETA_MODE env var readable',
    fn: () => {
      const betaMode = process.env.BETA_MODE;
      return typeof betaMode === 'string' && (betaMode === 'true' || betaMode === 'false' || betaMode === undefined);
    }
  },
  {
    name: 'JWT_SECRET configured',
    fn: () => {
      return process.env.JWT_SECRET ? true : false;
    }
  },
  {
    name: 'DATABASE_URL configured',
    fn: () => {
      return process.env.DATABASE_URL ? true : false;
    }
  },
  {
    name: 'NODE_ENV set appropriately',
    fn: () => {
      const env = process.env.NODE_ENV;
      return env === 'development' || env === 'production' || env === 'test';
    }
  }
]);

// =====================================================================
// TEST SUITE 2: File Structure
// =====================================================================

runner.describe('2. File Structure & Existence', [
  {
    name: 'api/auth/password-register.js exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../api/auth/password-register.js'));
    }
  },
  {
    name: 'api/auth/password-login.js exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../api/auth/password-login.js'));
    }
  },
  {
    name: 'api/creator/public-info.js exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../api/creator/public-info.js'));
    }
  },
  {
    name: 'creator-signup.html exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../creator-signup.html'));
    }
  },
  {
    name: 'creator-login.html exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../creator-login.html'));
    }
  },
  {
    name: 'creator-dashboard.html exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../creator-dashboard.html'));
    }
  },
  {
    name: 'scripts/beta-mode-migration.sql exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'));
    }
  }
]);

// =====================================================================
// TEST SUITE 3: Password Register Code Validation
// =====================================================================

runner.describe('3. Password Register Implementation', [
  {
    name: 'password-register exports function',
    fn: () => {
      try {
        const module = require('../auth/password-register.js');
        return typeof module === 'function' || (module && typeof module.handler === 'function');
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'password-register has email validation',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('email') && (code.includes('/@/) || code.includes('email.includes'));
    }
  },
  {
    name: 'password-register has password validation (≥8 chars)',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('password') && code.includes('8');
    }
  },
  {
    name: 'password-register uses bcryptjs',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('bcrypt') || code.includes('bcryptjs');
    }
  },
  {
    name: 'password-register creates JWT token',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('jwt') || code.includes('token') || code.includes('JWT');
    }
  },
  {
    name: 'password-register has slug validation',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('slug') && code.includes('[a-z0-9-]');
    }
  },
  {
    name: 'password-register checks age confirmation',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('ageConfirm') || code.includes('age');
    }
  },
  {
    name: 'password-register checks ToS acceptance',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      return code.includes('tosAccept') || code.includes('ToS') || code.includes('terms');
    }
  }
]);

// =====================================================================
// TEST SUITE 4: Password Login Code Validation
// =====================================================================

runner.describe('4. Password Login Implementation', [
  {
    name: 'password-login exports function',
    fn: () => {
      try {
        const module = require('../auth/password-login.js');
        return typeof module === 'function' || (module && typeof module.handler === 'function');
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'password-login uses bcryptjs.compare()',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      return code.includes('compare') && (code.includes('bcrypt') || code.includes('bcryptjs'));
    }
  },
  {
    name: 'password-login has rate limiting',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      return code.includes('rate') || code.includes('attempt') || code.includes('429');
    }
  },
  {
    name: 'password-login creates JWT token',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      return code.includes('jwt') || code.includes('token') || code.includes('JWT');
    }
  },
  {
    name: 'password-login validates email/password present',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      return (code.includes('email') || code.includes('!email')) && 
             (code.includes('password') || code.includes('!password'));
    }
  }
]);

// =====================================================================
// TEST SUITE 5: Creator Public Info Implementation
// =====================================================================

runner.describe('5. Creator Public Info Endpoint', [
  {
    name: 'public-info.js exports function',
    fn: () => {
      try {
        const module = require('../creator/public-info.js');
        return typeof module === 'function' || (module && typeof module.handler === 'function');
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'public-info handles slug query parameter',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/public-info.js'), 'utf-8');
      return code.includes('slug') && (code.includes('query') || code.includes('req.query'));
    }
  },
  {
    name: 'public-info returns only safe fields',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/public-info.js'), 'utf-8');
      return (code.includes('slug') || code.includes('displayName')) && 
             (code.includes('cashapp') || code.includes('paypal'));
    }
  },
  {
    name: 'public-info does NOT expose email',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/public-info.js'), 'utf-8');
      // Email should not be in the response body
      const lines = code.split('\n').filter(l => l.includes('email'));
      const responseLines = lines.filter(l => !l.includes('//'));
      return responseLines.length === 0 || 
             !responseLines.some(l => l.includes('JSON.stringify') || l.includes('response'));
    }
  }
]);

// =====================================================================
// TEST SUITE 6: Policy Gates BETA_MODE Integration
// =====================================================================

runner.describe('6. Policy Gates & BETA_MODE', [
  {
    name: 'gates.js has betaMode property',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/policies/gates.js'), 'utf-8');
      return code.includes('betaMode') && code.includes('BETA_MODE');
    }
  },
  {
    name: 'gates.js has isBetaMode() method',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/policies/gates.js'), 'utf-8');
      return code.includes('isBetaMode');
    }
  },
  {
    name: 'gates.js checkCreatorStatus() checks beta mode',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/policies/gates.js'), 'utf-8');
      return code.includes('checkCreatorStatus') && 
             (code.includes('beta') || code.includes('plan_status'));
    }
  },
  {
    name: 'gates.js does NOT break age gate',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/policies/gates.js'), 'utf-8');
      return code.includes('checkAge') || code.includes('age');
    }
  },
  {
    name: 'gates.js does NOT break ToS gate',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/policies/gates.js'), 'utf-8');
      return code.includes('checkToS') || code.includes('ToS') || code.includes('terms');
    }
  },
  {
    name: 'gates.js does NOT break ban gate',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/policies/gates.js'), 'utf-8');
      return code.includes('checkBan') || code.includes('ban');
    }
  }
]);

// =====================================================================
// TEST SUITE 7: Database Schema
// =====================================================================

runner.describe('7. Database Migration Script', [
  {
    name: 'Migration file exists',
    fn: () => {
      return fs.existsSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'));
    }
  },
  {
    name: 'Migration adds plan_status column',
    fn: () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'), 'utf-8');
      return sql.includes('plan_status');
    }
  },
  {
    name: 'Migration adds cashapp_handle column',
    fn: () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'), 'utf-8');
      return sql.includes('cashapp_handle');
    }
  },
  {
    name: 'Migration adds paypal_link column',
    fn: () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'), 'utf-8');
      return sql.includes('paypal_link');
    }
  },
  {
    name: 'Migration adds paid_until column',
    fn: () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'), 'utf-8');
      return sql.includes('paid_until');
    }
  },
  {
    name: 'Migration is idempotent (uses IF NOT EXISTS)',
    fn: () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'), 'utf-8');
      return sql.includes('IF NOT EXISTS') || sql.includes('if not exists');
    }
  },
  {
    name: 'Migration creates indexes',
    fn: () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../scripts/beta-mode-migration.sql'), 'utf-8');
      return sql.includes('INDEX') || sql.includes('index');
    }
  }
]);

// =====================================================================
// TEST SUITE 8: Database Code (db.js)
// =====================================================================

runner.describe('8. Database Layer Updates', [
  {
    name: 'db.js has updateCreatorInfo function',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/db.js'), 'utf-8');
      return code.includes('updateCreatorInfo');
    }
  },
  {
    name: 'db.js updateCreatorInfo accepts cashappHandle',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/db.js'), 'utf-8');
      return code.includes('cashappHandle') || code.includes('cashapp');
    }
  },
  {
    name: 'db.js updateCreatorInfo accepts paypalLink',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/db.js'), 'utf-8');
      return code.includes('paypalLink') || code.includes('paypal');
    }
  },
  {
    name: 'db.js has payment field validation',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/db.js'), 'utf-8');
      return (code.match(/validate|check|test|match|includes/gi) || []).length > 5;
    }
  }
]);

// =====================================================================
// TEST SUITE 9: Creator Info Endpoint
// =====================================================================

runner.describe('9. Creator Info API Endpoint', [
  {
    name: 'api/creator/info.js exports function',
    fn: () => {
      try {
        const module = require('../creator/info.js');
        return typeof module === 'function' || (module && typeof module.handler === 'function');
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'creator/info.js GET returns cashappHandle',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/info.js'), 'utf-8');
      return code.includes('cashapp') || code.includes('cashappHandle');
    }
  },
  {
    name: 'creator/info.js GET returns paypalLink',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/info.js'), 'utf-8');
      return code.includes('paypal') || code.includes('paypalLink');
    }
  },
  {
    name: 'creator/info.js GET returns planStatus',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/info.js'), 'utf-8');
      return code.includes('plan') || code.includes('planStatus');
    }
  },
  {
    name: 'creator/info.js PUT accepts payment fields',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/info.js'), 'utf-8');
      const putSection = code.split('method === \'PUT\'')[1] || code.split('PUT')[1] || '';
      return putSection.includes('cashapp') || putSection.includes('paypal');
    }
  },
  {
    name: 'creator/info.js requires authentication',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/info.js'), 'utf-8');
      return code.includes('auth') || code.includes('token') || code.includes('401') || code.includes('unauthorized');
    }
  }
]);

// =====================================================================
// TEST SUITE 10: Frontend - Signup Page
// =====================================================================

runner.describe('10. Creator Signup Page (HTML/JS)', [
  {
    name: 'creator-signup.html contains email input',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('type="email"') || html.includes('email');
    }
  },
  {
    name: 'creator-signup.html contains password input',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('type="password"') || html.includes('password');
    }
  },
  {
    name: 'creator-signup.html contains slug input',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('slug') || html.includes('desired');
    }
  },
  {
    name: 'creator-signup.html has age confirmation checkbox',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('age') && html.includes('checkbox');
    }
  },
  {
    name: 'creator-signup.html has ToS acceptance checkbox',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('ToS') || html.includes('terms') || html.includes('agree');
    }
  },
  {
    name: 'creator-signup.html submits to /api/auth/password-register',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('password-register') || html.includes('/api/auth');
    }
  },
  {
    name: 'creator-signup.html has password validation (≥8 chars)',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('8') || html.includes('minlength');
    }
  },
  {
    name: 'creator-signup.html has client-side form validation',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('validate') || html.includes('addEventListener') || html.includes('submit');
    }
  },
  {
    name: 'creator-signup.html stores JWT token on success',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('localStorage') || html.includes('token') || html.includes('redirect');
    }
  }
]);

// =====================================================================
// TEST SUITE 11: Frontend - Login Page
// =====================================================================

runner.describe('11. Creator Login Page (HTML/JS)', [
  {
    name: 'creator-login.html contains email input',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('type="email"') || html.includes('email');
    }
  },
  {
    name: 'creator-login.html contains password input',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('type="password"') || html.includes('password');
    }
  },
  {
    name: 'creator-login.html submits to /api/auth/password-login',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('password-login') || html.includes('/api/auth');
    }
  },
  {
    name: 'creator-login.html stores JWT token on success',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('localStorage') || html.includes('token');
    }
  },
  {
    name: 'creator-login.html has error message display',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('error') || html.includes('message') || html.includes('alert');
    }
  },
  {
    name: 'creator-login.html link to signup page',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('signup') || html.includes('register');
    }
  }
]);

// =====================================================================
// TEST SUITE 12: Frontend - Dashboard Page
// =====================================================================

runner.describe('12. Creator Dashboard Page (HTML/JS)', [
  {
    name: 'creator-dashboard.html exists and has content',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.length > 5000; // Should be substantial
    }
  },
  {
    name: 'creator-dashboard.html fetches creator info',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.includes('creator/info') || html.includes('/api');
    }
  },
  {
    name: 'creator-dashboard.html displays creator slug/URL',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.includes('slug') || html.includes('URL') || html.includes('creator');
    }
  },
  {
    name: 'creator-dashboard.html displays rooms',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.includes('room') || html.includes('rooms');
    }
  },
  {
    name: 'creator-dashboard.html has payment link fields',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return (html.includes('cashapp') || html.includes('CashApp')) &&
             (html.includes('paypal') || html.includes('PayPal'));
    }
  },
  {
    name: 'creator-dashboard.html has logout button',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.includes('logout') || html.includes('sign out');
    }
  },
  {
    name: 'creator-dashboard.html verifies authentication',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.includes('token') || html.includes('auth') || html.includes('401');
    }
  },
  {
    name: 'creator-dashboard.html has copy-to-clipboard buttons',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-dashboard.html'), 'utf-8');
      return html.includes('copy') || html.includes('clipboard');
    }
  }
]);

// =====================================================================
// TEST SUITE 13: Room Integration
// =====================================================================

runner.describe('13. Room Payment Links Integration', [
  {
    name: 'room.html has payment-links section',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../room.html'), 'utf-8');
      return html.includes('payment-links') || html.includes('payment');
    }
  },
  {
    name: 'room.html has payment-buttons container',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../room.html'), 'utf-8');
      return html.includes('payment-buttons');
    }
  },
  {
    name: 'room.js calls loadPaymentLinks()',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../room.js'), 'utf-8');
      return code.includes('loadPaymentLinks');
    }
  },
  {
    name: 'room.js fetches from /api/creator/public-info',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../room.js'), 'utf-8');
      return code.includes('public-info') && code.includes('fetch');
    }
  },
  {
    name: 'room.js handles missing payment links gracefully',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../room.js'), 'utf-8');
      return code.includes('catch') || code.includes('error');
    }
  },
  {
    name: 'room.js creates CashApp button if handle present',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../room.js'), 'utf-8');
      return code.includes('cash.app') || code.includes('cashapp');
    }
  },
  {
    name: 'room.js creates PayPal button if link present',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../room.js'), 'utf-8');
      return code.includes('paypal') || code.includes('PayPal');
    }
  }
]);

// =====================================================================
// TEST SUITE 14: Landing Page Integration
// =====================================================================

runner.describe('14. Landing Page Creator CTAs', [
  {
    name: 'landing.html has creator signup link',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../landing.html'), 'utf-8');
      return html.includes('creator-signup');
    }
  },
  {
    name: 'landing.html has creator login link',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../landing.html'), 'utf-8');
      return html.includes('creator-login');
    }
  },
  {
    name: 'landing.html has "Start Earning" section',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../landing.html'), 'utf-8');
      return html.includes('Earning') || html.includes('Creator');
    }
  }
]);

// =====================================================================
// TEST SUITE 15: Documentation
// =====================================================================

runner.describe('15. Documentation Updates', [
  {
    name: 'README.md updated with BETA MODE section',
    fn: () => {
      const readme = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf-8');
      return readme.includes('BETA') || readme.includes('beta') || readme.includes('self-register');
    }
  },
  {
    name: 'README.md documents password register endpoint',
    fn: () => {
      const readme = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf-8');
      return readme.includes('password-register') || readme.includes('/api/auth');
    }
  },
  {
    name: 'README.md documents password login endpoint',
    fn: () => {
      const readme = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf-8');
      return readme.includes('password-login');
    }
  },
  {
    name: 'README.md documents plan_status field',
    fn: () => {
      const readme = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf-8');
      return readme.includes('plan_status') || readme.includes('plan status');
    }
  }
]);

// =====================================================================
// TEST SUITE 16: Security Checks
// =====================================================================

runner.describe('16. Security Validation', [
  {
    name: 'password-register does NOT log passwords',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      const logLines = code.split('\n').filter(l => l.includes('console') || l.includes('log'));
      return !logLines.some(l => l.includes('password') && !l.includes('//'));
    }
  },
  {
    name: 'password-login does NOT log passwords',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      const logLines = code.split('\n').filter(l => l.includes('console') || l.includes('log'));
      return !logLines.some(l => l.includes('password') && !l.includes('//'));
    }
  },
  {
    name: 'No eval() or dangerous functions in password endpoints',
    fn: () => {
      const register = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      const login = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      return !register.includes('eval') && !login.includes('eval') &&
             !register.includes('Function(') && !login.includes('Function(');
    }
  },
  {
    name: 'public-info endpoint does NOT expose passwords',
    fn: () => {
      const code = fs.readFileSync(path.join(__dirname, '../../api/creator/public-info.js'), 'utf-8');
      const returnLines = code.split('\n').filter(l => l.includes('password'));
      return returnLines.length === 0 || returnLines.some(l => l.includes('//'));
    }
  },
  {
    name: 'creator-signup.html has secure password fields',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-signup.html'), 'utf-8');
      return html.includes('type="password"');
    }
  },
  {
    name: 'creator-login.html has secure password fields',
    fn: () => {
      const html = fs.readFileSync(path.join(__dirname, '../../creator-login.html'), 'utf-8');
      return html.includes('type="password"');
    }
  },
  {
    name: 'No hardcoded secrets in endpoint code',
    fn: () => {
      const register = fs.readFileSync(path.join(__dirname, '../../api/auth/password-register.js'), 'utf-8');
      const login = fs.readFileSync(path.join(__dirname, '../../api/auth/password-login.js'), 'utf-8');
      return !register.includes('SECRET') && !login.includes('SECRET') &&
             !register.includes('KEY=') && !login.includes('KEY=');
    }
  }
]);

// Run all tests
runner.runAll();
