"""Routes package for CityFix API endpoints."""
from .auth import auth_bp
from .complaints import complaints_bp
from .admin import admin_bp
from .ai import ai_bp

__all__ = ['auth_bp', 'complaints_bp', 'admin_bp', 'ai_bp']
