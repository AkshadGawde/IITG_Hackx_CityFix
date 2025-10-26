import React, { useState, useMemo } from 'react';
import { Issue, IssueStatus, User, Priority } from '../types';
import IssueCard from './IssueCard';
import MapDisplay from './MapDisplay';

interface IssueListProps {
  issues: Issue[];
  isLoading: boolean;
  currentUser: User;
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onPriorityChange: (issueId: string, newPriority: Priority) => void;
}

const FilterButton: React.FC<{
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
      isActive
        ? 'bg-brand-blue text-white shadow'
        : 'bg-white text-gray-700 hover:bg-gray-100'
    }`}
  >
    {label}
    <span className={`ml-2 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${isActive ? 'bg-white text-brand-blue' : 'bg-gray-200 text-gray-700'}`}>
      {count}
    </span>
  </button>
);

const IssueList: React.FC<IssueListProps> = ({ issues, isLoading, currentUser, onStatusChange, onPriorityChange }) => {
  const [filter, setFilter] = useState<'all' | IssueStatus>('all');

  const filteredIssues = useMemo(() => {
    if (filter === 'all') {
      return issues;
    }
    return issues.filter(issue => issue.status === filter);
  }, [issues, filter]);
  
  const statusCounts = useMemo(() => {
    return issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<IssueStatus, number>);
  }, [issues]);

  if (isLoading) {
    return (
        <div className="text-center py-10">
            <svg className="animate-spin mx-auto h-10 w-10 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="mt-2 text-gray-600">Loading issues...</p>
        </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-dark mb-4 text-center md:text-3xl">Issues Overview Map</h2>
      <MapDisplay issues={issues} />

      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        <FilterButton label="All Issues" count={issues.length} isActive={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterButton label="Pending" count={statusCounts[IssueStatus.PENDING] || 0} isActive={filter === IssueStatus.PENDING} onClick={() => setFilter(IssueStatus.PENDING)} />
        <FilterButton label="In Progress" count={statusCounts[IssueStatus.IN_PROGRESS] || 0} isActive={filter === IssueStatus.IN_PROGRESS} onClick={() => setFilter(IssueStatus.IN_PROGRESS)} />
        <FilterButton label="Resolved" count={statusCounts[IssueStatus.RESOLVED] || 0} isActive={filter === IssueStatus.RESOLVED} onClick={() => setFilter(IssueStatus.RESOLVED)} />
      </div>

      {filteredIssues.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredIssues.map(issue => (
            <IssueCard 
              key={issue.id} 
              issue={issue} 
              currentUser={currentUser} 
              onStatusChange={onStatusChange} 
              onPriorityChange={onPriorityChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No issues found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no issues matching the "{filter}" filter. Try another category or report a new issue!
            </p>
        </div>
      )}
    </div>
  );
};

export default IssueList;