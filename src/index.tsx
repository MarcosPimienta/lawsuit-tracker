import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Ignore third-party browser extension errors (e.g. MetaMask inpage.js) from triggering CRA error overlay
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const stack = reason?.stack || String(reason || '');
    const message = reason?.message || String(reason || '');
    if (
      stack.includes('chrome-extension://') ||
      stack.includes('MetaMask') ||
      message.includes('MetaMask')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const stack = event.error?.stack || event.filename || '';
    const message = event.message || '';
    if (
      stack.includes('chrome-extension://') ||
      stack.includes('MetaMask') ||
      message.includes('MetaMask')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
