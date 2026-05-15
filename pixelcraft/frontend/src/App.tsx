import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { useKeyboard } from './hooks/useKeyboard';

function App() {
  // Initialize keyboard shortcuts
  useKeyboard();

  return (
    <>
      <AppLayout />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-1)',
            border: '1px solid var(--border)',
            fontSize: '13px',
          },
          success: {
            iconTheme: {
              primary: 'var(--accent-green)',
              secondary: 'var(--bg-card)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--accent-red)',
              secondary: 'var(--bg-card)',
            },
          },
        }}
      />
    </>
  );
}

export default App;
