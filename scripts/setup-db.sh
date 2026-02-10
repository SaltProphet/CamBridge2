#!/bin/bash
# Database setup script for CamBridge authentication system

set -e

echo "=========================================="
echo "CamBridge Database Setup Script"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📋 Please copy .env.example to .env"
    exit 1
fi

echo "✓ .env file found"
echo "✅ Setup script ready"
echo ""
echo "Next steps:"
echo "1. Configure .env with your database credentials"
echo "2. Start dev server: npm run dev"
echo "3. Initialize database: POST /api/init-db"
echo "4. Register models at: /register"
