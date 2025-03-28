import React from 'react';
import { ThumbsUp } from 'lucide-react';

const ThumbsUpStremioAddons = () => {
  const url = 'https://github.com/Stremio-Community/stremio-addons-list/issues/812';

  return (
    <div className="flex justify-center">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1 rounded-md border border-purple-500 bg-purple-400/30 px-2 py-1 text-sm text-purple-400 hover:bg-purple-500 hover:text-purple-200 transition-colors"
      >
        <ThumbsUp className="w-4 h-4 opacity-70 group-hover:opacity-90 transition-opacity" />
        <span>
          <span className="font-medium">FilmWhisper</span> on Stremio Addons!
        </span>
      </a>
    </div>
  );
};

export default ThumbsUpStremioAddons;

