import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

interface SessionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Session {
  sessionId: string;
  fileName: string;
  lastModified: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
  };
}

export function SessionManager({ isOpen, onClose }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/storage/sessions/recent', {
        params: { limit: 20 },
      });
      setSessions(response.data.data.sessions);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await apiClient.delete(`/api/storage/session/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveProject = async (sessionId: string) => {
    try {
      const response = await apiClient.post(
        `/api/storage/session/${sessionId}/save-project`,
        {},
        { responseType: 'blob' }
      );

      // Download .pixelcraft file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixelcraft_project_${sessionId}.pixelcraft`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Project file saved');
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (metadata: Session['metadata']) => {
    if (!metadata.width || !metadata.height) return '';
    return `${metadata.width}×${metadata.height}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Manager">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Manage your recent editing sessions
          </p>
          <Button onClick={loadSessions} variant="secondary" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-400">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">
                      {session.fileName || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {formatDate(session.lastModified)}
                      </span>
                      {formatFileSize(session.metadata) && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-400">
                            {formatFileSize(session.metadata)}
                          </span>
                        </>
                      )}
                      {session.metadata.format && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-400 uppercase">
                            {session.metadata.format}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveProject(session.sessionId)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                      title="Save as .pixelcraft project"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(session.sessionId)}
                      disabled={deletingId === session.sessionId}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                      title="Delete session"
                    >
                      {deletingId === session.sessionId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Sessions older than 7 days are automatically deleted
          </p>
        </div>
      </div>
    </Modal>
  );
}
