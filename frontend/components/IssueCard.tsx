import React, { useEffect, useState } from 'react';
import { Issue, User, IssueStatus, Priority } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import * as geminiService from '../services/geminiService';
import * as issueService from '../services/issueService';
import ActionPlanModal from './ActionPlanModal';

interface IssueCardProps {
  issue: Issue;
  currentUser: User;
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onPriorityChange: (issueId: string, newPriority: Priority) => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, currentUser, onStatusChange, onPriorityChange }) => {
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const timeAgo = (date: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  // Compute relative time on the client after mount to avoid SSR hydration mismatches.
  const [relativeReportedTime, setRelativeReportedTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setRelativeReportedTime(timeAgo(issue.createdAt));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [issue.createdAt]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(issue.id, e.target.value as IssueStatus);
  };
    
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPriorityChange(issue.id, e.target.value as Priority);
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setGenerationError(null);
    try {
      const plan = await geminiService.suggestActionPlan(issue);
      await issueService.updateIssueActionPlan(issue.id, plan);
      // The onSnapshot listener in App.tsx will automatically update the UI
    } catch (err: any) {
      setGenerationError(err.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const AdminControls = () => (
    <div className="flex flex-col items-end gap-2 flex-shrink-0">
      <select
        value={issue.status}
        onChange={handleStatusChange}
        className={`text-xs font-semibold rounded-full border cursor-pointer focus:ring-2 focus:ring-brand-blue focus:outline-none ${STATUS_COLORS[issue.status]}`}
        style={{ WebkitAppearance: 'none', appearance: 'none', padding: '0.25rem 0.75rem' }}
      >
        <option value={IssueStatus.PENDING}>Pending</option>
        <option value={IssueStatus.IN_PROGRESS}>In Progress</option>
        <option value={IssueStatus.RESOLVED}>Resolved</option>
      </select>
      <select
        value={issue.priority}
        onChange={handlePriorityChange}
        className={`text-xs font-semibold rounded-full border cursor-pointer focus:ring-2 focus:ring-brand-blue focus:outline-none ${PRIORITY_COLORS[issue.priority]}`}
        style={{ WebkitAppearance: 'none', appearance: 'none', padding: '0.25rem 0.75rem' }}
      >
        <option value={Priority.LOW}>Low</option>
        <option value={Priority.MEDIUM}>Medium</option>
        <option value={Priority.HIGH}>High</option>
        <option value={Priority.CRITICAL}>Critical</option>
      </select>
    </div>
  );

  const UserDisplay = () => (
     <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[issue.status]}`}>{issue.status}</span>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${PRIORITY_COLORS[issue.priority]}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 01-1-1V6z" clipRule="evenodd" /></svg>
            {issue.priority} Priority
        </span>
     </div>
  );

  return (
    <>
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-2xl flex flex-col">
      <img className="h-48 w-full object-cover" src={issue.photoUrl} alt={issue.title} />
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="text-lg font-bold text-brand-dark leading-tight flex-1">{issue.title}</h3>
            {currentUser.role === 'admin' ? <AdminControls /> : <UserDisplay />}
        </div>
        
        <p className="text-sm text-gray-600 mb-4 flex-grow italic">"{issue.summary}"</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {issue.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">#{tag}</span>
          ))}
        </div>
        
        {currentUser.role === 'admin' && (
          <div className="my-2">
            {issue.actionPlan ? (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-sm font-semibold text-green-800">Action Plan Created</p>
                <p className="text-xs text-green-700 mt-1">Crew: {issue.actionPlan.crew}</p>
                <button 
                  onClick={() => setShowPlanModal(true)} 
                  className="mt-2 text-sm font-bold text-green-800 hover:underline"
                >
                  View Full Plan
                </button>
              </div>
            ) : (
              <div>
                <button 
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-lightblue hover:bg-brand-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400"
                >
                  {isGeneratingPlan ? (
                    <>
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Generating Plan...
                    </>
                  ) : 'Suggest Action Plan'}
                </button>
                {generationError && <p className="text-xs text-red-600 mt-1">{generationError}</p>}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-2">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v5.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L11 10.414V5z" clipRule="evenodd" /></svg>
            <span className="font-mono">{issue.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            <span>{issue.location ? `${issue.location.lat.toFixed(4)}, ${issue.location.lon.toFixed(4)}` : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
            <span suppressHydrationWarning>
              Reported {relativeReportedTime ?? '...'}
            </span>
          </div>
        </div>
      </div>
    </div>
    {showPlanModal && issue.actionPlan && (
      <ActionPlanModal 
        plan={issue.actionPlan}
        issueId={issue.id}
        onClose={() => setShowPlanModal(false)} 
      />
    )}
    </>
  );
};

export default IssueCard;