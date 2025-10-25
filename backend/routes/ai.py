"""AI-powered routes for Gemini integration."""
from flask import Blueprint, request, jsonify
from routes.auth import token_required
from services.gemini_service import (
    predict_issue_type,
    generate_summary_and_priority,
    verify_resolution,
    generate_insights,
    chatbot_response
)
import base64
from PIL import Image
import io

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/predict-type', methods=['POST'])
@token_required
def predict_type():
    """Predict issue type from uploaded image."""
    try:
        # Get image from request (base64 or file upload)
        if 'image' in request.files:
            image_file = request.files['image']
            image_data = Image.open(image_file)
        elif 'image_base64' in request.json:
            image_base64 = request.json['image_base64']
            image_bytes = base64.b64decode(image_base64)
            image_data = Image.open(io.BytesIO(image_bytes))
        else:
            return jsonify({'error': 'No image provided'}), 400

        result = predict_issue_type(image_data)

        if result['success']:
            return jsonify({'predicted_type': result['result'].strip().lower()}), 200
        else:
            return jsonify({'error': result['error']}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/generate-summary', methods=['POST'])
@token_required
def generate_summary():
    """Generate summary and priority from complaint description."""
    try:
        data = request.json
        description = data.get('description')
        issue_type = data.get('type')

        if not description or not issue_type:
            return jsonify({'error': 'Description and type required'}), 400

        result = generate_summary_and_priority(description, issue_type)

        if result['success']:
            # Parse the response
            response_text = result['result']
            return jsonify({'analysis': response_text}), 200
        else:
            return jsonify({'error': result['error']}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/verify-resolution', methods=['POST'])
@token_required
def verify_resolution_route():
    """Verify issue resolution by comparing before/after images."""
    try:
        data = request.json
        before_image_b64 = data.get('before_image')
        after_image_b64 = data.get('after_image')
        issue_type = data.get('issue_type')

        if not all([before_image_b64, after_image_b64, issue_type]):
            return jsonify({'error': 'Both images and issue type required'}), 400

        # Decode images
        before_bytes = base64.b64decode(before_image_b64)
        after_bytes = base64.b64decode(after_image_b64)
        before_image = Image.open(io.BytesIO(before_bytes))
        after_image = Image.open(io.BytesIO(after_bytes))

        result = verify_resolution(before_image, after_image, issue_type)

        if result['success']:
            return jsonify({'verification': result['result']}), 200
        else:
            return jsonify({'error': result['error']}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/chatbot', methods=['POST'])
def chatbot():
    """AI chatbot for user queries."""
    try:
        data = request.json
        query = data.get('query')
        context = data.get('context', {})

        if not query:
            return jsonify({'error': 'Query required'}), 400

        result = chatbot_response(query, str(context))

        if result['success']:
            return jsonify({'response': result['result']}), 200
        else:
            return jsonify({'error': result['error']}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/insights', methods=['GET'])
@token_required
def get_insights():
    """Generate AI insights from complaints data."""
    try:
        from services.firebase_service import get_firestore
        db = get_firestore()

        # Get recent complaints
        complaints = db.collection('complaints').order_by(
            'created_at', direction='DESCENDING').limit(100).stream()

        # Prepare data for AI
        complaints_summary = []
        for doc in complaints:
            data = doc.to_dict()
            complaints_summary.append({
                'type': data.get('type'),
                'status': data.get('status'),
                'priority': data.get('priority'),
                'location': data.get('location', {}).get('address', 'Unknown')
            })

        result = generate_insights(str(complaints_summary))

        if result['success']:
            return jsonify({'insights': result['result']}), 200
        else:
            return jsonify({'error': result['error']}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
