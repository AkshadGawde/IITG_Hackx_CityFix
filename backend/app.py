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
            "origins": app.config['FRONTEND_URL'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Initialize Firebase
    from services.firebase_service import initialize_firebase
    initialize_firebase(app.config['FIREBASE_CREDENTIALS_PATH'])

    # Register blueprints
    from routes import auth_bp, complaints_bp, admin_bp, ai_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(complaints_bp, url_prefix='/api/complaints')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

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
