import React, { useState } from 'react';
import { useConfig } from '../hooks/useConfig.ts';

interface ManifestBoxProps {
  userId: string;
}

const ManifestBox: React.FC<ManifestBoxProps> = ({ userId }) => {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const { config, loading, error } = useConfig();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!config) return <div>No config</div>;

  const baseUrl = `${config?.ROOT_URL}/user:${userId}/manifest.json`;
  const stremioUrl = `stremio://${baseUrl.replace(/^https?:\/\//i, '')}`;

  // Copy the original URL to the clipboard.
  const handleCopyOriginal = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  // Navigate to the stremio:// URL.
  const handleOpenStremioUrl = () => {
    window.location.href = stremioUrl;
  };

  return (
    <div className="mt-6 bg-gray-900/98 p-4 rounded-md shadow-md">
      <code className="block text-sm text-green-400 font-mono mb-4">
        {baseUrl}
      </code>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleCopyOriginal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded"
        >
          {copiedOriginal ? "Copied!" : "Copy URL"}
        </button>
        <button
          type="button"
          onClick={handleOpenStremioUrl}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded"
        >
          Open With Stremio App
        </button>
      </div>
    </div>
  );
};
export default ManifestBox;