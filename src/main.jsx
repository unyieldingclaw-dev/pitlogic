import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyMigrations } from './lib/migrations/index.js'
import { ProviderRegistry } from './lib/providers/core/ProviderRegistry.js'
import { CsvProvider } from './lib/providers/adapters/csv/CsvProvider.js'

applyMigrations();
ProviderRegistry.register(new CsvProvider());

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pitlogic/sw.js');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
