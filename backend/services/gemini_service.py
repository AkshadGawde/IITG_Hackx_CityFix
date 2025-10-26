"""Gemini AI service for vision and text generation and analytics.

This module centralizes all Gemini calls and provides typed helper
functions the rest of the backend can use. Where feasible, we request
structured JSON outputs to simplify downstream parsing.
"""
from config import Config
import os
from typing import Any, Dict, List, Optional
import math
import json
import google.generativeai as genai


# Configure Gemini API
try:
    genai.configure(api_key=Config.GEMINI_API_KEY or os.getenv(
        'GEMINI_API_KEY'))  # type: ignore[attr-defined]
except Exception:
    # Defer failure to call-time; functions will return safe defaults
    pass


def analyze_image(image_data, prompt, *, expect_json: bool = False):
    """
    Analyze image using Gemini Vision API.

    Args:
        image_data: Image file data (bytes or PIL Image)
        prompt: Text prompt for analysis

    Returns:
        dict: Analysis result
    """
    try:
        # type: ignore[attr-defined]
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, image_data])
        text = (response.text or '').strip()
        if expect_json:
            try:
                return {'success': True, 'result': json.loads(text)}
            except Exception:
                # Try to extract JSON substring
                start = text.find('{')
                end = text.rfind('}')
                if start != -1 and end != -1 and end > start:
                    try:
                        return {'success': True, 'result': json.loads(text[start:end+1])}
                    except Exception:
                        pass
        return {'success': True, 'result': text}
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def generate_text(prompt, *, expect_json: bool = False):
    """
    Generate text using Gemini API.

    Args:
        prompt: Text prompt

    Returns:
        dict: Generated text result
    """
    try:
        # type: ignore[attr-defined]
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = (response.text or '').strip()
        if expect_json:
            try:
                return {'success': True, 'result': json.loads(text)}
            except Exception:
                start = text.find('[') if '[' in text else text.find('{')
                end = text.rfind(']') if ']' in text else text.rfind('}')
                if start != -1 and end != -1 and end > start:
                    try:
                        return {'success': True, 'result': json.loads(text[start:end+1])}
                    except Exception:
                        pass
        return {'success': True, 'result': text}
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
    res = analyze_image(image_data, prompt +
                        "\nReturn ONLY JSON.", expect_json=True)
    if not res.get('success'):
        return {"category": "Other", "confidence": 0.0, "error": res.get('error')}
    data = res.get('result') or {}
    category = str(data.get('category') or 'Other')
    try:
        confidence = float(data.get('confidence', 0.0))
    except Exception:
        confidence = 0.0
    return {"category": category, "confidence": max(0.0, min(1.0, confidence))}


def get_text_embedding(text: str) -> Optional[List[float]]:
    """Get text embedding vector using Gemini embeddings."""
    try:
        # Model name format can vary; use getattr to avoid static typing issues
        emb_fn = getattr(genai, 'embed_content', None)
        if not callable(emb_fn):
            return None
        try:
            res = emb_fn(model='text-embedding-004', content=text)
        except Exception:
            res = emb_fn(model='models/text-embedding-004', content=text)

        # Normalize output
        if isinstance(res, dict):
            emb = res.get('embedding')
            if isinstance(emb, dict):
                vals = emb.get('values')
                if isinstance(vals, list):
                    return [float(x) for x in vals]
        # Some SDKs return an object with .embedding.values
        emb_obj = getattr(res, 'embedding', None)
        vals = getattr(emb_obj, 'values', None)
        if vals:
            return [float(x) for x in vals]
        return None
    except Exception:
        return None


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0
    n = min(len(v1), len(v2))
    a = [float(x) for x in v1[:n]]
    b = [float(x) for x in v2[:n]]
    dot = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    denom = na * nb
    return float(dot/denom) if denom else 0.0


def image_similarity_score(image1, image2) -> float:
    """Approximate image similarity using Gemini with a targeted prompt.

    Returns a float 0..1 where 1 is very similar.
    """
    prompt = (
        "Compare these two images and output ONLY a JSON object with a field "
        "'similarity' as a value between 0.0 and 1.0 indicating if they depict the same civic issue."
    )
    try:
        # type: ignore[attr-defined]
        model = genai.GenerativeModel('gemini-1.5-flash')
        resp = model.generate_content(
            [prompt + " Return ONLY JSON.", image1, image2])
        text = (resp.text or '').strip()
        data = __safe_json_parse(text)
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
    res = generate_text(prompt + "\nReturn ONLY JSON.", expect_json=True)
    if not res.get('success'):
        return {"severity": "Medium", "reason": "AI unavailable"}
    data = res.get('result') or {}
    sev = str(data.get('severity') or 'Medium')
    if sev not in ("High", "Medium", "Low"):
        sev = 'Medium'
    return {"severity": sev, "reason": str(data.get('reason') or '')}


def weekly_summary_bullets(stats: Dict[str, Any], complaints: List[Dict[str, Any]]) -> List[str]:
    """Generate 3 concise bullet points summarizing the period."""
    prompt = (
        "Summarize civic complaints this week in 3 concise bullet points including: "
        "total new complaints, most frequent issue types, areas with high activity, % resolved vs pending, and notable trends. "
        "Return ONLY a JSON array of 3 short strings.\n\n"
        f"Stats: {stats}\n\nSamples: {complaints[:50]}"
    )
    res = generate_text(prompt + "\nReturn ONLY a JSON array of 3 strings.")
    if not res.get('success'):
        return []
    try:
        arr = __safe_json_parse(res['result'])
        if isinstance(arr, list):
            return [str(x) for x in arr][:3]
        return []
    except Exception:
        return []


def __safe_json_parse(text: str):
    text = (text or '').strip()
    try:
        return json.loads(text)
    except Exception:
        # Attempt substring extraction
        s = text.find('{')
        e = text.rfind('}')
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s:e+1])
            except Exception:
                pass
        s = text.find('[')
        e = text.rfind(']')
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s:e+1])
            except Exception:
                pass
        return {}
