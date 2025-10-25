'use client';

import { useParams } from 'next/navigation';

export default function StatusPage() {
  const params = useParams();
  const id = params?.id;

  // Mock data - will be replaced with real API call
  const complaint = {
    id: id,
    type: 'Pothole',
    description: 'Large pothole on Main Street causing traffic issues',
    status: 'in_progress',
    priority: 'high',
    location: {
      address: 'Main Street, Block A',
      lat: 40.7128,
      lng: -74.006,
    },
    photoUrl: '/placeholder-pothole.jpg',
    createdAt: '2025-10-20T10:30:00Z',
    updatedAt: '2025-10-23T15:45:00Z',
    aiSummary: 'Significant road damage requiring immediate attention',
    adminRemarks: 'Work crew assigned. Estimated completion: 2 days.',
    timeline: [
      { date: '2025-10-20', status: 'Complaint submitted', description: 'Issue reported by citizen' },
      { date: '2025-10-21', status: 'Under review', description: 'Assigned to maintenance team' },
      { date: '2025-10-23', status: 'In progress', description: 'Work crew dispatched' },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Complaint #{id}
              </h1>
              <p className="text-gray-600">{complaint.type}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(complaint.status)}`}>
                {complaint.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPriorityColor(complaint.priority)}`}>
                {complaint.priority.toUpperCase()} PRIORITY
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700">{complaint.description}</p>
          </div>

          {/* AI Summary */}
          {complaint.aiSummary && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🤖 AI Analysis</h3>
              <p className="text-blue-800">{complaint.aiSummary}</p>
            </div>
          )}

          {/* Photo */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Photo Evidence</h3>
            <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">📷 Photo will be displayed here</span>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">📍 Location</h3>
            <p className="text-gray-700">{complaint.location.address}</p>
            <div className="mt-4 bg-gray-100 h-48 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">🗺️ Map view coming soon</span>
            </div>
          </div>

          {/* Admin Remarks */}
          {complaint.adminRemarks && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Admin Update</h3>
              <p className="text-green-800">{complaint.adminRemarks}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Timeline</h2>
          <div className="space-y-6">
            {complaint.timeline.map((event, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  {index !== complaint.timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">{event.status}</span>
                    <span className="text-sm text-gray-500">{event.date}</span>
                  </div>
                  <p className="text-gray-600">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
