import React, { useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Dropdown } from '../ui/Dropdown';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import { Type, Copy, Download } from 'lucide-react';

interface OCRBlock {
  original: string;
  corrected: string;
  confidence: number;
  language: string;
  bbox: [number, number, number, number];
}

export const OcrPanel: React.FC = () => {
  const [mode, setMode] = useState('auto');
  const [useCorrection, setUseCorrection] = useState(false);
  const [correctionThreshold, setCorrectionThreshold] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [blocks, setBlocks] = useState<OCRBlock[]>([]);
  const [fullText, setFullText] = useState('');
  const [languageSummary, setLanguageSummary] = useState('');

  const { sessionId } = useImageStore();

  const handleExtract = async () => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/ocr/extract', {
        session_id: sessionId,
        mode,
        region: null,
        use_correction: useCorrection,
        correction_threshold: correctionThreshold,
      });

      if (response.data.success) {
        setBlocks(response.data.data.blocks);
        setFullText(response.data.data.full_text);
        setLanguageSummary(response.data.data.language_summary);
        toast.success(`Extracted ${response.data.data.total_blocks} text blocks`);
      }
    } catch (error) {
      toast.error('OCR extraction failed');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(fullText);
    toast.success('Text copied to clipboard');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ocr_text.txt';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as TXT');
  };

  const getLanguageFlag = (lang: string) => {
    if (lang === 'hi') return '🇮🇳';
    if (lang === 'en') return '🇬🇧';
    return '🌐';
  };

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>OCR Settings</SectionLabel>

      <div className="space-y-2">
        <label className="text-xs text-[var(--text-2)]">Language Mode</label>
        <Dropdown
          value={mode}
          onChange={setMode}
          options={[
            { value: 'auto', label: 'Auto-detect' },
            { value: 'english', label: 'English only' },
            { value: 'hindi', label: 'Hindi only' },
            { value: 'mixed', label: 'Hindi + English' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="correction"
            checked={useCorrection}
            onChange={(e) => setUseCorrection(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="correction" className="text-sm text-[var(--text-2)]">
            Enable Dictionary Correction
          </label>
        </div>

        {useCorrection && (
          <Slider
            label={`Correction Threshold: ${Math.round(correctionThreshold * 100)}%`}
            value={correctionThreshold}
            onChange={setCorrectionThreshold}
            min={0}
            max={1}
            step={0.1}
          />
        )}
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={handleExtract}
        disabled={isLoading}
      >
        <Type size={16} />
        {isLoading ? 'Extracting Text...' : 'Extract Text'}
      </Button>

      {blocks.length > 0 && (
        <>
          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Detected Text</SectionLabel>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-3)]">
                  {getLanguageFlag(languageSummary.toLowerCase())} {languageSummary}
                </span>
              </div>
            </div>

            <textarea
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              className="w-full h-48 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border)] rounded text-sm text-[var(--text-1)] font-mono resize-none focus:outline-none focus:border-[var(--accent)]"
              placeholder="Extracted text will appear here..."
            />

            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={handleCopyText}>
                <Copy size={14} />
                Copy All
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadTxt}>
                <Download size={14} />
                Download TXT
              </Button>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <SectionLabel>Text Blocks ({blocks.length})</SectionLabel>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {blocks.map((block, index) => (
                <div
                  key={index}
                  className="p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-2)]">
                      Block {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-3)]">
                        {getLanguageFlag(block.language)}
                      </span>
                      <span className="text-xs text-[var(--accent)]">
                        {block.confidence}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-1)] break-words">
                    {block.corrected}
                  </p>
                  {block.original !== block.corrected && (
                    <p className="text-xs text-[var(--text-3)] line-through">
                      Original: {block.original}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {blocks.length === 0 && (
        <div className="text-center py-8 text-[var(--text-3)]">
          <Type size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No text extracted yet</p>
          <p className="text-xs mt-2">
            Click "Extract Text" to detect text in the image
          </p>
        </div>
      )}
    </div>
  );
};
