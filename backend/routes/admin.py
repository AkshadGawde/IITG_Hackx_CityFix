"""Admin routes."""
from flask import Blueprint, request, jsonify
from routes.auth import admin_required
from services.firebase_service import get_firestore
from datetime import datetime

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
