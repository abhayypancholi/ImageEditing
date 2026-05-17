import React from 'react';
import { useHistoryStore } from '../../store/historyStore';
import { useHistory } from '../../hooks/useHistory';
import { Button } from '../ui/Button';
import { SectionLabel } from '../ui/SectionLabel';
import { Undo, Redo, Clock, Image as ImageIcon } from 'lucide-react';

export const HistoryPanel: React.FC = () => {
  const { history, currentIndex } = useHistoryStore();
  const { handleUndo, handleRedo, canUndo, canRedo } = useHistory();

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>History Controls</SectionLabel>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
          Undo
        </Button>
        <Button
          variant="secondary"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo size={16} />
          Redo
        </Button>
      </div>

      <div className="p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-3)]">Current Step:</span>
          <span className="font-semibold text-[var(--text-1)]">
            {currentIndex + 1} / {history.length}
          </span>
        </div>
      </div>

      <SectionLabel>History Timeline</SectionLabel>

      {history.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-3)]">
          <Clock size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No history yet</p>
          <p className="text-xs mt-2">
            Operations will appear here as you edit
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {history.map((entry, index) => {
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div
                key={entry.snapshotId}
                className={`p-3 rounded border transition-all ${
                  isCurrent
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : isFuture
                    ? 'border-[var(--border)] bg-[var(--bg-panel)] opacity-50'
                    : 'border-[var(--border)] bg-[var(--bg-hover)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 p-1.5 rounded ${
                      isCurrent
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-panel)] text-[var(--text-3)]'
                    }`}
                  >
                    <ImageIcon size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-sm font-medium truncate ${
                          isCurrent
                            ? 'text-[var(--accent)]'
                            : isFuture
                            ? 'text-[var(--text-3)]'
                            : 'text-[var(--text-1)]'
                        }`}
                      >
                        {entry.operationName}
                      </h4>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-[var(--accent)] whitespace-nowrap">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-3)]">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span className="text-xs text-[var(--text-3)]">•</span>
                      <span className="text-xs text-[var(--text-3)]">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>

                    {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                      <div className="mt-2 text-xs text-[var(--text-3)]">
                        {Object.entries(entry.parameters).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="font-medium">{key}:</span>{' '}
                            {typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="p-3 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
        <p className="text-xs font-semibold text-[var(--text-2)] mb-2">
          Keyboard Shortcuts
        </p>
        <div className="space-y-1 text-xs text-[var(--text-3)]">
          <div className="flex justify-between">
            <span>Undo</span>
            <kbd className="px-2 py-0.5 rounded bg-[var(--bg-panel)] font-mono">
              Ctrl+Z
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Redo</span>
            <kbd className="px-2 py-0.5 rounded bg-[var(--bg-panel)] font-mono">
              Ctrl+Shift+Z
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
