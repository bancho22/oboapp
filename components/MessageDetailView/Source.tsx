import React, { useState } from "react";
import sources from "@/lib/sources.json";

interface SourceProps {
  sourceId: string;
}

export default function SourceDisplay({ sourceId }: SourceProps) {
  const [logoError, setLogoError] = useState(false);
  const source = sources.find((s) => s.id === sourceId);
  const logoPath = `/sources/${sourceId}.png`;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">Източник</h3>
      <div className="flex items-center space-x-2">
        {logoError ? (
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        ) : (
          <img
            src={logoPath}
            alt={source?.name || sourceId}
            className="w-6 h-6 object-contain rounded flex-shrink-0"
            onError={() => setLogoError(true)}
          />
        )}
        <span className="text-base text-gray-900">
          {source?.name || sourceId}
        </span>
      </div>
    </div>
  );
}
