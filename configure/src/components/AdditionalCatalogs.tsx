import React, { FC } from 'react';
import { Switch } from '../components/ui/switch.tsx';
import { BookOpen } from 'lucide-react';

interface AdditionalCatalogsProps {
  catalogs: {
    trending: boolean;
  };
  setCatalogs: React.Dispatch<React.SetStateAction<{
    trending: boolean;
  }>>;
}

const AdditionalCatalogs: FC<AdditionalCatalogsProps> = ({ setCatalogs, catalogs }) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-3 pb-4 border-b border-gray-800">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <BookOpen className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Additional Catalogs
          </h2>
          <p className="text-sm text-gray-400">
            Configure extra catalogs, including trending content. Changes to catalogs require a reinstall of the addon.
          </p>
        </div>
      </div>
      {/* Trending Switch */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white">Enable Trending Catalog</span>
          <Switch
            id="catalogs-trending"
            className="w-10 h-6 transition-colors duration-200 data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-700"
            checked={catalogs.trending}
            onCheckedChange={(checked: boolean) => {
              setCatalogs((prev) => ({ ...prev, trending: checked }));
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdditionalCatalogs;
