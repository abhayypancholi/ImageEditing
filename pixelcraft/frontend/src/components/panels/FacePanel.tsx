import React, { useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { SectionLabel } from '../ui/SectionLabel';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import { Smile } from 'lucide-react';

interface FaceResult {
  face_id: number;
  bbox: [number, number, number, number];
  emotions: Record<string, number>;
  dominant: string;
  thumbnail: string;
}

const emotionIcons: Record<string, string> = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😠',
  Surprise: '😲',
  Neutral: '😐',
  Fear: '😨',
  Disgust: '🤢',
  Laughing: '😂',
  Crying: '😭',
  Confused: '😕',
  Frown: '😟',
  Serious: '😑',
};

export const FacePanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [faces, setFaces] = useState<FaceResult[]>([]);

  const { sessionId } = useImageStore();

  const handleAnalyze = async () => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/face/analyze', {
        session_id: sessionId,
      });

      if (response.data.success) {
        const facesData = response.data.data.faces || [];
        const totalFaces = response.data.data.total_faces || 0;
        
        setFaces(facesData);
        
        // FIX C3: Graceful empty state handling
        if (totalFaces === 0 || facesData.length === 0) {
          toast('No faces detected in this image', { icon: '🔍' });
        } else {
          toast.success(`Detected ${totalFaces} face(s)`);
        }
      }
    } catch (error) {
      toast.error('Face analysis failed');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Facial Expression Analysis</SectionLabel>

      <Button
        variant="primary"
        fullWidth
        onClick={handleAnalyze}
        disabled={isLoading}
      >
        <Smile size={16} />
        {isLoading ? 'Analyzing Expressions...' : 'Analyze Expressions'}
      </Button>

      {faces.length > 0 && (
        <>
          <div className="border-t border-[var(--border)] pt-4">
            <SectionLabel>Detected Faces ({faces.length})</SectionLabel>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {faces.map((face) => {
                // Sort emotions by percentage
                const sortedEmotions = Object.entries(face.emotions)
                  .sort(([, a], [, b]) => b - a);

                return (
                  <div
                    key={face.face_id}
                    className="p-4 rounded border border-[var(--border)] bg-[var(--bg-hover)] space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`data:image/png;base64,${face.thumbnail}`}
                        alt={`Face ${face.face_id}`}
                        className="w-20 h-20 rounded border-2 border-[var(--border)]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--text-1)]">
                            Face #{face.face_id}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white">
                            {emotionIcons[face.dominant]} {face.dominant}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-3)] mt-1">
                          Position: ({face.bbox[0]}, {face.bbox[1]})
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {sortedEmotions.map(([emotion, percentage]) => {
                        const isDominant = emotion === face.dominant;
                        return (
                          <div key={emotion} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-[var(--text-2)]">
                                <span>{emotionIcons[emotion]}</span>
                                <span className={isDominant ? 'font-bold' : ''}>
                                  {emotion}
                                </span>
                              </span>
                              <span
                                className={
                                  isDominant
                                    ? 'font-bold text-[var(--accent)]'
                                    : 'text-[var(--text-3)]'
                                }
                              >
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isDominant
                                    ? 'bg-[var(--accent)] animate-pulse'
                                    : 'bg-[var(--text-3)]'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {faces.length === 0 && !isLoading && (
        <div className="text-center py-8 text-[var(--text-3)]">
          {/* FIX C3: Enhanced empty state with helpful message */}
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-medium text-[var(--text-1)] mb-2">
            No faces detected
          </p>
          <p className="text-xs leading-relaxed max-w-xs mx-auto">
            Try an image with clearer, front-facing subjects.
            <br />
            Minimum recommended face size: 50×50 pixels.
          </p>
        </div>
      )}
    </div>
  );
};