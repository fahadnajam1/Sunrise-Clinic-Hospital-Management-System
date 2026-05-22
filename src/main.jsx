import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '10px',
              fontSize: '13.5px',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
