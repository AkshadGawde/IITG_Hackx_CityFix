"""Complaints routes."""
from flask import Blueprint, request, jsonify
from routes.auth import token_required
from services.firebase_service import get_firestore, get_storage
from services.gemini_service import predict_issue_type, generate_summary_and_priority
from firebase_admin import firestore as fa_firestore
from google.cloud.firestore import SERVER_TIMESTAMP
from datetime import datetime
import traceback
import requests
from io import BytesIO
from PIL import Image

complaints_bp = Blueprint('complaints', __name__)


@complaints_bp.route('/upload', methods=['POST', 'OPTIONS'])
def upload_image():
    """Upload image to Firebase Storage (avoids CORS issues)."""
    # Handle preflight OPTIONS request (no auth needed)
    if request.method == 'OPTIONS':
        return '', 204

    # For POST request, require authentication
    from routes.auth import verify_token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization required'}), 401

    token = auth_header.split(' ')[1]
    decoded_token = verify_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        print(f"Upload request received. Files: {request.files}")
        print(f"Content-Type: {request.content_type}")

        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        print(
            f"File received: {file.filename}, Content-Type: {file.content_type}")

        # Get user ID from token
        user_id = decoded_token['uid']

        # Generate unique filename
        timestamp = datetime.now().timestamp()
        file_extension = file.filename.split(
            '.')[-1] if file.filename else 'jpg'
        filename = f"complaints/{user_id}/{int(timestamp)}_{file.filename}"

        # Upload to Firebase Storage
        bucket = get_storage()
        try:
            print(f"Storage bucket resolved: {bucket.name}")
            try:
                exists = bucket.exists()
            except Exception:
                exists = False
            if not exists:
                # Return a clear, actionable error instead of a mysterious 500 from GCS
                return jsonify({
                    'error': 'Firebase Storage bucket is not provisioned',
                    'bucket': getattr(bucket, 'name', None),
                    'hint': "Open Firebase Console → Build → Storage → 'Get started' to create the default bucket, then restart the backend.",
                }), 503
        except Exception:
            pass
        blob = bucket.blob(filename)

        # Read file content
        file_content = file.read()
        content_type = file.content_type or 'image/jpeg'

        print(
            f"Uploading to Storage: {filename}, size: {len(file_content)} bytes")

        blob.upload_from_string(
            file_content,
            content_type=content_type
        )

        # Make the blob publicly readable
        blob.make_public()

        # Get public URL
        photo_url = blob.public_url

        print(f"Upload successful! URL: {photo_url}")

        return jsonify({
            'success': True,
            'photo_url': photo_url,
            'filename': filename
        }), 200

    except Exception as e:
        print(f"Upload error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@complaints_bp.route('/new', methods=['POST'])
@token_required
def create_new_complaint():
    """Create a new complaint with AI auto-tagging (Phase 3 endpoint)."""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['description', 'photo_url', 'location']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        # Validate location
        location = data['location']
        if 'lat' not in location or 'lng' not in location:
            return jsonify({'error': 'Location must contain lat and lng'}), 400

        user_id = request.user['uid']
        photo_url = data['photo_url']
        complaint_type = data.get('type', 'auto')
        description = data['description']

        # AI Analysis: Predict issue type from image if type is 'auto'
        ai_tags = []
        predicted_type = None

        if complaint_type == 'auto' or not complaint_type:
            try:
                # Download image for AI analysis
                response = requests.get(photo_url, timeout=10)
                img = Image.open(BytesIO(response.content))

                # Predict type using Gemini
                prediction = predict_issue_type(img)
                if prediction.get('success'):
                    predicted_type = prediction.get(
                        'result', '').strip().lower()
                    # Normalize to proper case
                    type_mapping = {
                        'pothole': 'Pothole',
                        'streetlight': 'Street Light',
                        'street light': 'Street Light',
                        'garbage': 'Garbage',
                        'drainage': 'Drainage',
                        'water_supply': 'Water Supply',
                        'road_damage': 'Road Damage',
                        'graffiti': 'Graffiti',
                        'road sign': 'Road Sign',
                        'tree': 'Tree',
                        'other': 'Other'
                    }
                    complaint_type = type_mapping.get(predicted_type, 'Other')
                    ai_tags.append(predicted_type)
                else:
                    complaint_type = 'Other'
            except Exception as e:
                print(f"AI prediction error (non-critical): {str(e)}")
                complaint_type = 'Other'

        # AI Summary and Priority
        priority = 'Normal'
        ai_summary = None
        try:
            summary_result = generate_summary_and_priority(
                description, complaint_type)
            if summary_result.get('success'):
                result_text = summary_result.get('result', '')
                # Parse the result
                if 'PRIORITY:' in result_text:
                    priority_line = [line for line in result_text.split(
                        '\n') if 'PRIORITY:' in line][0]
                    priority_val = priority_line.split(
                        ':')[1].strip().split()[0].lower()
                    priority_mapping = {
                        'low': 'Low',
                        'medium': 'Normal',
                        'normal': 'Normal',
                        'high': 'High',
                        'critical': 'Critical'
                    }
                    priority = priority_mapping.get(priority_val, 'Normal')
                if 'SUMMARY:' in result_text:
                    ai_summary = [line for line in result_text.split(
                        '\n') if 'SUMMARY:' in line][0].split(':')[1].strip()
        except Exception as e:
            print(f"AI summary error (non-critical): {str(e)}")

        # Create complaint document
        db = get_firestore()
        complaint_data = {
            'user_id': user_id,
            'type': complaint_type,
            'description': description,
            'photo_url': photo_url,
            'location': {
                'lat': float(location['lat']),
                'lng': float(location['lng'])
            },
            # Use lowercase status to match filters used across the app
            'status': 'pending',
            'priority': priority,
            'ai_tags': ai_tags,
            'predicted_type': predicted_type,
            'ai_summary': ai_summary,
            'created_at': SERVER_TIMESTAMP,
            'updated_at': SERVER_TIMESTAMP
        }

        # Add to Firestore
        complaint_ref = db.collection('complaints').document()
        complaint_ref.set(complaint_data)

        return jsonify({
            'message': 'Complaint created successfully',
            'complaint_id': complaint_ref.id,
            'predicted_type': predicted_type,
            'ai_tags': ai_tags,
            'priority': priority
        }), 201

    except Exception as e:
        print(f"Create complaint error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to create complaint', 'details': str(e)}), 500


@complaints_bp.route('/', methods=['GET'])
def get_complaints():
    """Get all complaints (public endpoint with optional filters)."""
    try:
        db = get_firestore()
        query = db.collection('complaints')

        # Apply filters
        status = request.args.get('status')
        issue_type = request.args.get('type')
        limit = int(request.args.get('limit', 50))

        if status:
            query = query.where('status', '==', status)
        if issue_type:
            query = query.where('type', '==', issue_type)

        # Order by created_at descending
        query = query.order_by(
            'created_at', direction='DESCENDING').limit(limit)

        complaints = []
        for doc in query.stream():
            complaint = doc.to_dict()
            complaint['id'] = doc.id
            complaints.append(complaint)

        return jsonify(complaints), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@complaints_bp.route('/<complaint_id>', methods=['GET'])
def get_complaint(complaint_id):
    """Get single complaint by ID."""
    try:
        db = get_firestore()
        doc = db.collection('complaints').document(complaint_id).get()

        if not doc.exists:
            return jsonify({'error': 'Complaint not found'}), 404

        complaint = doc.to_dict()
        complaint['id'] = doc.id

        return jsonify(complaint), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@complaints_bp.route('/', methods=['POST'])
@token_required
def create_complaint():
    """Create new complaint."""
    try:
        db = get_firestore()
        data = request.json

        # Validate required fields
        required_fields = ['type', 'description', 'location']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Create complaint document
        complaint_data = {
            'user_id': request.user['uid'],
            'type': data['type'],
            'description': data['description'],
            'photo_url': data.get('photo_url'),
            # {lat: float, lng: float, address: string}
            'location': data['location'],
            'status': 'pending',
            'priority': data.get('priority', 'medium'),
            'ai_tags': data.get('ai_tags', []),
            'ai_summary': data.get('ai_summary'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        # Add to Firestore
        doc_ref = db.collection('complaints').add(complaint_data)
        complaint_id = doc_ref[1].id

        return jsonify({
            'message': 'Complaint created successfully',
            'complaint_id': complaint_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@complaints_bp.route('/user', methods=['GET'])
@token_required
def get_user_complaints():
    """Get complaints created by the authenticated user."""
    try:
        db = get_firestore()
        query = db.collection('complaints').where(
            'user_id', '==', request.user['uid'])
        query = query.order_by('created_at', direction='DESCENDING')

        complaints = []
        for doc in query.stream():
            complaint = doc.to_dict()
            complaint['id'] = doc.id
            complaints.append(complaint)

        return jsonify(complaints), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
