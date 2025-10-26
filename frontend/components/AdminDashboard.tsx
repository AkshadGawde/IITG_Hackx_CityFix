"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { Issue, IssueStatus, Priority, User } from '../types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import IssueList from './IssueList';
import * as issueService from '../services/issueService';
import Link from 'next/link';

const Stat: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-lg shadow-sm bg-white ${color ?? ''}`}>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoadingIssues(true);
    const colRef = collection(db, 'issues');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr: Issue[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setIssues(arr);
      setLoadingIssues(false);
    }, () => setLoadingIssues(false));
    return () => unsub();
  }, [currentUser]);

  const stats = useMemo(() => {
    const s = {
      total: issues.length,
      pending: issues.filter(i => i.status === IssueStatus.PENDING).length,
      inProgress: issues.filter(i => i.status === IssueStatus.IN_PROGRESS).length,
      resolved: issues.filter(i => i.status === IssueStatus.RESOLVED).length,
    };
    return s;
  }, [issues]);

  const handleStatusChange = useCallback(async (issueId: string, newStatus: IssueStatus) => {
    await issueService.updateIssueStatus(issueId, newStatus);
  }, []);

  const handlePriorityChange = useCallback(async (issueId: string, newPriority: Priority) => {
    await issueService.updateIssuePriority(issueId, newPriority);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin mx-auto h-10 w-10 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-bold text-brand-dark">Admin access required</h2>
          <p className="text-gray-600 mt-2">You must be signed in as an admin to view this page.</p>
          <Link href="/" className="mt-4 inline-block px-4 py-2 bg-brand-blue text-white rounded-md">Go to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray text-brand-dark">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Link href="/" className="text-brand-blue hover:underline">Back to App</Link>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Total" value={stats.total} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="In Progress" value={stats.inProgress} />
          <Stat label="Resolved" value={stats.resolved} />
        </div>

        <IssueList 
          issues={issues}
          isLoading={loadingIssues}
          currentUser={currentUser as User}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
