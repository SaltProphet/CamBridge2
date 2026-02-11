#!/usr/bin/env node

/**
 * Test User Creation Script
 * Creates a universal test account for manual testing
 * 
 * Usage: node scripts/create-test-user.js
 * 
 * Test Credentials:
 *   Email: test@cambridge.app
 *   Password: TestPassword123!
 *   Slug: test-creator
 */

import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';

const TEST_EMAIL = 'test@cambridge.app';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_SLUG = 'test-creator';
const TEST_DISPLAY_NAME = 'Test Creator';

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // Hash password
    const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);
    console.log(`✓ Password hashed (${TEST_PASSWORD})`);

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM creators WHERE email = ${TEST_EMAIL} LIMIT 1
    `;

    if (existing.rows && existing.rows.length > 0) {
      console.log(`✓ Test user already exists with ID: ${existing.rows[0].id}`);
      console.log('\n📋 Test Credentials:');
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      console.log(`   Slug: ${TEST_SLUG}`);
      process.exit(0);
    }

    // Insert test user
    const result = await sql`
      INSERT INTO creators (
        email,
        password_hash,
        slug,
        display_name,
        plan_status,
        status,
        age_confirmed,
        tos_accepted,
        created_at
      ) VALUES (
        ${TEST_EMAIL},
        ${passwordHash},
        ${TEST_SLUG},
        ${TEST_DISPLAY_NAME},
        'beta',
        'active',
        true,
        true,
        NOW()
      )
      RETURNING id, email, slug, created_at
    `;

    if (result.rows && result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`\n✅ Test user created successfully!`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Slug: ${user.slug}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('\n📋 Test Credentials:');
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      console.log(`   Creator URL: https://yoursite.com/public/pages/creator-signup.html`);
      console.log(`\n🚀 Use these credentials to test login functionality`);
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    if (error.message.includes('duplicate key')) {
      console.log(`\n✓ Test user already exists`);
      console.log('\n📋 Test Credentials:');
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      process.exit(0);
    }
    process.exit(1);
  }
}

createTestUser();
