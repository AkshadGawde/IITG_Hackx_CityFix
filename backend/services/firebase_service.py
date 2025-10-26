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


# --------------------- Query helpers ---------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points on Earth in kilometers."""
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * \
        cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def get_nearby_documents(collection: str, center_lat: float, center_lng: float, radius_meters: float,
                         lat_field: str = 'location.lat', lng_field: str = 'location.lng'):
    """Fetch documents within an approximate radius using a bounding box then filter by haversine.

    Firestore does not support true geo-queries without extra indexing; this helper uses a simple
    bounding-box approximation on lat/lng and then filters client-side.
    """
    db = get_firestore()
    radius_km = radius_meters / 1000.0

    # Rough degree deltas (valid for small areas)
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / \
        (111.0 * max(0.1, abs(__import__('math').cos(__import__('math').radians(center_lat)))))

    min_lat, max_lat = center_lat - lat_delta, center_lat + lat_delta
    min_lng, max_lng = center_lng - lng_delta, center_lng + lng_delta

    # Build query with range filters; Firestore requires composite index for multiple range filters
    query = db.collection(collection)
    query = query.where(lat_field, '>=', min_lat).where(
        lat_field, '<=', max_lat)
    query = query.where(lng_field, '>=', min_lng).where(
        lng_field, '<=', max_lng)

    results = []
    for doc in query.stream():
        data = doc.to_dict() or {}
        # Extract lat/lng using nested fields (location.lat etc.)
        try:
            # Support both 'lng' and 'lon'
            lat_val = _deep_get(data, lat_field)
            lng_val = _deep_get(data, lng_field)
            if lat_val is None or lng_val is None:
                # try alternate key for longitude if missing
                if lng_val is None and lng_field.endswith('lng'):
                    lng_val = _deep_get(data, lng_field[:-3] + 'lon')
            if lat_val is None or lng_val is None:
                continue
            lat_f = float(str(lat_val))
            lng_f = float(str(lng_val))
            dist_km = _haversine_km(lat_f, lng_f, float(
                center_lat), float(center_lng))
            if dist_km <= radius_km:
                data['id'] = doc.id
                data['_distance_km'] = dist_km
                results.append(data)
        except Exception:
            continue

    return results


def _deep_get(obj: dict, path: str):
    parts = path.split('.')
    cur = obj
    for p in parts:
        if not isinstance(cur, dict) or p not in cur:
            return None
        cur = cur[p]
    return cur
