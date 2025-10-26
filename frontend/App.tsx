"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Issue, IssueStatus, Priority } from './types';
import * as issueService from './services/issueService';
import Header from './components/Header';
import IssueForm from './components/IssueForm';
import IssueList from './components/IssueList';
import Chatbot from './components/Chatbot';
import AuthPage from './components/AuthPage';
import { getChatbotResponse } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';
import { db } from './services/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, limit } from "firebase/firestore";

type View = 'dashboard' | 'report';

const App: React.FC = () => {
  const { currentUser } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Set up real-time listener for issues from Firestore
  useEffect(() => {
    if (!currentUser) {
      // If there's no user, don't try to fetch data
      setIsLoading(false);
      setIssues([]);
      return;
    };

    // --- Seeding Logic ---
    // Check if the database has any issues, if not, seed it with sample data.
    // This makes the app experience better for the first run.
    const checkForInitialData = async () => {
        const issuesCollectionRef = collection(db, 'issues');
        const q = query(issuesCollectionRef, limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("Database is empty. Seeding with initial data...");
            await issueService.seedInitialIssues();
        }
    };

    setIsLoading(true);
    checkForInitialData();
    // --- End of Seeding Logic ---

    const issuesCollectionRef = collection(db, 'issues');
    const q = query(issuesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedIssues: Issue[] = [];
      querySnapshot.forEach((doc) => {
        loadedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(loadedIssues);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching issues from Firestore: ", error);
        setIsLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [currentUser]);

  const handleNewIssueAdded = () => {
    // No need to manually add the issue to state anymore,
    // the real-time listener will do it automatically.
    setCurrentView('dashboard');
  };

  const handleIssueStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    // The UI will update automatically thanks to the onSnapshot listener.
    // We just need to call the update service.
    await issueService.updateIssueStatus(issueId, newStatus);
  };

  const handleIssuePriorityChange = async (issueId: string, newPriority: Priority) => {
    // UI updates are handled by the real-time listener.
    await issueService.updateIssuePriority(issueId, newPriority);
  };
  
  const handleChatbotQuery = async (query: string): Promise<string> => {
      // The chatbot uses a one-time fetch, so we check for an ID in the query.
      // This is a simplified regex to find Firestore-like IDs.
      const idMatch = query.match(/\b[a-zA-Z0-9]{20}\b/);
      return await getChatbotResponse(idMatch ? idMatch[0] : '');
  };

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-brand-gray text-brand-dark">
      <Header currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser} />
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {currentView === 'dashboard' ? (
          <IssueList 
            issues={issues} 
            isLoading={isLoading} 
            currentUser={currentUser} 
            onStatusChange={handleIssueStatusChange} 
            onPriorityChange={handleIssuePriorityChange}
          />
        ) : (
          <IssueForm onIssueAdded={handleNewIssueAdded} />
        )}
      </main>
      <Chatbot onSendMessage={handleChatbotQuery} />
    </div>
  );
};

export default App;