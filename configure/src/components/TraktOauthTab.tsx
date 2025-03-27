import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfig } from '../hooks/useConfig.ts';

import { Switch } from '../components/ui/switch.tsx';

interface TraktOAuthTabProps {
  setTrakt: React.Dispatch<React.SetStateAction<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
    createLists?: boolean;
    catalogs?: boolean;
    hasTrakt?: boolean;
  }>>;
  trakt: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    createLists?: boolean;
    catalogs?: boolean;
    hasTrakt?: boolean;
  };
}

const TraktOAuthTab: React.FC<TraktOAuthTabProps> = ({ setTrakt, trakt }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, loading, error } = useConfig();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const accessToken = query.get('access_token');
    const refreshToken = query.get('refresh_token');
    const expiresAt = query.get('expires_at');

    if (accessToken && refreshToken && expiresAt && !trakt.hasTrakt) {
      setTrakt({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        hasTrakt: true,
      });
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, trakt.hasTrakt, setTrakt]);

  const handleDisconnect = () => {
    setTrakt({
      access_token: '',
      refresh_token: '',
      expires_at: '',
      createLists: true,
      catalogs: true,
      hasTrakt: false,
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!config) return <div>No config</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 pb-4 border-b border-gray-800">
        <div className="p-2 bg-purple-500/10 rounded-lg">
        <img src="/images/icons/Trakt.svg" alt="Trakt Icon" className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Trakt OAuth Configuration
          </h2>
          <p className="text-sm text-gray-400">
            Connect to Trakt with a single click to manage your movie preferences.
          </p>
        </div>
      </div>
      {trakt.hasTrakt && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white">Create Recommendation Lists</span>
            <Switch
              id="opt-out-create-lists"
              className="w-10 h-6 transition-colors duration-200 data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-700"
              checked={trakt.createLists}
              onCheckedChange={(checked: boolean) => {
                setTrakt((prev) => ({ ...prev, createLists: checked }));
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white">Enable Trakt Catalogs</span>
            <Switch
              id="opt-out-catalogs"
              className="w-10 h-6 transition-colors duration-200 data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-700"
              checked={trakt.catalogs}
              onCheckedChange={(checked: boolean) => {
                setTrakt((prev) => ({ ...prev, catalogs: checked }));
              }}
            />
          </div>
        </div>
      )}
      <div className="flex justify-center">
        {!trakt.hasTrakt ? (
          <a
            href={`${config?.ROOT_URL}/auth/login`}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium"
          >
            Connect to Trakt
          </a>
        ) : (
          <button
            type="button"
            onClick={handleDisconnect}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium"
          >
            Disconnect Trakt
          </button>
        )}
      </div>
    </div>
  );
};
export default TraktOAuthTab;
