"""Gemini AI service for vision and text generation."""
import google.generativeai as genai
from config import Config
import os


# Configure Gemini API
genai.configure(api_key=Config.GEMINI_API_KEY or os.getenv('GEMINI_API_KEY'))


def analyze_image(image_data, prompt):
    """
    Analyze image using Gemini Vision API.
    
    Args:
        image_data: Image file data (bytes or PIL Image)
        prompt: Text prompt for analysis
    
    Returns:
        dict: Analysis result
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, image_data])
        return {
            'success': True,
            'result': response.text
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def generate_text(prompt):
    """
    Generate text using Gemini API.
    
    Args:
        prompt: Text prompt
    
    Returns:
        dict: Generated text result
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return {
            'success': True,
            'result': response.text
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def predict_issue_type(image_data):
    """Predict civic issue type from image."""
    prompt = """Analyze this civic infrastructure image and classify it into ONE of these categories:
    - pothole
    - streetlight
    - garbage
    - drainage
    - water_supply
    - road_damage
    - other
    
    Respond with ONLY the category name, nothing else."""
    
    return analyze_image(image_data, prompt)


def generate_summary_and_priority(description, issue_type):
    """Generate complaint summary and suggest priority."""
    prompt = f"""Given this civic complaint:
    Type: {issue_type}
    Description: {description}
    
    Provide:
    1. A concise 1-sentence summary
    2. Priority level (low/medium/high) with brief justification
    
    Format:
    SUMMARY: [your summary]
    PRIORITY: [level] - [reason]"""
    
    return generate_text(prompt)


def verify_resolution(before_image, after_image, issue_type):
    """Compare before/after images to verify issue resolution."""
    prompt = f"""Compare these before and after images of a {issue_type} civic issue.
    
    Determine if the issue has been resolved. Provide:
    1. Resolution status (resolved/not_resolved/partially_resolved)
    2. Confidence score (0-100)
    3. Brief explanation
    
    Format:
    STATUS: [status]
    CONFIDENCE: [score]
    EXPLANATION: [brief explanation]"""
    
    # Note: Gemini can handle multiple images in one call
    return analyze_image([before_image, after_image], prompt)


def generate_insights(complaints_data):
    """Generate insights from aggregated complaints data."""
    prompt = f"""Analyze this civic complaints data and provide insights:
    
    {complaints_data}
    
    Provide:
    1. Top 3 trending issues
    2. Geographic hotspots
    3. Time-based patterns
    4. Actionable recommendations
    
    Keep it concise and data-driven."""
    
    return generate_text(prompt)


def chatbot_response(user_query, context_data):
    """Generate chatbot response for user queries."""
    prompt = f"""You are a helpful assistant for CityFix, a civic complaint platform.
    
    User query: {user_query}
    Context: {context_data}
    
    Provide a clear, concise, and helpful response. If asked about complaint status, 
    format it nicely with relevant details."""
    
    return generate_text(prompt)
