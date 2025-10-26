import React, { useState, useRef } from 'react';
import { Issue } from '../types';
import * as issueService from '../services/issueService';
import * as geminiService from '../services/geminiService';

interface IssueFormProps {
  onIssueAdded: () => void;
}

const IssueForm: React.FC<IssueFormProps> = ({ onIssueAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<'idle' | 'analyzing' | 'uploading' | 'submitting'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    setIsFetchingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsFetchingLocation(false);
      },
      (err) => {
        setError(`Error getting location: ${err.message}`);
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !photo || !location) {
      setError('Please fill in all fields, upload a photo, and provide your location.');
      return;
    }
    setError(null);

    try {
      setSubmissionStep('analyzing');
      const { tags, summary, priority } = await geminiService.analyzeIssue(description, photoPreview!, photo.type);
      
      setSubmissionStep('uploading');
      setUploadProgress(0);
      const newIssueData = {
        title,
        description,
        summary,
        photoFile: photo,
        tags,
        priority,
        location,
      };

      await issueService.addIssue(newIssueData, (progress) => {
        setUploadProgress(progress);
      });
      setSubmissionStep('submitting');
      onIssueAdded();

    } catch (err: any) {
      console.error("Submission Error:", err);
      // Check for specific Firebase Storage errors
      if (err.code === 'storage/unauthorized') {
          setError("Submission failed due to a permissions error. Please update your Firebase Storage security rules to allow uploads. This is a necessary one-time setup step.");
      } else if (err.code === 'storage/bucket-not-found' || err.code === 'storage/project-not-found') {
          setError("Submission failed: Firebase Storage has not been activated. Please go to your Firebase Console, find the Storage section, and click the 'Get Started' button to enable it. The upload will work immediately after that.");
      } else if (err.code === 'storage/retry-limit-exceeded') {
          setError("The upload timed out. This may be due to a slow network connection or a misconfiguration of your Firebase project's 'storageBucket' URL. Please verify your connection and config settings.");
      } else if (err.name === 'UploadTimeout') {
          setError("The upload took too long and timed out. This often happens if Firebase Storage is not enabled or if the `storageBucket` URL in your configuration is incorrect. Please double-check your Firebase project setup and your network connection.");
      }
      // Check for specific Firestore errors
      else if (err.code === 'permission-denied') {
          setError("Submission failed: Firestore permission denied. Please check your security rules to ensure authenticated users can create documents in the 'issues' collection.");
      }
      else {
          setError(`An error occurred: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setSubmissionStep('idle');
      setUploadProgress(0);
    }
  };
  
  const getButtonText = () => {
      switch(submissionStep) {
          case 'analyzing':
              return 'Analyzing with AI...';
          case 'uploading':
              if (uploadProgress < 100) {
                 return `Uploading Photo (${uploadProgress}%)...`;
              }
              return 'Finalizing Report...';
          case 'submitting':
              return 'Saving Report...';
          default:
              return 'Submit Report';
      }
  }
  
  const isSubmitting = submissionStep !== 'idle';

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-brand-dark mb-6">Report a New Issue</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Issue Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
            placeholder="e.g., Large Pothole on Main St"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
            placeholder="Provide details about the issue..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Photo of the Issue</label>
          <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Issue preview" className="mx-auto h-48 w-auto rounded-lg" />
              ) : (
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-blue hover:text-brand-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-blue">
                  <span>{photo ? 'Change photo' : 'Upload a photo'}</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handlePhotoChange} ref={fileInputRef} required/>
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <div className="mt-1">
            <button type="button" onClick={handleGetLocation} disabled={isFetchingLocation} className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-lightblue hover:bg-brand-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400">
              {isFetchingLocation ? (
                 <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Fetching...
                 </>
              ) : 'Get Current Location'}
            </button>
            {location && (
              <p className="mt-2 text-sm text-green-600">Location captured: {location.lat.toFixed(5)}, {location.lon.toFixed(5)}</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-4">
          <button type="submit" disabled={isSubmitting} className="w-full relative overflow-hidden flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-blue hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:bg-gray-400">
            <div className="flex items-center gap-2 z-10">
                {isSubmitting && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                <span>{getButtonText()}</span>
            </div>
             {submissionStep === 'uploading' && (
                <div 
                    className="absolute top-0 left-0 h-full bg-blue-700 transition-all duration-150 ease-linear" 
                    style={{ width: `${uploadProgress}%` }}
                ></div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IssueForm;