import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';
import { initI18n } from './i18n/index.ts';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

void initI18n().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

registerSW({ immediate: true });
