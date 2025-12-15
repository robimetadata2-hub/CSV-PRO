import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupVideoDebug } from './utils/videoDebug';

// Initialize video debugging in development
if (import.meta.env.DEV) {
  setupVideoDebug();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 