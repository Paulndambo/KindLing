import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Keep the static landing fallback visible while the large app stylesheet loads.
// Vite emits this CSS as a separate async chunk, so it does not block first paint.
import('./index.css').then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
