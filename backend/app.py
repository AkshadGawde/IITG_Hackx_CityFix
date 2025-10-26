"""Main Flask application for CityFix backend."""
from flask import Flask
from flask_cors import CORS
from config import config
import os
from datetime import datetime, timedelta


def create_app(config_name='default'):
    """Application factory for creating Flask app instance."""
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://localhost:5000"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Additional CORS handling for all responses
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin',
                             'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers',
                             'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods',
                             'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    # Initialize Firebase
    from services.firebase_service import initialize_firebase
    initialize_firebase(app.config['FIREBASE_CREDENTIALS_PATH'])

    # Register blueprints
    from routes import auth_bp, complaints_bp, admin_bp, ai_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(complaints_bp, url_prefix='/api/complaints')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    # Optional: Background daily/weekly summaries via APScheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()

        def _generate_daily_summary():
            try:
                from services.firebase_service import get_firestore
                from services.gemini_service import weekly_summary_bullets
                db = get_firestore()

                # Collect last 7 days issues (use 'issues' collection to match frontend)
                # Fallback if lack of index: fetch recent 300 and filter client-side
                issues_ref = db.collection('issues').order_by(
                    'createdAt', direction='DESCENDING').limit(300)
                docs = list(issues_ref.stream())
                now = datetime.utcnow()
                seven_days_ago = now - timedelta(days=7)

                items = []
                total = 0
                resolved = 0
                by_type = {}
                for d in docs:
                    data = d.to_dict()
                    created = data.get('createdAt') or data.get('created_at')
                    # createdAt may be ISO string or Timestamp; be tolerant
                    try:
                        if hasattr(created, 'timestamp'):
                            created_dt = created.to_datetime() if hasattr(
                                created, 'to_datetime') else created
                        else:
                            created_dt = datetime.fromisoformat(
                                str(created).replace('Z', '+00:00'))
                    except Exception:
                        created_dt = now
                    if created_dt < seven_days_ago:
                        continue
                    total += 1
                    status = (data.get('status') or '').lower()
                    if status in ('resolved', 'closed'):
                        resolved += 1
                    itype = (data.get('category') or data.get('tags', ['other'])[
                             0] if data.get('tags') else 'other')
                    by_type[itype] = by_type.get(itype, 0) + 1
                    items.append({
                        'id': d.id,
                        'category': data.get('category'),
                        'priority': data.get('priority'),
                        'status': data.get('status'),
                        'location': data.get('location')
                    })

                stats = {
                    'total_new': total,
                    'resolved': resolved,
                    'pending': max(0, total - resolved),
                    'by_type': by_type,
                }
                bullets = weekly_summary_bullets(stats, items)
                report = {
                    'generated_at': __import__('firebase_admin').firestore.SERVER_TIMESTAMP,
                    'period_days': 7,
                    'stats': stats,
                    'bullets': bullets,
                }
                db.collection('reports').document('weekly_summary').set(report)
            except Exception as e:
                print(f"Summary generation error: {e}")

        # Run every 24 hours
        scheduler.add_job(_generate_daily_summary, 'interval',
                          hours=24, id='daily_summary')
        scheduler.start()

        # Expose manual trigger endpoint under admin
        @app.route('/api/admin/generate-report', methods=['POST'])
        def manual_generate_report():
            _generate_daily_summary()
            return {'ok': True}, 200
    except Exception as e:
        print(f"APScheduler not configured: {e}")

    # Debug endpoint to verify Storage configuration (dev-only)
    @app.route('/api/_debug/storage')
    def debug_storage():
        try:
            from services.firebase_service import get_storage
            info = {
                'bucket_name': None,
                'exists': None,
                'note': 'If exists is false, enable Firebase Storage in the Firebase Console for this project.'
            }
            bucket = get_storage()
            info['bucket_name'] = getattr(bucket, 'name', None)
            try:
                info['exists'] = bucket.exists()
            except Exception as e:
                info['exists'] = False
                info['error'] = str(e)
            return info, 200
        except Exception as e:
            return {'error': str(e)}, 500

    # Firestore connectivity debug (dev-only)
    @app.route('/api/_debug/firestore')
    def debug_firestore():
        try:
            from services.firebase_service import get_firestore
            db = get_firestore()
            db.collection('_debug').document('_ping').get()
            return {'ok': True}, 200
        except Exception as e:
            return {'ok': False, 'error': str(e)}, 503

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'CityFix API is running'}, 200

    # Root endpoint
    @app.route('/')
    def index():
        return {
            'name': 'CityFix API',
            'version': '1.0.0',
            'description': 'Civic Issue Tracker with AI-powered features'
        }, 200

    return app


if __name__ == '__main__':
    env = os.getenv('FLASK_ENV', 'development')
    app = create_app(env)
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'])
