"""Firebase Admin SDK service for Firestore and Storage."""
import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from google.cloud.firestore import SERVER_TIMESTAMP
import os
import json


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
        # Determine storage bucket name
        bucket_name = os.getenv('FIREBASE_STORAGE_BUCKET')
        if not bucket_name:
            try:
                with open(credentials_path, 'r') as f:
                    sa = json.load(f)
                    project_id = sa.get('project_id')
                    if project_id:
                        bucket_name = f"{project_id}.appspot.com"
            except Exception:
                bucket_name = None

        if not bucket_name:
            print("⚠️  Warning: FIREBASE_STORAGE_BUCKET not set and could not infer from credentials.\n    Some storage operations may fail until configured.")

        cred = credentials.Certificate(credentials_path)
        app_options = {'storageBucket': bucket_name} if bucket_name else None
        if app_options:
            firebase_admin.initialize_app(cred, app_options)
        else:
            firebase_admin.initialize_app(cred)

        db = firestore.client()
        # If bucket_name is set, use it explicitly; else get default bucket
        bucket = storage.bucket(
            bucket_name) if bucket_name else storage.bucket()
        try:
            if bucket and hasattr(bucket, 'exists'):
                if not bucket.exists():
                    print("❗ Firebase Storage bucket not found.")
                    print(
                        "   Go to Firebase Console → Storage and click 'Get started' to provision the default bucket.")
                    if bucket_name:
                        print(f"   Expected bucket: {bucket_name}")
        except Exception as e:
            # Non-fatal: existence check can fail if IAM or network issues; continue and let upload path handle errors
            print(f"ℹ️  Could not verify bucket existence: {str(e)}")
        _firebase_initialized = True

        print("✅ Firebase initialized successfully")
        if bucket_name:
            print(f"   • Storage bucket: {bucket_name}")
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
