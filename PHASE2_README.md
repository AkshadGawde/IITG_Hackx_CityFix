# Phase 2: Authentication & Users - Complete! 🔐

## ✅ What Was Implemented

### Backend (Flask)
- **Authentication Routes** (`/backend/routes/auth.py`):
  - `POST /api/auth/signup` - Create new user account
  - `POST /api/auth/verify` - Verify Firebase ID token
  - `GET /api/auth/profile` - Get current user profile
  - `PUT /api/auth/profile` - Update user profile
  
- **Middleware & Decorators**:
  - `@token_required` - Protect routes with JWT verification
  - `@admin_required` - Restrict access to admin users only

- **Firebase Integration**:
  - `verify_token()` - Verify Firebase ID tokens
  - User data stored in Firestore `users` collection
  - Automatic user profile creation on first login

### Frontend (Next.js)
- **Auth Context** (`/frontend/contexts/AuthContext.tsx`):
  - Global authentication state management
  - Firebase Auth integration (Email/Password + Google OAuth)
  - Automatic token refresh
  - User data synchronization with backend

- **Components**:
  - `Navbar.tsx` - Navigation with auth buttons
  - `AuthModal.tsx` - Sign in/sign up modal
  - `ProtectedRoute.tsx` - Route protection wrapper

- **API Client** (`/frontend/lib/api.ts`):
  - Centralized API calls with automatic token injection
  - Error handling
  - TypeScript support

### Firestore Collections
```
users/
  {user_id}/
    - user_id: string
    - name: string
    - email: string
    - role: "user" | "admin"
    - created_at: timestamp
    - updated_at: timestamp
```

## 🔧 How to Use

### Backend

1. **Protect a route with authentication**:
```python
from routes.auth import token_required

@app.route('/api/protected')
@token_required
def protected_route():
    user_id = request.user['uid']
    return {'message': f'Hello {user_id}'}
```

2. **Require admin access**:
```python
from routes.auth import admin_required

@app.route('/api/admin-only')
@admin_required
def admin_route():
    return {'message': 'Admin access granted'}
```

### Frontend

1. **Use Auth Context in a component**:
```tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, userData, signOut } = useAuth();
  
  return (
    <div>
      {user ? (
        <>
          <p>Welcome {userData?.name}!</p>
          <button onClick={signOut}>Sign Out</button>
        </>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

2. **Protect a page**:
```tsx
'use client';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <div>Admin Content</div>
    </ProtectedRoute>
  );
}
```

3. **Make authenticated API calls**:
```tsx
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const { getIdToken } = useAuth();
const token = await getIdToken();
const profile = await api.auth.getProfile(token);
```

## 🎯 Features

- ✅ Email/Password authentication
- ✅ Google OAuth sign-in
- ✅ JWT token verification
- ✅ Role-based access control (user/admin)
- ✅ Protected routes (backend & frontend)
- ✅ Automatic user profile creation
- ✅ Session persistence
- ✅ Mobile-responsive auth UI

## 🔑 Making a User Admin

To promote a user to admin, use the backend route:

```bash
curl -X POST http://localhost:5000/api/auth/update-role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "USER_ID", "role": "admin"}'
```

Or manually update in Firestore:
1. Go to Firebase Console → Firestore
2. Find user in `users` collection
3. Edit `role` field to `"admin"`

## 🧪 Testing

### Test Authentication Flow:
1. Start backend: `cd backend && python app.py`
2. Start frontend: `cd frontend && npm run dev`
3. Click "Sign Up" in navbar
4. Create account with email/password
5. Check Firestore - user document should exist
6. Sign out and sign in again
7. User session should persist

### Test Protected Routes:
1. Try accessing `/dashboard` without signing in
2. Should redirect to home
3. Sign in and try again
4. Should have access

## 📝 Next Steps

Ready for **Phase 3: Complaint Reporting**! 📸
- Image upload to Firebase Storage
- AI-powered auto-tagging with Gemini Vision
- Location picker with Google Maps
- Firestore complaints collection

---

**Phase 2 Complete!** 🎉
