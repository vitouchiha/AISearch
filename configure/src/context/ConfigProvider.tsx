// src/context/ConfigProvider.tsx
import React from "react";
import { ConfigContext } from "./ConfigContext.tsx";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface AppConfig {
  ROOT_URL: string;
  VERSION: string;
  DEV_MODE: string;
  CAPTCHA_SITE_KEY: string;
  DB_SIZE: number | string;
  VECTOR_COUNT: number | string;
  INSTALLS: number | string;
}

const fetchConfig = async (): Promise<AppConfig> => {
  const response = await axios.get<AppConfig>("/config.json", {
    withCredentials: true
  });
  return response.data;
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, error } = useQuery<AppConfig, Error>({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <ConfigContext.Provider value={{ config: data ?? null, loading: isLoading, error: error ?? null }}>
      {children}
    </ConfigContext.Provider>
  );
};
