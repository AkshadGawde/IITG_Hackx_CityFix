import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { description, imageBase64, imageMimeType } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const imagePart = {
      inlineData: {
        data: (imageBase64 as string).split(',')[1],
        mimeType: imageMimeType,
      },
    };

    const prompt = `Analyze the attached image and the user's description of a civic issue. Based on both, provide the following in JSON format:
    1. A short, one-sentence summary of the issue.
    2. An array of 3 to 5 relevant tags for categorization (e.g., 'pothole', 'street_light', 'sanitation', 'road_damage').
    3. A priority level for the issue. The priority can be one of: "Low", "Medium", "High", or "Critical". A fire, major accident, or exposed live wire should be "Critical". A large pothole on a busy road might be "High". A faded sign might be "Medium". Minor graffiti would be "Low".
    
    User's Description: "${description}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart as any, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            priority: { type: Type.STRING, enum: ['Low','Medium','High','Critical'] },
          },
        },
      },
    });

    const jsonText = response.text.trim();
    return NextResponse.json(JSON.parse(jsonText));
  } catch (err: any) {
    console.error('Gemini analyze error', err);
    return NextResponse.json({ error: err.message ?? 'Gemini error' }, { status: 500 });
  }
}
