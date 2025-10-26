
import { IssueStatus, Priority } from './types';

export const STATUS_COLORS: Record<IssueStatus, string> = {
  [IssueStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [IssueStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-300',
  [IssueStatus.RESOLVED]: 'bg-green-100 text-green-800 border-green-300',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
    [Priority.LOW]: 'bg-gray-100 text-gray-800 border-gray-300',
    [Priority.MEDIUM]: 'bg-orange-100 text-orange-800 border-orange-300',
    [Priority.HIGH]: 'bg-red-100 text-red-800 border-red-300',
    [Priority.CRITICAL]: 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse',
};

export const STATUS_MARKER_COLORS: Record<IssueStatus, string> = {
  [IssueStatus.PENDING]: '#FBBF24', // Tailwind yellow-400
  [IssueStatus.IN_PROGRESS]: '#60A5FA', // Tailwind blue-400
  [IssueStatus.RESOLVED]: '#4ADE80', // Tailwind green-400
};
