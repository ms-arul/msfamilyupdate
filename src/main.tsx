import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { hydrateAuthStorage } from './lib/supabase'

// Remove the native HTML splash screen once React takes over
const splash = document.getElementById('splash');
if (splash) {
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 300);
}

// Hydrate native auth storage before rendering so Supabase
// can find stored session tokens on startup (prevents auto-logout on Android).
hydrateAuthStorage().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
});

