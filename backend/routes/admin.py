"""Admin routes."""
from flask import Blueprint, request, jsonify
from routes.auth import admin_required
from services.firebase_service import get_firestore, get_storage
from services.gemini_service import verify_resolution, generate_insights
from firebase_admin import firestore
from datetime import datetime
import traceback
import requests
from io import BytesIO
from PIL import Image

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/complaints', methods=['GET'])
@admin_required
def admin_get_complaints():
    """Get all complaints for admin dashboard."""
    try:
        db = get_firestore()
        query = db.collection('complaints')

        # Apply filters
        status = request.args.get('status')
        issue_type = request.args.get('type')
        priority = request.args.get('priority')

        if status:
            query = query.where('status', '==', status)
        if issue_type:
            query = query.where('type', '==', issue_type)
        if priority:
            query = query.where('priority', '==', priority)

        query = query.order_by('created_at', direction='DESCENDING')

        complaints = []
        for doc in query.stream():
            complaint = doc.to_dict()
            complaint['id'] = doc.id
            complaints.append(complaint)

        return jsonify(complaints), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/complaints/<complaint_id>', methods=['PUT'])
@admin_required
def update_complaint_status(complaint_id):
    """Update complaint status and add admin remarks."""
    try:
        db = get_firestore()
        data = request.json

        update_data = {
            'updated_at': datetime.utcnow()
        }

        if 'status' in data:
            update_data['status'] = data['status']
        if 'priority' in data:
            update_data['priority'] = data['priority']
        if 'admin_remarks' in data:
            update_data['admin_remarks'] = data['admin_remarks']
        if 'resolution_photo_url' in data:
            update_data['resolution_photo_url'] = data['resolution_photo_url']
        if 'resolution_confidence' in data:
            update_data['resolution_confidence'] = data['resolution_confidence']

        db.collection('complaints').document(complaint_id).update(update_data)

        return jsonify({'message': 'Complaint updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get dashboard statistics."""
    try:
        db = get_firestore()

        # Get total counts
        all_complaints = list(db.collection('complaints').stream())

        stats = {
            'total': len(all_complaints),
            'pending': sum(1 for c in all_complaints if c.to_dict().get('status') == 'pending'),
            'in_progress': sum(1 for c in all_complaints if c.to_dict().get('status') == 'in_progress'),
            'resolved': sum(1 for c in all_complaints if c.to_dict().get('status') == 'resolved'),
            'by_type': {},
            'by_priority': {}
        }

        # Count by type and priority
        for complaint in all_complaints:
            data = complaint.to_dict()
            issue_type = data.get('type', 'other')
            priority = data.get('priority', 'medium')

            stats['by_type'][issue_type] = stats['by_type'].get(
                issue_type, 0) + 1
            stats['by_priority'][priority] = stats['by_priority'].get(
                priority, 0) + 1

        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/verify-resolution', methods=['POST'])
@admin_required
def verify_resolution_endpoint():
    """Verify issue resolution using AI image comparison."""
    try:
        data = request.get_json()

        # Validate required fields
        if 'complaint_id' not in data or 'after_image_url' not in data:
            return jsonify({'error': 'complaint_id and after_image_url are required'}), 400

        complaint_id = data['complaint_id']
        after_image_url = data['after_image_url']

        # Get complaint
        db = get_firestore()
        complaint_ref = db.collection('complaints').document(complaint_id)
        complaint_doc = complaint_ref.get()

        if not complaint_doc.exists:
            return jsonify({'error': 'Complaint not found'}), 404

        complaint_data = complaint_doc.to_dict()
        before_image_url = complaint_data.get('photo_url')

        if not before_image_url:
            return jsonify({'error': 'Original complaint photo not found'}), 400

        # Call Gemini AI to verify resolution
        verification_result = verify_resolution(
            before_image_url, after_image_url)

        # Update complaint with verification results
        update_data = {
            'resolution_photo_url': after_image_url,
            'ai_verification': verification_result,
            'resolution_confidence': verification_result.get('confidence', 0.0),
            'updated_at': firestore.SERVER_TIMESTAMP
        }

        # If AI says it's resolved with high confidence, suggest status change
        if verification_result.get('resolved') and verification_result.get('confidence', 0) > 0.7:
            update_data['ai_suggested_status'] = 'Resolved'

        complaint_ref.update(update_data)

        return jsonify({
            'message': 'Resolution verified successfully',
            'verification': verification_result
        }), 200

    except Exception as e:
        print(f"Verify resolution error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to verify resolution', 'details': str(e)}), 500


@admin_bp.route('/insights', methods=['GET'])
@admin_required
def get_insights():
    """Generate AI insights from complaint data."""
    try:
        db = get_firestore()

        # Get recent complaints (last 100)
        complaints_query = db.collection('complaints').order_by(
            'created_at', direction='DESCENDING').limit(100)
        complaints = []

        for doc in complaints_query.stream():
            complaint_data = doc.to_dict()
            complaints.append({
                'type': complaint_data.get('type'),
                'status': complaint_data.get('status'),
                'priority': complaint_data.get('priority'),
                'location': complaint_data.get('location'),
                'created_at': complaint_data.get('created_at')
            })

        # Generate AI insights
        insights = generate_insights(complaints)

        return jsonify({
            'insights': insights,
            'data_points': len(complaints)
        }), 200

    except Exception as e:
        print(f"Get insights error: {str(e)}")
        return jsonify({'error': 'Failed to generate insights', 'details': str(e)}), 500
