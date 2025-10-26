import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

interface HeaderProps {
  currentView: 'dashboard' | 'report';
  setCurrentView: (view: 'dashboard' | 'report') => void;
  currentUser: User;
}

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ label, isActive, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-brand-blue text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
    }`}
  >
    {icon}
    {label}
  </button>
);


const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, currentUser }) => {
  const { logout } = useAuth();
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <h1 className="text-xl md:text-2xl font-bold text-brand-dark">RIFI</h1>
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <NavButton 
              label="Dashboard"
              isActive={currentView === 'dashboard'}
              onClick={() => setCurrentView('dashboard')}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
            />
            <NavButton 
              label="Report Issue"
              isActive={currentView === 'report'}
              onClick={() => setCurrentView('report')}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
            />
          </nav>
          <div className="flex items-center gap-3">
             <span className="text-sm text-gray-500 hidden md:block">{currentUser.email}</span>
             <button onClick={logout} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors" aria-label="Logout">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;