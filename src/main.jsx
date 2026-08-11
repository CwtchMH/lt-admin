import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()

    const reloadKey = 'admin_preload_error_reloaded'
    if (sessionStorage.getItem(reloadKey) === '1') {
        return
    }

    sessionStorage.setItem(reloadKey, '1')
    window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
