# CityFix - Civic Issue Tracker

AI-powered civic complaint platform for citizens to report issues and track resolutions.

## Tech Stack

- **Frontend**: Next.js 16 + TailwindCSS 4 + TypeScript
- **Backend**: Flask + Python
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth
- **AI**: Google Gemini API (Vision + Text)
- **Maps**: Google Maps API

## Project Structure

```
cityfix/
├── frontend/           # Next.js application
│   ├── app/               # Pages and routing
│   ├── lib/               # Firebase & API utilities
│   └── public/            # Static assets
└── backend/            # Flask API
    ├── routes/            # API endpoints
    ├── services/          # Business logic
    └── config.py          # Configuration
```

## Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python app.py
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm install firebase @googlemaps/js-api-loader
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Frontend runs on `http://localhost:3000`

## Implementation Status

### ✅ Phase 1: Setup & Initialization (COMPLETE)

**Backend:**
- ✅ Flask app with blueprints architecture
- ✅ Firebase Admin SDK integration
- ✅ CORS configuration for Next.js
- ✅ API routes structure (auth, complaints, admin, AI)
- ✅ Gemini AI service integration
- ✅ Environment configuration

**Frontend:**
- ✅ Next.js with TailwindCSS
- ✅ Pages: `/`, `/report`, `/status/[id]`, `/dashboard`
- ✅ Firebase client initialization
- ✅ API client utility
- ✅ Responsive UI components

**Configuration:**
- ✅ Environment variables setup
- ✅ .gitignore files
- ✅ README documentation
- ✅ Dependencies installed

### 🔄 Next Phases

- **Phase 2**: Authentication & Users
- **Phase 3**: Complaint Reporting with AI
- **Phase 4**: Admin Dashboard
- **Phase 5**: Advanced AI Features
- **Phase 6**: Notifications
- **Phase 7**: Polish & Production

## Firebase Setup Required

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Firebase Storage
4. Enable Authentication (Email/Password + Google)
5. Download service account key → save as `backend/firebase-credentials.json`
6. Get web app config → add to `frontend/.env.local`

## API Keys Required

- Firebase Service Account (backend)
- Firebase Web Config (frontend)
- Google Gemini API Key
- Google Maps API Key

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/verify` - Verify token
- `GET /api/complaints` - Get complaints
- `POST /api/complaints` - Create complaint
- `GET /api/admin/stats` - Dashboard stats
- `POST /api/ai/predict-type` - AI image tagging
- `POST /api/ai/chatbot` - AI chatbot

See individual README files in `backend/` and `frontend/` for detailed documentation.

## Development Workflow

1. Start backend: `cd backend && python app.py`
2. Start frontend: `cd frontend && npm run dev`
3. Access app at `http://localhost:3000`
4. API available at `http://localhost:5000`

## Features

- 📸 AI-powered issue type detection from photos
- 📍 Location tracking with Google Maps
- ✅ AI verification of issue resolution
- 🤖 AI chatbot for status queries
- 📊 Admin dashboard with statistics
- 🔔 Status update notifications
- 📈 AI-generated insights and trends

## Contributing

This project is built phase-by-phase. After completing Phase 1, proceed to Phase 2 for authentication implementation.

## License

MIT License
