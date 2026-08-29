import { setupIonicReact } from '@ionic/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './theme.css';

setupIonicReact({ mode: 'ios' });

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
