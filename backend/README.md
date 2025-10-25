# CityFix Backend

Flask backend for CityFix civic issue tracker with AI-powered features.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Firestore Database**:
   - Click "Firestore Database" → "Create Database"
   - Start in production mode
   - Choose your location

4. Enable **Firebase Storage**:
   - Click "Storage" → "Get Started"
   - Start in production mode

5. Enable **Authentication**:
   - Click "Authentication" → "Get Started"
   - Enable "Email/Password" provider
   - Enable "Google" provider

6. Get Service Account Key:
   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `firebase-credentials.json` in the `backend/` folder

7. Update `services/firebase_service.py` line 23:
   - Replace `'your-project-id.appspot.com'` with your actual project ID

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### 4. Environment Variables

Create `.env` file in `backend/` folder:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
FRONTEND_URL=http://localhost:3000
```

### 5. Run the Server

```bash
python app.py
```

Server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Authentication
- `POST /api/auth/verify` - Verify Firebase token
- `GET /api/auth/profile` - Get user profile (requires auth)
- `PUT /api/auth/profile` - Update profile (requires auth)

### Complaints
- `GET /api/complaints` - Get all complaints (public)
- `GET /api/complaints/<id>` - Get single complaint
- `POST /api/complaints` - Create complaint (requires auth)
- `GET /api/complaints/user` - Get user's complaints (requires auth)

### Admin (requires admin role)
- `GET /api/admin/complaints` - Get all complaints with filters
- `PUT /api/admin/complaints/<id>` - Update complaint status
- `GET /api/admin/stats` - Get dashboard statistics

### AI Features
- `POST /api/ai/predict-type` - Predict issue type from image (requires auth)
- `POST /api/ai/generate-summary` - Generate summary and priority (requires auth)
- `POST /api/ai/verify-resolution` - Verify resolution with before/after images (requires auth)
- `POST /api/ai/chatbot` - AI chatbot responses (public)
- `GET /api/ai/insights` - Generate insights from data (requires auth)

## Project Structure

```
backend/
├── app.py                 # Main Flask application
├── config.py              # Configuration management
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── services/             # Business logic
│   ├── firebase_service.py   # Firebase integration
│   └── gemini_service.py     # Gemini AI integration
└── routes/               # API endpoints
    ├── auth.py               # Authentication routes
    ├── complaints.py         # Complaint management
    ├── admin.py              # Admin operations
    └── ai.py                 # AI-powered features
```

## Firestore Collections

### users
```
{
  user_id: string (document ID)
  name: string
  email: string
  role: string (user/admin)
  created_at: timestamp
}
```

### complaints
```
{
  complaint_id: string (auto-generated)
  user_id: string
  type: string
  description: string
  photo_url: string
  location: {lat: number, lng: number, address: string}
  status: string (pending/in_progress/resolved)
  priority: string (low/medium/high)
  ai_tags: array
  ai_summary: string
  admin_remarks: string
  resolution_photo_url: string
  resolution_confidence: number
  created_at: timestamp
  updated_at: timestamp
}
```
