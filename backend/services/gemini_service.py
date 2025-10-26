"""Gemini AI service for vision and text generation and analytics.

This module centralizes all Gemini calls and provides typed helper
functions the rest of the backend can use. Where feasible, we request
structured JSON outputs to simplify downstream parsing.
"""
import google.generativeai as genai
from config import Config
import os
from typing import Any, Dict, List, Optional, Tuple
import math
import numpy as np


# Configure Gemini API
genai.configure(api_key=Config.GEMINI_API_KEY or os.getenv('GEMINI_API_KEY'))


def analyze_image(image_data, prompt, *, response_mime_type: Optional[str] = None, response_schema: Optional[dict] = None):
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
        generation_config = {}
        if response_mime_type:
            generation_config['response_mime_type'] = response_mime_type
        if response_schema:
            generation_config['response_schema'] = response_schema

        if generation_config:
            response = model.generate_content(
                [prompt, image_data], generation_config=generation_config)
        else:
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


def generate_text(prompt, *, response_mime_type: Optional[str] = None, response_schema: Optional[dict] = None):
    """
    Generate text using Gemini API.

    Args:
        prompt: Text prompt

    Returns:
        dict: Generated text result
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        generation_config = {}
        if response_mime_type:
            generation_config['response_mime_type'] = response_mime_type
        if response_schema:
            generation_config['response_schema'] = response_schema

        if generation_config:
            response = model.generate_content(
                prompt, generation_config=generation_config)
        else:
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


# --------------------- New helpers for hackathon features ---------------------

def classify_issue(image_data, description: str) -> Dict[str, Any]:
    """Classify the issue category with a confidence, using image and text.

    Returns
    -------
    {"category": str, "confidence": float}
    """
    prompt = (
        "Classify this civic complaint into one of the categories: "
        "Pothole, Garbage, Streetlight, Drainage, Water Supply, Road Damage, Graffiti, Road Sign, Tree, Other.\n"
        "Use both the image and the provided description. Return JSON with keys "
        "category (string) and confidence (0.0-1.0)."
        f"\nDescription: {description}"
    )
    schema = {
        "type": "object",
        "properties": {
            "category": {"type": "string"},
            "confidence": {"type": "number"}
        },
        "required": ["category", "confidence"]
    }
    res = analyze_image(
        image_data, prompt, response_mime_type="application/json", response_schema=schema)
    if not res.get('success'):
        return {"category": "Other", "confidence": 0.0, "error": res.get('error')}
    try:
        return {**{"category": "Other", "confidence": 0.0}, **__safe_json_parse(res['result'])}
    except Exception:
        return {"category": "Other", "confidence": 0.0}


def get_text_embedding(text: str) -> Optional[List[float]]:
    """Get text embedding vector using Gemini embeddings."""
    try:
        emb = genai.embed_content(model='text-embedding-004', content=text)
        return emb["embedding"]["values"] if isinstance(emb, dict) else emb.embedding.values
    except Exception:
        return None


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a = np.array(v1, dtype=float)
    b = np.array(v2, dtype=float)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def image_similarity_score(image1, image2) -> float:
    """Approximate image similarity using Gemini with a targeted prompt.

    Returns a float 0..1 where 1 is very similar.
    """
    prompt = (
        "Compare these two images and output ONLY a JSON object with a field "
        "'similarity' as a value between 0.0 and 1.0 indicating if they depict the same civic issue."
    )
    schema = {
        "type": "object",
        "properties": {"similarity": {"type": "number"}},
        "required": ["similarity"]
    }
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        generation_config = {
            'response_mime_type': 'application/json',
            'response_schema': schema
        }
        # Note: Python SDK accepts a list of parts; we pass prompt then both images
        resp = model.generate_content(
            [prompt, image1, image2], generation_config=generation_config)
        data = __safe_json_parse(resp.text)
        sim = float(data.get('similarity', 0.0))
        return max(0.0, min(1.0, sim))
    except Exception:
        return 0.0


def assess_severity(description: str, category: Optional[str] = None) -> Dict[str, Any]:
    """Assess severity and reason from text (and optional category)."""
    prompt = (
        "Analyze this civic issue and assign a severity rating of High, Medium, or Low. "
        "Also provide a short reason. Return JSON with 'severity' and 'reason'.\n"
        f"Category: {category or 'Unknown'}\n"
        f"Description: {description}"
    )
    schema = {
        "type": "object",
        "properties": {
            "severity": {"type": "string", "enum": ["High", "Medium", "Low"]},
            "reason": {"type": "string"}
        },
        "required": ["severity", "reason"]
    }
    res = generate_text(
        prompt, response_mime_type="application/json", response_schema=schema)
    if not res.get('success'):
        return {"severity": "Medium", "reason": "AI unavailable"}
    try:
        data = __safe_json_parse(res['result'])
        sev = data.get('severity') or 'Medium'
        if sev not in ("High", "Medium", "Low"):
            sev = 'Medium'
        return {"severity": sev, "reason": data.get('reason', '')}
    except Exception:
        return {"severity": "Medium", "reason": "Parsing error"}


def weekly_summary_bullets(stats: Dict[str, Any], complaints: List[Dict[str, Any]]) -> List[str]:
    """Generate 3 concise bullet points summarizing the period."""
    prompt = (
        "Summarize civic complaints this week in 3 concise bullet points including: "
        "total new complaints, most frequent issue types, areas with high activity, % resolved vs pending, and notable trends. "
        "Return ONLY a JSON array of 3 short strings.\n\n"
        f"Stats: {stats}\n\nSamples: {complaints[:50]}"
    )
    schema = {"type": "array", "items": {"type": "string"}}
    res = generate_text(
        prompt, response_mime_type="application/json", response_schema=schema)
    if not res.get('success'):
        return []
    try:
        arr = __safe_json_parse(res['result'])
        if isinstance(arr, list):
            # trim to 3
            return [str(x) for x in arr][:3]
        return []
    except Exception:
        return []


def __safe_json_parse(text: str):
    import json
    return json.loads(text.strip())
