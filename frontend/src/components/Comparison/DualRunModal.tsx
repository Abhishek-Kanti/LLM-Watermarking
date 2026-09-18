import React, { useState } from 'react';
import styles from './DualRunModal.module.css';
import { DetectResult } from '../../types/api';
import { streamGenerate, detectWatermark } from '../../services/api';

interface DualRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  secretKey: string;
  contextLength: number;
  gamma: number;
  greenFraction: number;
  temperature: number;
  topP: number;
  maxTokens: number;
}

interface RunResult {
  text: string;
  detection: DetectResult | null;
}

export const DualRunModal: React.FC<DualRunModalProps> = ({
  isOpen,
  onClose,
  prompt,
  secretKey,
  contextLength,
  gamma,
  greenFraction,
  temperature,
  topP,
  maxTokens,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [baselineResult, setBaselineResult] = useState<RunResult | null>(null);
  const [watermarkedResult, setWatermarkedResult] = useState<RunResult | null>(null);
  const [statusText, setStatusText] = useState('');

  if (!isOpen) return null;

  const handleRunComparison = async () => {
    setIsRunning(true);
    setBaselineResult(null);
    setWatermarkedResult(null);

    try {
      // Step 1: Run Baseline (Watermark OFF)
      setStatusText('1/2: Generating unwatermarked baseline...');
      let baselineText = '';
      let baselineGenId: string | null = null;
      let baselineTokens: number[] = [];

      await streamGenerate(
        {
          prompt,
          watermark: false,
          secret_key: secretKey,
          context_length: contextLength,
          gamma: 0.0,
          green_fraction: greenFraction,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        },
        {
          onChunk: (chunk) => {
            baselineText += chunk;
            setBaselineResult({ text: baselineText, detection: null });
          },
          onComplete: (genId, tokens) => {
            baselineGenId = genId;
            baselineTokens = tokens;
          },
          onError: (err) => {
            throw err;
          },
        }
      );

      // Detect baseline
      setStatusText('1/2: Analyzing baseline token distribution...');
      const baseDetect = await detectWatermark({
        prompt,
        generation_id: baselineGenId,
        token_ids: baselineTokens.length > 0 ? baselineTokens : null,
        text: baselineTokens.length === 0 ? baselineText : null,
        secret_key: secretKey,
        context_length: contextLength,
        green_fraction: greenFraction,
      });
      setBaselineResult({ text: baselineText, detection: baseDetect });

      // Step 2: Run Watermarked (Watermark ON)
      setStatusText('2/2: Generating watermarked stream...');
      let watermarkedText = '';
      let watermarkedGenId: string | null = null;
      let watermarkedTokens: number[] = [];

      await streamGenerate(
        {
          prompt,
          watermark: true,
          secret_key: secretKey,
          context_length: contextLength,
          gamma,
          green_fraction: greenFraction,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        },
        {
          onChunk: (chunk) => {
            watermarkedText += chunk;
            setWatermarkedResult({ text: watermarkedText, detection: null });
          },
          onComplete: (genId, tokens) => {
            watermarkedGenId = genId;
            watermarkedTokens = tokens;
          },
          onError: (err) => {
            throw err;
          },
        }
      );

      // Detect watermarked
      setStatusText('2/2: Computing watermark statistical proof...');
      const wmDetect = await detectWatermark({
        prompt,
        generation_id: watermarkedGenId,
        token_ids: watermarkedTokens.length > 0 ? watermarkedTokens : null,
        text: watermarkedTokens.length === 0 ? watermarkedText : null,
        secret_key: secretKey,
        context_length: contextLength,
        green_fraction: greenFraction,
      });
      setWatermarkedResult({ text: watermarkedText, detection: wmDetect });

      setStatusText('Comparison complete.');
    } catch (err) {
      setStatusText(`Error during comparison: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRunning) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Comparison Mode Modal"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <span className={styles.title}>Compare Watermarked vs Baseline (Control)</span>
            <span className="mono-label" style={{ display: 'block', marginTop: '2px' }}>
              Dual-Run Statistical Experiment
            </span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={isRunning}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.promptRow}>
            <strong>Prompt:</strong> &ldquo;{prompt}&rdquo;
          </div>

          <div>
            <button
              type="button"
              className={styles.runBtn}
              onClick={handleRunComparison}
              disabled={isRunning || !prompt.trim()}
            >
              {isRunning ? statusText || 'Running dual generation...' : 'Run Dual Comparison (Both Modes)'}
            </button>
          </div>

          <div className={styles.grid}>
            {/* COLUMN 1: BASELINE */}
            <div className={styles.columnCard}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>Baseline (Unwatermarked)</span>
                <span className="status-chip">Watermark OFF</span>
              </div>

              <div className={styles.textPreview}>
                {baselineResult?.text || 'Click "Run Dual Comparison" to generate baseline text.'}
              </div>

              {baselineResult?.detection && (
                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <span className="mono-label">Green Ratio</span>
                    <div style={{ fontWeight: 600 }}>
                      {(baselineResult.detection.green_ratio * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <span className="mono-label">Z-Score</span>
                    <div style={{ fontWeight: 600 }}>
                      {baselineResult.detection.z_score.toFixed(3)}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <span className="mono-label">P-Value</span>
                    <div>
                      {baselineResult.detection.p_value < 0.0001
                        ? baselineResult.detection.p_value.toExponential(2)
                        : baselineResult.detection.p_value.toFixed(3)}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <span className="mono-label">Verdict</span>
                    <div
                      style={{
                        fontWeight: 700,
                        color: baselineResult.detection.detected
                          ? 'var(--color-green-ink)'
                          : 'var(--color-ink-muted)',
                      }}
                    >
                      {baselineResult.detection.detected ? 'DETECTED' : 'UNWATERMARKED'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: WATERMARKED */}
            <div className={styles.columnCard}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>Watermarked (γ = {gamma})</span>
                <span className="status-chip cobalt">Watermark ON</span>
              </div>

              <div className={styles.textPreview}>
                {watermarkedResult?.text || 'Click "Run Dual Comparison" to generate watermarked text.'}
              </div>

              {watermarkedResult?.detection && (
                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <span className="mono-label">Green Ratio</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-green-ink)' }}>
                      {(watermarkedResult.detection.green_ratio * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <span className="mono-label">Z-Score</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-green-ink)' }}>
                      {watermarkedResult.detection.z_score.toFixed(3)}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <span className="mono-label">P-Value</span>
                    <div>
                      {watermarkedResult.detection.p_value < 0.0001
                        ? watermarkedResult.detection.p_value.toExponential(2)
                        : watermarkedResult.detection.p_value.toFixed(3)}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <span className="mono-label">Verdict</span>
                    <div
                      style={{
                        fontWeight: 700,
                        color: watermarkedResult.detection.detected
                          ? 'var(--color-green-ink)'
                          : 'var(--color-ink-muted)',
                      }}
                    >
                      {watermarkedResult.detection.detected ? 'DETECTED' : 'UNWATERMARKED'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
