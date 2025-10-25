#!/bin/bash

echo "🚀 CityFix Phase 1 Setup Verification"
echo "======================================"
echo ""

# Check backend
echo "📦 Backend:"
if [ -f "backend/.env" ]; then
    echo "  ✅ .env file exists"
else
    echo "  ❌ .env file missing"
fi

if [ -f "backend/firebase-credentials.json" ]; then
    echo "  ✅ firebase-credentials.json exists"
else
    echo "  ⚠️  firebase-credentials.json missing (required for Firebase Admin SDK)"
fi

if [ -d "backend/venv" ]; then
    echo "  ✅ Virtual environment exists"
else
    echo "  ℹ️  Virtual environment not found"
fi

echo ""
echo "📦 Frontend:"
if [ -f "frontend/.env.local" ]; then
    echo "  ✅ .env.local file exists"
else
    echo "  ❌ .env.local file missing"
fi

if [ -d "frontend/node_modules" ]; then
    echo "  ✅ Node modules installed"
else
    echo "  ⚠️  Node modules not installed (run: npm install)"
fi

echo ""
echo "📋 Next Steps:"
echo "  1. Add firebase-credentials.json to backend/ folder"
echo "  2. Update SECRET_KEY and GOOGLE_MAPS_API_KEY in backend/.env"
echo "  3. Run: cd backend && python app.py"
echo "  4. Run: cd frontend && npm run dev"
echo ""
