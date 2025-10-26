"""Authentication routes."""
from flask import Blueprint, request, jsonify
from services.firebase_service import verify_token, get_firestore
from functools import wraps

auth_bp = Blueprint('auth', __name__)


def token_required(f):
    """Decorator to protect routes with token verification."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'No token provided'}), 401

        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        decoded_token = verify_token(token)
        if not decoded_token:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Add user info to request context
        request.user = decoded_token
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to protect admin-only routes."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        try:
            db = get_firestore()
            user_doc = db.collection('users').document(
                request.user['uid']).get()

            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 404

            user_data = user_doc.to_dict()
            if user_data.get('role') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403

            request.user_data = user_data
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return decorated


@auth_bp.route('/verify', methods=['POST'])
def verify():
    """Verify authentication token and upsert user profile."""
    token = request.json.get('token')

    if not token:
        return jsonify({'error': 'Token required'}), 400

    decoded_token = verify_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401

    # Ensure user profile exists in Firestore
    try:
        db = get_firestore()
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name') or (
            email.split('@')[0] if email else None)

        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            user_ref.set({
                'uid': uid,
                'email': email,
                'name': name,
                'role': 'user',
                'created_at': __import__('firebase_admin').firestore.SERVER_TIMESTAMP,
                'updated_at': __import__('firebase_admin').firestore.SERVER_TIMESTAMP,
            })
        else:
            user_ref.update({
                'email': email,
                'name': name,
                'updated_at': __import__('firebase_admin').firestore.SERVER_TIMESTAMP,
            })
    except Exception as e:
        # Log but don't fail verify; profile endpoint can still read later
        print(f"User upsert error during verify: {str(e)}")

    return jsonify({
        'valid': True,
        'user': {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email')
        }
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get user profile."""
    try:
        db = get_firestore()
        user_doc = db.collection('users').document(request.user['uid']).get()

        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404

        user_data = user_doc.to_dict()
        return jsonify(user_data), 200
    except Exception as e:
        print(f"Profile error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update user profile."""
    try:
        db = get_firestore()
        data = request.json

        # Remove fields that shouldn't be updated
        protected_fields = ['uid', 'email', 'role', 'created_at']
        for field in protected_fields:
            data.pop(field, None)

        db.collection('users').document(request.user['uid']).update(data)
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
