"""AI-powered routes for Gemini integration."""
from flask import Blueprint, request, jsonify
from routes.auth import token_required
from services.gemini_service import (
    predict_issue_type,
    generate_summary_and_priority,
    verify_resolution,
    generate_insights,
    chatbot_response,
    classify_issue,
    get_text_embedding,
    cosine_similarity,
    image_similarity_score,
    assess_severity
)
import base64
from PIL import Image
import io
import requests
from io import BytesIO
from services.firebase_service import get_firestore, get_nearby_documents

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/predict-type', methods=['POST'])
@token_required
def predict_type():
    """Predict issue type from uploaded image."""
    try:
        # Get image from request (base64 or file upload)
        data = request.get_json(silent=True) or {}
        if 'image' in request.files:
            image_file = request.files['image']
            image_data = Image.open(image_file.stream)
        elif 'image_base64' in data:
            image_base64 = data['image_base64']
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
        data = request.get_json(silent=True) or {}
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
        data = request.get_json(silent=True) or {}
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
        data = request.get_json(silent=True) or {}
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

    @ai_bp.route('/process-issue', methods=['POST'])
    @token_required
    def process_issue():
        """Post-create AI processing for an 'issues' document.

        Body: { "issue_id": string }

        Computes category+confidence, severity+reason, duplicate detection within 100m,
        and updates the Firestore document accordingly.
        """
        try:
            data = request.get_json() or {}
            issue_id = data.get('issue_id')
            if not issue_id:
                return jsonify({'error': 'issue_id required'}), 400

            db = get_firestore()
            doc_ref = db.collection('issues').document(issue_id)
            snap = doc_ref.get()
            if not snap.exists:
                return jsonify({'error': 'Issue not found'}), 404

            issue = snap.to_dict()
            description = issue.get('description') or ''
            photo_url = issue.get('photoUrl') or issue.get('photo_url')
            loc = issue.get('location') or {}
            lat = loc.get('lat')
            lng = loc.get('lon') or loc.get('lng')

            if not (photo_url and isinstance(lat, (int, float)) and isinstance(lng, (int, float))):
                return jsonify({'error': 'Issue missing photo or location'}), 400

            # Load image
            img_resp = requests.get(photo_url, timeout=15)
            img = Image.open(BytesIO(img_resp.content))

            # 1) Category + confidence
            cat = classify_issue(img, description)
            category = cat.get('category', 'Other')
            confidence = float(cat.get('confidence', 0.0))

            # 2) Severity + reason (maps to Priority for UI)
            sev = assess_severity(description, category)
            severity = sev.get('severity', 'Medium')
            reason = sev.get('reason', '')
            priority_map = {
                'Low': 'Low',
                'Medium': 'Medium',
                'High': 'High'
            }
            priority = priority_map.get(severity, 'Medium')

            # 3) Duplicate detection (100 meters radius)
            nearby = get_nearby_documents('issues', float(lat), float(lng), 100.0,
                                          lat_field='location.lat', lng_field='location.lon')
            # Exclude itself
            nearby = [d for d in nearby if d.get('id') != issue_id]
            # Sort by distance for efficiency
            nearby.sort(key=lambda x: x.get('_distance_km', 0))
            # Prepare embedding for current description once
            emb_main = get_text_embedding(description) or []

            duplicate_of = None
            best_score = 0.0
            for candidate in nearby[:8]:  # cap to 8 closest
                try:
                    # Text similarity
                    cand_desc = (candidate.get('description') or '')
                    emb_c = get_text_embedding(cand_desc) or []
                    text_sim = cosine_similarity(
                        emb_main, emb_c) if emb_main and emb_c else 0.0

                    # Image similarity (optional, network-heavy)
                    cand_photo = candidate.get(
                        'photoUrl') or candidate.get('photo_url')
                    img2 = None
                    if cand_photo:
                        r2 = requests.get(cand_photo, timeout=10)
                        img2 = Image.open(BytesIO(r2.content))
                    img_sim = image_similarity_score(
                        img, img2) if img2 is not None else 0.0

                    score = (text_sim + img_sim) / 2.0
                    if score > 0.8 and score > best_score:
                        best_score = score
                        duplicate_of = candidate['id']
                except Exception:
                    continue

            # Update Firestore doc with AI fields
            update = {
                'category': category,
                'category_confidence': confidence,
                'priority': priority,
                'ai_reason': reason,
                'updated_at': __import__('firebase_admin').firestore.SERVER_TIMESTAMP
            }
            if duplicate_of:
                update['duplicate_of'] = duplicate_of
                update['duplicate_similarity'] = best_score

            doc_ref.update(update)

            return jsonify({
                'issue_id': issue_id,
                'category': category,
                'confidence': confidence,
                'priority': priority,
                'ai_reason': reason,
                'duplicate_of': duplicate_of,
                'duplicate_similarity': best_score
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
