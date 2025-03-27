import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ConfigProvider } from './context/ConfigProvider.tsx';
import App from './App.tsx';
import './index.css';
import { Toaster } from './components/ui/sonner.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider>
          <Toaster position="top-center" richColors />
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
