# CityFix Frontend

Next.js frontend for CityFix civic issue tracker.

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Install Additional Packages

```bash
npm install firebase @googlemaps/js-api-loader
npm install -D @types/google.maps
```

### 3. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → General → Your apps
4. Click "Web" icon to add a web app
5. Copy the configuration values

### 4. Environment Variables

Create `.env.local` file in `frontend/` folder:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx                # Home page
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   ├── report/                 # Report issue page
│   │   └── page.tsx
│   ├── dashboard/              # Dashboard page
│   │   └── page.tsx
│   └── status/[id]/            # Status detail page
│       └── page.tsx
├── lib/                    # Utility libraries
│   ├── firebase.ts             # Firebase initialization
│   └── api.ts                  # API client
├── public/                 # Static assets
└── package.json
```

## Available Pages

- **`/`** - Home page with features and stats
- **`/report`** - Report new civic issue
- **`/dashboard`** - View all complaints with filters
- **`/status/[id]`** - View specific complaint details

## Features

### Phase 1 (Current)
✅ Basic page structure
✅ Responsive TailwindCSS UI
✅ Firebase configuration
✅ API client setup
⏳ Authentication (coming in Phase 2)
⏳ Google Maps integration (coming in Phase 3)
⏳ AI features (coming in Phase 3-5)

### Coming Soon
- 🔐 Firebase Authentication
- 🗺️ Google Maps integration
- 🤖 AI-powered auto-tagging
- 📊 Admin dashboard
- 🔔 Notifications
- 💬 AI chatbot

## Development

The project uses:
- **Next.js 16** with App Router
- **TailwindCSS 4** for styling
- **TypeScript** for type safety
- **Firebase** for backend services

## Building for Production

```bash
npm run build
npm start
```

## Notes

- Lint errors for `any` types will be fixed in subsequent phases when we add proper TypeScript interfaces
- Firebase and Google Maps features require valid API keys
- Make sure the backend is running on `http://localhost:5000` for API calls

