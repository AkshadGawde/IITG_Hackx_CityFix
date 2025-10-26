





import React, { useEffect, useRef, useState } from 'react';
import { Issue } from '../types';
import { STATUS_MARKER_COLORS } from '../constants';
import { firebaseConfig } from '../services/firebase';

// Add TypeScript declaration for google maps and the auth failure handler
declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
  }
}

interface MapDisplayProps {
  issues: Issue[];
}

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      return resolve();
    }
    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
       const interval = setInterval(() => {
         if (window.google && window.google.maps) {
           clearInterval(interval);
           resolve();
         }
       }, 100);
       return;
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps script could not be loaded. Please check your network connection.'));
    document.head.appendChild(script);
  });
};

const MapDisplay: React.FC<MapDisplayProps> = ({ issues }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const isPlaceholderKey = firebaseConfig.apiKey === "YOUR_API_KEY_HERE" || !firebaseConfig.apiKey;

  // Effect to load Google Maps script and handle errors
  useEffect(() => {
    // This will be called by the Google Maps script if the key is invalid or billing is not enabled.
    window.gm_authFailure = () => {
      setMapError(
        'Google Maps Authentication Error. Please check the following in your Google Cloud Console for this project: 1) The "Maps JavaScript API" is enabled. 2) A billing account is linked to the project. 3) The API key has no restrictive HTTP referrers, or the current URL is allowed. For more details, open your browser\'s developer console.'
      );
    };

    if (isPlaceholderKey) {
        setMapError("The map requires a valid API key. Please open the 'services/firebase.ts' file and replace the placeholder 'YOUR_API_KEY_HERE' with the actual Web API Key from your Firebase project's settings. Note: Login may work without this, but the map will not.");
        return;
    }

    if (firebaseConfig.apiKey) {
      loadGoogleMapsScript(firebaseConfig.apiKey)
        .then(() => setIsScriptLoaded(true))
        .catch(error => {
          console.error(error);
          setMapError(`${error.message} For more details, check your browser's developer console (F12) for specific errors from Google Maps.`);
        });
    } else {
        // This case is covered by isPlaceholderKey, but kept for safety.
        const errorMsg = "Google Maps could not be loaded. The API key is missing from the 'services/firebase.ts' configuration file.";
        console.error(errorMsg);
        setMapError(errorMsg);
    }

    // Cleanup function to remove the global handler when the component unmounts.
    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  // Effect to initialize map and update markers
  useEffect(() => {
    // Only proceed if the script is loaded, there is no error, and the map div is ready.
    if (isScriptLoaded && !mapError && mapRef.current) {
      if (!mapInstanceRef.current) {
        const defaultCenter = { lat: 21.1702, lng: 72.8311 }; // Default: Surat, India
        const issuesWithLocation = issues.filter(issue => issue.location);
        
        let center = defaultCenter;
        if (issuesWithLocation.length > 0) {
          const totalLat = issuesWithLocation.reduce((sum, issue) => sum + issue.location!.lat, 0);
          const totalLng = issuesWithLocation.reduce((sum, issue) => sum + issue.location!.lon, 0);
          center = { lat: totalLat / issuesWithLocation.length, lng: totalLng / issuesWithLocation.length };
        }

        const newMap = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: issuesWithLocation.length > 0 ? 12 : 10,
          mapId: 'RIFI_MAP',
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        mapInstanceRef.current = newMap;
      }

      const map = mapInstanceRef.current;

      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      issues.filter(issue => issue.location).forEach(issue => {
        const markerIcon = {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: STATUS_MARKER_COLORS[issue.status],
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: '#fff',
          rotation: 0,
          scale: 1.5,
          anchor: new window.google.maps.Point(12, 24),
        };

        const marker = new window.google.maps.Marker({
          position: { lat: issue.location!.lat, lng: issue.location!.lon },
          map,
          icon: markerIcon,
          title: issue.title,
        });
        
        const infowindow = new window.google.maps.InfoWindow({
            content: `<div style="color: #1F2937; font-family: sans-serif; max-width: 200px;">
                            <strong style="font-size: 1.1em;">${issue.title}</strong>
                            <p style="margin: 4px 0;"><strong>Priority:</strong> ${issue.priority}</p>
                            <p style="font-style: italic; margin: 4px 0 0 0;">"${issue.summary}"</p>
                         </div>`
        });

        marker.addListener('click', () => {
            infowindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });
    }
  }, [isScriptLoaded, issues, mapError]);


  if (mapError) {
    return (
        <div className="h-[400px] w-full bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center justify-center text-center p-4 mb-8 shadow-md">
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Map Configuration Error
            </h3>
            <p className="text-sm text-left">{mapError}</p>
          </div>
        </div>
    );
  }
  
  if (!isScriptLoaded) {
    return (
        <div className="h-[400px] w-full bg-gray-200 rounded-lg flex items-center justify-center text-center text-gray-600 p-4 mb-8 shadow-md animate-pulse">
            Loading Map...
        </div>
    );
  }

  return <div ref={mapRef} className="h-[400px] w-full bg-gray-200 rounded-lg mb-8 shadow-md" aria-label="Map of reported issues" />;
};

export default MapDisplay;