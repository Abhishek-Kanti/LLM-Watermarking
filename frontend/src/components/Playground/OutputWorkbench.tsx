import React, { useState } from 'react';
import styles from './OutputWorkbench.module.css';
import { DetectResult } from '../../types/api';
import { TokenChip } from './TokenChip';
import { ContextLensPanel } from './ContextLensPanel';
import { TextEditor } from './TextEditor';
import { DetectionDashboard } from '../Diagnostics/DetectionDashboard';
import { ComparisonTable } from '../Diagnostics/ComparisonTable';
import { CopyIcon, CheckIcon, DetectIcon, EditIcon } from '../Icons';

interface OutputWorkbenchProps {
  isGenerating: boolean;
  generationError: string | null;
  generatedText: string;
  hasGenerated: boolean;
  contextLength: number;
  originalDetection: DetectResult | null;
  modifiedDetection: DetectResult | null;
  isDetecting: boolean;
  detectError: string | null;
  onDetectOriginal: () => void;
  editedText: string;
  onTextChange: (text: string) => void;
  isModified: boolean;
  onRedetectModified: () => void;
  onResetText: () => void;
  hoveredTokenIndex: number | null;
  onHoverToken: (idx: number | null) => void;
  pinnedTokenIndex: number | null;
  onTogglePinToken: (idx: number) => void;
}

export const OutputWorkbench: React.FC<OutputWorkbenchProps> = ({
  isGenerating,
  generationError,
  generatedText,
  hasGenerated,
  contextLength,
  originalDetection,
  modifiedDetection,
  isDetecting,
  detectError,
  onDetectOriginal,
  editedText,
  onTextChange,
  isModified,
  onRedetectModified,
  onResetText,
  hoveredTokenIndex,
  onHoverToken,
  pinnedTokenIndex,
  onTogglePinToken,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'tokens' | 'raw'>('tokens');
  const [showEditor, setShowEditor] = useState(true);

  const handleCopy = () => {
    const textToCopy = isModified ? editedText : generatedText;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tokens = originalDetection?.tokens || [];
  const activeTokenIndex = hoveredTokenIndex !== null ? hoveredTokenIndex : pinnedTokenIndex;

  return (
    <div className={`hairline-card ${styles.workbench}`}>
      <div className={`panel-header ${styles.outputHeader}`}>
        <div className={styles.titleArea}>
          <span className="panel-title">Generation & Token Inspector</span>
          {isGenerating && (
            <div className={styles.streamingIndicator}>
              <span className="stream-cursor" />
              <span>Streaming from Qwen3-0.6B...</span>
            </div>
          )}
        </div>

        {hasGenerated && (
          <div className={styles.outputActions}>
            <button
              type="button"
              className={`${styles.toolBtn} ${viewMode === 'tokens' ? styles.active : ''}`}
              onClick={() => setViewMode('tokens')}
              disabled={tokens.length === 0}
            >
              <span>Token Chips</span>
            </button>

            <button
              type="button"
              className={`${styles.toolBtn} ${viewMode === 'raw' ? styles.active : ''}`}
              onClick={() => setViewMode('raw')}
            >
              <span>Plain Text</span>
            </button>

            <button
              type="button"
              className={`${styles.toolBtn} ${showEditor ? styles.active : ''}`}
              onClick={() => setShowEditor(!showEditor)}
              title="Toggle Robustness / Tampering Editor"
            >
              <EditIcon size={12} />
              <span>{showEditor ? 'Hide Editor' : 'Edit Text'}</span>
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? <CheckIcon size={12} color="var(--color-green-ink)" /> : <CopyIcon size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={onDetectOriginal}
              disabled={isDetecting || isGenerating}
              title="Re-run detection on original generation"
            >
              <DetectIcon size={12} />
              <span>{isDetecting ? 'Detecting...' : 'Detect'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="panel-body">
        {/* Error Banners */}
        {generationError && (
          <div className={styles.errorBanner} style={{ marginBottom: 'var(--space-3)' }}>
            <strong>Generation Error:</strong> {generationError}
          </div>
        )}
        {detectError && (
          <div className={styles.errorBanner} style={{ marginBottom: 'var(--space-3)' }}>
            <strong>Detection Error:</strong> {detectError}
          </div>
        )}

        {/* OUTPUT CANVAS */}
        {!hasGenerated && !isGenerating ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Workbench Idle</div>
            <p className={styles.emptySubtitle}>
              Configure your prompt and watermark parameters on the left, then click <strong>Generate Stream</strong> to start real-time token generation.
            </p>
          </div>
        ) : isGenerating ? (
          <div className={styles.tokenCanvas}>
            <span className={styles.streamingText}>{generatedText}</span>
            <span className="stream-cursor" />
          </div>
        ) : (
          <div>
            <div className={styles.tokenCanvas} tabIndex={0} aria-label="Generated output tokens">
              {viewMode === 'tokens' && tokens.length > 0 ? (
                tokens.map((tokenData, idx) => {
                  const isHovered = hoveredTokenIndex === idx;
                  const isPinned = pinnedTokenIndex === idx;
                  const isInContext =
                    activeTokenIndex !== null &&
                    idx >= Math.max(0, activeTokenIndex - contextLength) &&
                    idx < activeTokenIndex;

                  return (
                    <TokenChip
                      key={`${idx}-${tokenData.token_id}`}
                      tokenData={tokenData}
                      index={idx}
                      isHovered={isHovered}
                      isPinned={isPinned}
                      isInContext={isInContext}
                      onHover={onHoverToken}
                      onSelect={onTogglePinToken}
                    />
                  );
                })
              ) : (
                <div className={styles.streamingText}>{generatedText}</div>
              )}
            </div>

            {/* Token color legend */}
            {viewMode === 'tokens' && tokens.length > 0 && (
              <div className={styles.tokenLegend}>
                <span className={styles.legendItem}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--color-green-dot)',
                    }}
                  />
                  <span>Green Token (Watermark Biased)</span>
                </span>
                <span className={styles.legendItem}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--color-red-dot)',
                    }}
                  />
                  <span>Red Token (Unbiased)</span>
                </span>
                <span className={styles.legendItem} style={{ marginLeft: 'auto' }}>
                  <span>Hover or click/tap any token to lock its {contextLength}-token hash context</span>
                </span>
              </div>
            )}

            {/* Context Lens Details */}
            {activeTokenIndex !== null && tokens.length > 0 && (
              <ContextLensPanel
                tokens={tokens}
                activeIndex={activeTokenIndex}
                contextLength={contextLength}
                isPinned={pinnedTokenIndex !== null}
                onUnpin={() => {
                  if (pinnedTokenIndex !== null) {
                    onTogglePinToken(pinnedTokenIndex);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* STATISTICAL DETECTION DASHBOARD */}
        {originalDetection && !isGenerating && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <DetectionDashboard
              detection={modifiedDetection || originalDetection}
              title={
                modifiedDetection
                  ? 'Detection for Current Modified Text'
                  : 'Detection for Original Generation'
              }
            />
          </div>
        )}

        {/* EDITABLE TEXT SANDBOX (CORE FEATURE) */}
        {hasGenerated && !isGenerating && showEditor && (
          <TextEditor
            editedText={editedText}
            onTextChange={onTextChange}
            isModified={isModified}
            isDetecting={isDetecting}
            onRedetect={onRedetectModified}
            onReset={onResetText}
          />
        )}

        {/* COMPARISON TABLE: ORIGINAL VS MODIFIED */}
        {originalDetection && modifiedDetection && (
          <ComparisonTable original={originalDetection} modified={modifiedDetection} />
        )}
      </div>
    </div>
  );
};
