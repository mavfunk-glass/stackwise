import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { resetClientToFreeView } from './api/session';
import './styles/index.css';

registerSW({ immediate: true });

if (import.meta.env.DEV) {
  (window as Window & { stackwiseResetFreeView?: () => void }).stackwiseResetFreeView = () => {
    resetClientToFreeView();
    window.location.reload();
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

