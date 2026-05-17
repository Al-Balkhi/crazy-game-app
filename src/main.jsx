import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { NotifyProvider } from './contexts/NotifyContext'
import { SettingsProvider } from './contexts/SettingsContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <NotifyProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </NotifyProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>,
)