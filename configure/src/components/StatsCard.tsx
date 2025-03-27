import React from 'react';
import { useConfig } from '../hooks/useConfig.ts';

export const StatsCard = () => {
    const { config, loading, error } = useConfig();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 mt-6">
                Loading...
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="text-red-600 mt-6">
                Error: {error.message}
            </div>
        );
    }

    return (
        <div className="bg-black/98 border border-gray-800 bg-shadow-md rounded-lg p-6 max-w-md mt-6 mx-auto">
            {config?.VERSION && (
                <p className="text-gray-700 mb-2">
                    Version: {config.VERSION}
                </p>
            )}
            {config?.DB_SIZE && (
                <p className="text-gray-700 mb-2">
                    DB Size: {config.DB_SIZE}
                </p>
            )}
            {config?.INSTALLS && (
                <p className="text-gray-700 mb-2">
                    Installs: {config.INSTALLS}
                </p>
            )}
            {config?.VECTOR_COUNT && (
                <p className="text-gray-700 mb-2">
                    Vector Count: {config.VECTOR_COUNT}
                </p>
            )}
        </div>
    );
};
