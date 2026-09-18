import React from 'react';
import styles from './DetectionDashboard.module.css';
import { DetectResult } from '../../types/api';
import { Tooltip } from '../Controls/Tooltip';
import { ShieldCheckIcon, ShieldAlertIcon } from '../Icons';

interface DetectionDashboardProps {
  detection: DetectResult;
  title?: string;
}

export const DetectionDashboard: React.FC<DetectionDashboardProps> = ({
  detection,
  title = 'Statistical Evidence & Detection',
}) => {
  const threshold = detection.detection_threshold ?? 3.0;
  const isHighConfidence = detection.z_score >= threshold;
  const isLikelyEvidence = !isHighConfidence && detection.z_score >= 1.645;
  const isDetected = isHighConfidence || isLikelyEvidence;

  const greenPct = (detection.green_ratio * 100).toFixed(1);
  const expectedPct = (detection.expected_ratio * 100).toFixed(1);
  const zScoreVal = detection.z_score.toFixed(3);
  const pValueFormatted =
    detection.p_value < 0.0001 ? '< 0.0001' : detection.p_value.toFixed(4);

  let verdictClass = styles.notDetected;
  let verdictTitle = 'NO WATERMARK DETECTED';
  let verdictSubtitle = `Observed token distribution (${greenPct}%) does not significantly differ from the random expected ratio (${expectedPct}%, z = ${zScoreVal}).`;

  if (isHighConfidence) {
    verdictClass = styles.detected;
    verdictTitle = 'WATERMARK CONFIRMED';
    verdictSubtitle = `Statistically significant green-token concentration observed (z = ${zScoreVal} ≥ ${threshold.toFixed(1)}, p = ${pValueFormatted}).`;
  } else if (isLikelyEvidence) {
    verdictClass = styles.likely;
    verdictTitle = 'WATERMARK SIGNAL DETECTED';
    verdictSubtitle = `Strong green-token bias (${greenPct}% vs expected ${expectedPct}%, p = ${pValueFormatted} < 0.05). Note: on shorter text (T = ${detection.total_tokens} tokens), z-score is constrained by sample size.`;
  }

  // Meter clamp (0 to 10 for Z-Score visualization)
  const zBarPct = Math.min(100, Math.max(0, (detection.z_score / 8.0) * 100));
  const zThreshPct = (threshold / 8.0) * 100;

  return (
    <div className={styles.dashboard}>
      <div className="panel-header" style={{ padding: '0 0 var(--space-2) 0', border: 'none' }}>
        <span className="panel-title">{title}</span>
        <span className={styles.modeBadge}>
          {detection.token_exact ? 'Token-exact (Preserved IDs)' : 'Re-tokenized (Text Sequence)'}
        </span>
      </div>

      {/* VERDICT CARD */}
      <div className={`${styles.verdictCard} ${verdictClass}`}>
        <div className={styles.verdictLeft}>
          {isHighConfidence ? (
            <ShieldCheckIcon size={24} color="var(--color-green-ink)" />
          ) : isLikelyEvidence ? (
            <ShieldCheckIcon size={24} color="var(--color-accent)" />
          ) : (
            <ShieldAlertIcon size={24} color="var(--color-ink-muted)" />
          )}
          <div>
            <div className={styles.verdictTitle}>{verdictTitle}</div>
            <div className={styles.verdictSubtitle}>{verdictSubtitle}</div>
          </div>
        </div>
      </div>

      {/* METRICS TILES */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricTile}>
          <Tooltip id="greenRatio" align="left">
            <span className="mono-label">Green Ratio</span>
          </Tooltip>
          <span className={styles.metricValue} style={{ color: 'var(--color-green-ink)' }}>
            {greenPct}%
          </span>
          <span className={styles.metricSub}>
            {detection.green_tokens} / {detection.total_tokens} tokens
          </span>
        </div>

        <div className={styles.metricTile}>
          <Tooltip id="expectedRatio" align="left">
            <span className="mono-label">Expected Ratio</span>
          </Tooltip>
          <span className={styles.metricValue}>{expectedPct}%</span>
          <span className={styles.metricSub}>Null hypothesis (γ)</span>
        </div>

        <div className={styles.metricTile}>
          <Tooltip id="zScore" align="left">
            <span className="mono-label">Z-Score</span>
          </Tooltip>
          <span
            className={styles.metricValue}
            style={{ color: isDetected ? 'var(--color-green-ink)' : 'var(--color-ink)' }}
          >
            {zScoreVal}
          </span>
          <span className={styles.metricSub}>Threshold: {threshold.toFixed(1)}</span>
        </div>

        <div className={styles.metricTile}>
          <Tooltip id="pValue" align="left">
            <span className="mono-label">P-Value</span>
          </Tooltip>
          <span className={styles.metricValue}>{pValueFormatted}</span>
          <span className={styles.metricSub}>One-tailed error</span>
        </div>

        <div className={styles.metricTile}>
          <span className="mono-label">Tokens</span>
          <span className={styles.metricValue}>{detection.total_tokens}</span>
          <span className={styles.metricSub}>
            G: {detection.green_tokens} | R: {detection.red_tokens}
          </span>
        </div>
      </div>

      {/* GREEN/RED PROPORTION BAR */}
      <div className={styles.distributionSection}>
        <div className={styles.distHeader}>
          <span className="mono-label">Token Color Allocation</span>
          <span className="mono-readout" style={{ fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--color-green-ink)', fontWeight: 600 }}>{greenPct}% Green</span> vs{' '}
            <span style={{ color: 'var(--color-red-ink)', fontWeight: 600 }}>
              {(100 - Number(greenPct)).toFixed(1)}% Red
            </span>
          </span>
        </div>

        <div className={styles.barTrack}>
          <div
            className={styles.barGreen}
            style={{ width: `${greenPct}%` }}
            title={`Green tokens: ${detection.green_tokens} (${greenPct}%)`}
          />
          <div
            className={styles.barRed}
            style={{ width: `${100 - Number(greenPct)}%` }}
            title={`Red tokens: ${detection.red_tokens} (${(100 - Number(greenPct)).toFixed(1)}%)`}
          />
          <div
            className={styles.expectedMarker}
            style={{ left: `${expectedPct}%` }}
            title={`Expected null ratio: ${expectedPct}%`}
          />
        </div>
      </div>

      {/* Z-SCORE CALIBRATION GAUGE */}
      <div className={styles.zScoreMeter}>
        <div className={styles.distHeader}>
          <Tooltip id="detectionThreshold" align="left">
            <span className="mono-label">Z-Score Calibration Meter</span>
          </Tooltip>
          <span className="mono-readout" style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>
            z = {zScoreVal} (Decision at z ≥ {threshold.toFixed(1)})
          </span>
        </div>

        <div className={styles.zBarTrack}>
          <div
            className={styles.zBarFill}
            style={{
              width: `${zBarPct}%`,
              backgroundColor: isDetected ? 'var(--color-green-dot)' : 'var(--color-ink-muted)',
            }}
          />
          <div
            className={styles.zThresholdLine}
            style={{ left: `${zThreshPct}%` }}
            title={`Threshold: z = ${threshold.toFixed(1)}`}
          />
        </div>
      </div>
    </div>
  );
};
