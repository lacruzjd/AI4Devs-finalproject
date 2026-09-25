import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';
import { registerServiceWorker } from './shared/pwa/registerServiceWorker.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// TK-159-FE / US-044 / ADR-008: instalable y capaz de abrir sin conexión. Se registra
// después de montar para no competir con el primer renderizado.
void registerServiceWorker({ enabled: import.meta.env.PROD, version: __APP_VERSION__ });
