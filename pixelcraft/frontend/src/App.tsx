import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { UploadZone } from './components/canvas/UploadZone';
import { useKeyboard } from './hooks/useKeyboard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useImageStore } from './store/imageStore';

function App() {
  // Initialize keyboard shortcuts
  useKeyboard();
  useKeyboardShortcuts();

  const { sessionId, isProcessing, processingLabel } = useImageStore();

  return (
    <>
      {/* Upload screen overlay - shows when no image loaded */}
      {!sessionId && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-app)] flex items-center justify-center">
          <UploadZone />
        </div>
      )}

      {/* Main app layout */}
      <AppLayout />

      {/* Global processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <div className="bg-[var(--bg-panel)] rounded-lg p-8 flex flex-col items-center gap-4 shadow-[var(--shadow-lg)]">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-[var(--accent)]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-[var(--accent)] rounded-full animate-spin"></div>
            </div>
            <p className="text-[var(--text-1)] font-medium">{processingLabel}</p>
          </div>
        </div>
      )}

      {/* Toast notifications */}
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
