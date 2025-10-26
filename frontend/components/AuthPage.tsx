import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as authService from '../services/authService';
import { User } from '../types';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await authService.login(email, password, role);
        if (!user) throw new Error("Invalid credentials or role selection.");
      } else {
        user = await authService.signUp(email, password, role);
      }
      setCurrentUser(user);
    } catch (err: any) {
      console.error("Auth Error:", err);
      // More specific error handling
      if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission'))) {
          setError("Database permission error. Please check your Firestore security rules in the Firebase console. This is a required setup step.");
      } else if (err.code === 'auth/configuration-not-found') {
          setError("Firebase Authentication is not configured. Please go to your Firebase Console, navigate to Authentication -> Sign-in method, and enable the 'Email/Password' provider.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError("Invalid email, password, or role selection. Please check your credentials and try again.");
      } else if (err.code === 'auth/email-already-in-use') {
          setError("An account with this email address already exists. Please try logging in or use a different email.");
      } else {
          setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const RoleSelector: React.FC = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isLogin ? 'Log in as:' : 'Sign up as:'}
      </label>
      <div className="flex w-full rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => setRole('user')}
          className={`w-1/2 rounded-l-md px-4 py-2 text-sm font-medium border ${
            role === 'user'
              ? 'bg-brand-blue text-white border-brand-blue z-10'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          User
        </button>
        <button
          type="button"
          onClick={() => setRole('admin')}
          className={`w-1/2 -ml-px rounded-r-md px-4 py-2 text-sm font-medium border ${
            role === 'admin'
              ? 'bg-brand-blue text-white border-brand-blue z-10'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-gray flex flex-col justify-center items-center p-4">
      <div className="flex items-center gap-3 mb-8">
          <svg className="w-10 h-10 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-dark">RIFI (Report It, Fix It)</h1>
      </div>
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-brand-dark mb-2">{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
        <p className="text-center text-gray-500 mb-6">{isLogin ? 'Log in to continue' : 'Sign up to start reporting issues'}</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <RoleSelector />
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 text-center p-2 bg-red-50 rounded-md border border-red-200">{error}</p>}

          <div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-blue hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400">
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-medium text-brand-blue hover:text-brand-dark ml-1">
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
      <div className="text-center mt-4 max-w-md text-xs text-gray-500">
        <p>These test accounts don't exist by default. You must <strong className="font-medium">Sign Up</strong> with them first.</p>
        <p><strong className="font-medium">Admin:</strong> admin@city.com / adminpassword</p>
        <p><strong className="font-medium">User:</strong> user@example.com / userpassword</p>
      </div>
    </div>
  );
};

export default AuthPage;