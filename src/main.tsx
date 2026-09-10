import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './i18n/LanguageContext'
import { ContentProvider } from './lib/content'
const Panel = lazy(() => import('./panel/Panel'));
const panelRoute = window.location.pathname.replace(/\/+$/, '') === '/panel';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContentProvider><LanguageProvider><Suspense fallback={<p role="status">Memuat…</p>}>{panelRoute ? <Panel /> : <App />}</Suspense></LanguageProvider></ContentProvider>
  </StrictMode>,
)
