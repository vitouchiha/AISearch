import { createContext } from "react";

interface AppConfig {
    ROOT_URL: string;
    VERSION: string;
    DEV_MODE: string;
    CAPTCHA_SITE_KEY: string;
    DB_SIZE: number | string;
    VECTOR_COUNT: number | string;
    INSTALLS: number | string;
}

interface ConfigContextProps {
  config: AppConfig | null;
  loading: boolean;
  error: Error | null;
}

export const ConfigContext = createContext<ConfigContextProps>({
  config: null,
  loading: true,
  error: null,
});