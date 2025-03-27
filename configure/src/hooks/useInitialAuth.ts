import { useQuery } from '@tanstack/react-query';
import axios from 'axios'; 
import { useConfig } from './useConfig.ts';

const generateTokenApiCall = async (rootUrl: string) => {
  try {
    const response = await axios.get(`${rootUrl}/api/generate-token`, {
      withCredentials: true,
    });
    return { success: true, message: response.data?.message || "Token endpoint contacted." };
  } catch (error) {
    console.error("Error calling generate-token endpoint:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to generate token');
    }
    throw error;
  }
};

export const useInitializeAuth = () => {
  const { config } = useConfig();

  const rootUrl = config?.ROOT_URL;
  return useQuery({
    queryKey: ['sessionInitialization', rootUrl],
    queryFn: () => {
        if (!rootUrl) {
            return Promise.reject(new Error("ROOT_URL is not available for token generation."));
        }
        return generateTokenApiCall(rootUrl);
    },
    enabled: !!(config && rootUrl),
    staleTime: Infinity, 
    refetchOnWindowFocus: false, 
    refetchOnMount: false,   
    refetchOnReconnect: false, 
    retry: 1,               
  });
};