'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { api } from '@/lib/api';

const ISSUE_TYPES = [
  'Pothole',
  'Garbage',
  'Street Light',
  'Drainage',
  'Graffiti',
  'Road Sign',
  'Tree',
  'Water Supply',
  'Road Damage',
  'Other'
];

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function ReportPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    const initMap = () => {
      const defaultLocation = { lat: 19.076, lng: 72.8777 }; // Mumbai
      const map = new window.google.maps.Map(mapRef.current!, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
      });

      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: 'Issue Location',
        animation: window.google.maps.Animation.DROP,
      });

      // Update location when marker is dragged
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          setLocation({ lat: pos.lat(), lng: pos.lng() });
        }
      });

      // Update marker when map is clicked
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setLocation(defaultLocation);
      setMapLoaded(true);
    };

    // Load Google Maps API
    if (typeof window.google !== 'undefined') {
      initMap();
    } else {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        console.warn('Google Maps API key not configured');
        setMapLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps');
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    }
  }, [mapLoaded]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const autoDetectLocation = () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(pos);

        // Update map and marker
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter(pos);
          mapInstanceRef.current.setZoom(16);
          markerRef.current.setPosition(pos);
          markerRef.current.setAnimation(window.google.maps.Animation.BOUNCE);
          setTimeout(() => markerRef.current?.setAnimation(null), 2000);
        }

        setLocationLoading(false);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to report an issue');
      return;
    }

    if (!photo) {
      setError('Please upload a photo');
      return;
    }

    if (!location) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload photo to Firebase Storage
      const timestamp = Date.now();
      const fileName = `complaints/${user.uid}/${timestamp}_${photo.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, photo);
      const photoURL = await getDownloadURL(storageRef);

      // Submit complaint to backend
      const token = await getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await api.complaints.create(token, {
        type: issueType || 'auto',
        description,
        photo_url: photoURL,
        location,
      });

      setSuccess(true);
      
      // Redirect to complaint status page after 2 seconds
      setTimeout(() => {
        router.push(`/status/${result.complaint_id}`);
      }, 2000);

    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit complaint');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Report an Issue</h1>
            <p className="text-gray-600 mb-6">Please sign in to report an issue.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complaint Submitted!</h2>
            <p className="text-gray-600">Your complaint has been successfully submitted with AI analysis.</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to status page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
        <p className="text-gray-600 mb-8">Upload a photo and location to report a civic issue. AI will help categorize it.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type <span className="text-gray-400 font-normal">(optional - AI will detect)</span>
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">🤖 Auto-detect from image</option>
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Leave blank to let AI detect the issue type from your photo
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              required
              placeholder="Describe the issue in detail..."
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
              required
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg border-2 border-dashed border-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              📸 {photo ? 'Change Photo' : 'Take or Upload Photo'}
            </button>
            
            {photoPreview && (
              <div className="mt-4">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <button
              type="button"
              onClick={autoDetectLocation}
              disabled={locationLoading}
              className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 rounded-lg mb-4 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {locationLoading ? (
                <>
                  <span className="animate-spin">⟳</span> Detecting location...
                </>
              ) : (
                <>
                  📍 Auto-detect my location
                </>
              )}
            </button>

            {typeof window.google !== 'undefined' ? (
              <div
                ref={mapRef}
                className="w-full h-64 rounded-lg border-2 border-gray-300 shadow-inner"
              />
            ) : (
              <div className="w-full h-64 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">📍 Map not available (API key required)</p>
              </div>
            )}
            
            {location && (
              <div className="mt-2 bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">
                  📍 Selected location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Click on map or drag marker to adjust location
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !photo || !location}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span>
                Submitting & Analyzing...
              </span>
            ) : (
              'Submit Complaint'
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🤖 AI Features Active:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Auto-detect issue type from photo (Gemini Vision)</li>
            <li>✓ AI-generated summary and priority analysis</li>
            <li>✓ Smart location picker with GPS support</li>
            <li>✓ Real-time image preview</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
