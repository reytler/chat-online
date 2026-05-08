import ReactDOM from 'react-dom/client'
import React from 'react'
import App from './App'
import './index.css'
import { initSentry } from './observability/sentry/initSentry'

initSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
