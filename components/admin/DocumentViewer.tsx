"use client";

import { useState } from 'react';
import { getIPFSUrl } from '@/lib/services/ipfsService';

interface DocumentViewerProps {
  cid: string;
  documentType: string;
  onClose?: () => void;
}

export function DocumentViewer({ cid, documentType, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const documentUrl = getIPFSUrl(cid);
  const isPDF = documentType.includes('pdf') || documentUrl.includes('.pdf');

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load document');
  };

  const handleDownload = () => {
    window.open(documentUrl, '_blank');
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${isFullScreen ? 'fixed inset-0 z-50' : 'relative'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {documentType}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Download
          </button>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`${isFullScreen ? 'h-[calc(100vh-60px)]' : 'h-96'} relative`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading document...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Try Opening in New Tab
              </button>
            </div>
          </div>
        )}

        {isPDF ? (
          <iframe
            src={documentUrl}
            className="w-full h-full"
            onLoad={handleLoad}
            onError={handleError}
            title={documentType}
          />
        ) : (
          <div className="w-full h-full overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <img
              src={documentUrl}
              alt={documentType}
              className="max-w-full max-h-full object-contain"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
