import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { issue } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `An administrator needs an action plan for the following civic issue. Based on the details provided, generate a concise work order.
    
    Issue Title: "${issue.title}"
    Issue Summary: "${issue.summary}"
    Description: "${issue.description}"
    Priority: "${issue.priority}"
    Tags: ${(issue.tags || []).join(', ')}

    Please provide the following in JSON format:
    1. "steps": An array of 2-4 short, actionable steps to resolve the issue.
    2. "crew": The type of municipal crew that should be assigned (e.g., "Road Maintenance Crew", "Sanitation Department", "Electrical Services", "Parks and Recreation Team").
    3. "estimatedHours": A number representing the estimated hours to complete the work.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            crew: { type: Type.STRING },
            estimatedHours: { type: Type.NUMBER },
          },
        },
      },
    });

    const jsonText = response.text.trim();
    return NextResponse.json(JSON.parse(jsonText));
  } catch (err: any) {
    console.error('Gemini plan error', err);
    return NextResponse.json({ error: err.message ?? 'Gemini error' }, { status: 500 });
  }
}
