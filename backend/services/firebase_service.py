"""Firebase Admin SDK service for Firestore and Storage."""
import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from google.cloud.firestore import SERVER_TIMESTAMP
import os


_firebase_initialized = False
db = None
bucket = None


def initialize_firebase(credentials_path):
    """Initialize Firebase Admin SDK."""
    global _firebase_initialized, db, bucket

    if _firebase_initialized:
        return

    if not os.path.exists(credentials_path):
        print(
            f"⚠️  Warning: Firebase credentials not found at {credentials_path}")
        print("   Please add your firebase-credentials.json file to continue.")
        return

    try:
        cred = credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'cityfix-91dcf.firebasestorage.app'
        })

        db = firestore.client()
        bucket = storage.bucket()
        _firebase_initialized = True

        print("✅ Firebase initialized successfully")
    except Exception as e:
        print(f"❌ Error initializing Firebase: {str(e)}")


def get_firestore():
    """Get Firestore client instance."""
    if db is None:
        raise Exception(
            "Firebase not initialized. Please check your credentials.")
    return db


def get_storage():
    """Get Storage bucket instance."""
    if bucket is None:
        raise Exception(
            "Firebase Storage not initialized. Please check your credentials.")
    return bucket


def verify_token(id_token):
    """Verify Firebase ID token."""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return None
