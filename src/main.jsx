import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './interactions.css'
import './auth.css'
import './brand-pages.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
