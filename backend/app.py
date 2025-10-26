"""Main Flask application for CityFix backend."""
from flask import Flask
from flask_cors import CORS
from config import config
import os


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
