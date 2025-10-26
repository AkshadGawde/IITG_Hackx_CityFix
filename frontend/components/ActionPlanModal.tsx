import React from 'react';
import { ActionPlan } from '../types';

interface ActionPlanModalProps {
  plan: ActionPlan;
  issueId: string;
  onClose: () => void;
}

const ActionPlanModal: React.FC<ActionPlanModalProps> = ({ plan, issueId, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-plan-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="p-6 border-b border-gray-200">
          <h2 id="action-plan-title" className="text-xl font-bold text-brand-dark">Suggested Action Plan</h2>
          <p className="text-sm text-gray-500 mt-1">For Report ID: <span className="font-mono">{issueId}</span></p>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-blue" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>
                Suggested Steps
            </h3>
            <ul className="list-decimal list-inside mt-2 space-y-2 text-sm text-gray-800 bg-gray-50 p-4 rounded-md">
              {plan.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-semibold text-gray-700">Required Crew</h4>
                <p className="text-lg font-bold text-brand-blue mt-1">{plan.crew}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-semibold text-gray-700">Estimated Resolution Time</h4>
                <p className="text-lg font-bold text-brand-blue mt-1">{plan.estimatedHours} Hours</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-b-lg text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPlanModal;