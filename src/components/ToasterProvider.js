'use client';

import { Toaster } from 'react-hot-toast';

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#000000',
          color: '#FFFFFF',
          border: '2px solid #D4D4D4',
          borderRadius: '0',
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: '4px 4px 0 rgba(212,212,212,0.3)',
        },
        success: { iconTheme: { primary: '#fff', secondary: '#000' } },
        error:   { iconTheme: { primary: '#fff', secondary: '#000' } },
      }}
    />
  );
}
