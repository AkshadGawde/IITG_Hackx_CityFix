import { Issue, Priority, ActionPlan } from '../types';
import { getIssueById } from './issueService';

export const analyzeIssue = async (description: string, imageBase64: string, imageMimeType: string): Promise<{ tags: string[]; summary: string; priority: Priority }> => {
  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, imageBase64, imageMimeType }),
    });
    if (!res.ok) throw new Error(`Gemini analyze failed: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error analyzing issue from Gemini:', error);
    return {
      tags: ['issue'],
      summary: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      priority: Priority.MEDIUM,
    };
  }
};

export const suggestActionPlan = async (issue: Issue): Promise<ActionPlan> => {
  const res = await fetch('/api/gemini/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issue }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Failed to generate action plan: ${msg}`);
  }
  return await res.json();
};


export const getChatbotResponse = async (issueId: string): Promise<string> => {
  if (!issueId) {
    return "Please provide a report ID (e.g., 'What is the status of a report? Please include the full ID.').";
  }
  
  const issue = await getIssueById(issueId.trim());

  if (issue) {
    return `Report ${issue.id} ( "${issue.title}" ) is currently marked as: ${issue.status}. It was reported on ${new Date(issue.createdAt).toLocaleDateString()}.`;
  } else {
    return `Sorry, I could not find any report with the ID "${issueId}". Please check the ID and try again.`;
  }
};