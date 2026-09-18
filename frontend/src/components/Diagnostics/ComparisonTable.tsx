import React from 'react';
import styles from './ComparisonTable.module.css';
import { DetectResult } from '../../types/api';

interface ComparisonTableProps {
  original: DetectResult | null;
  modified: DetectResult | null;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ original, modified }) => {
  if (!original || !modified) return null;

  const zDiff = (modified.z_score - original.z_score).toFixed(2);
  const greenDiff = ((modified.green_ratio - original.green_ratio) * 100).toFixed(1);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <span className={styles.tableTitle}>Perturbation Impact: Original vs. Modified</span>
        <span className="mono-label">Real Detection Comparison</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Original Generation</th>
            <th>Modified Text</th>
            <th>Signal Shift</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.metricName}>Total Tokens</td>
            <td className={styles.valueCell}>{original.total_tokens}</td>
            <td className={styles.valueCell}>{modified.total_tokens}</td>
            <td className={styles.valueCell}>
              {modified.total_tokens - original.total_tokens > 0
                ? `+${modified.total_tokens - original.total_tokens}`
                : modified.total_tokens - original.total_tokens}
            </td>
          </tr>

          <tr>
            <td className={styles.metricName}>Green Tokens</td>
            <td className={styles.valueCell}>{original.green_tokens}</td>
            <td className={styles.valueCell}>{modified.green_tokens}</td>
            <td className={styles.valueCell}>
              {modified.green_tokens - original.green_tokens > 0
                ? `+${modified.green_tokens - original.green_tokens}`
                : modified.green_tokens - original.green_tokens}
            </td>
          </tr>

          <tr>
            <td className={styles.metricName}>Green Ratio</td>
            <td className={styles.valueCell}>{(original.green_ratio * 100).toFixed(1)}%</td>
            <td className={styles.valueCell}>{(modified.green_ratio * 100).toFixed(1)}%</td>
            <td className={styles.valueCell}>
              <span className={Number(greenDiff) < 0 ? styles.diffBadgeNegative : styles.diffBadgePositive}>
                {Number(greenDiff) > 0 ? `+${greenDiff}%` : `${greenDiff}%`}
              </span>
            </td>
          </tr>

          <tr>
            <td className={styles.metricName}>Z-Score</td>
            <td className={styles.valueCell}>{original.z_score.toFixed(3)}</td>
            <td className={styles.valueCell}>{modified.z_score.toFixed(3)}</td>
            <td className={styles.valueCell}>
              <span className={Number(zDiff) < 0 ? styles.diffBadgeNegative : styles.diffBadgePositive}>
                {Number(zDiff) > 0 ? `+${zDiff}` : zDiff}
              </span>
            </td>
          </tr>

          <tr>
            <td className={styles.metricName}>P-Value</td>
            <td className={styles.valueCell}>
              {original.p_value < 0.0001 ? original.p_value.toExponential(3) : original.p_value.toFixed(4)}
            </td>
            <td className={styles.valueCell}>
              {modified.p_value < 0.0001 ? modified.p_value.toExponential(3) : modified.p_value.toFixed(4)}
            </td>
            <td className={styles.valueCell} style={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              {modified.p_value > original.p_value ? 'Significance weakened' : 'Significance preserved'}
            </td>
          </tr>

          <tr>
            <td className={styles.metricName}>Watermark Detected</td>
            <td className={original.detected ? styles.detectedYes : styles.detectedNo}>
              {original.detected ? 'YES' : 'NO'}
            </td>
            <td className={modified.detected ? styles.detectedYes : styles.detectedNo}>
              {modified.detected ? 'YES' : 'NO'}
            </td>
            <td className={styles.valueCell} style={{ fontWeight: 600 }}>
              {original.detected && !modified.detected ? (
                <span style={{ color: 'var(--color-red-ink)' }}>Watermark Removed</span>
              ) : original.detected && modified.detected ? (
                <span style={{ color: 'var(--color-green-ink)' }}>Watermark Resilient</span>
              ) : (
                'Unchanged'
              )}
            </td>
          </tr>

          <tr>
            <td className={styles.metricName}>Detection Mode</td>
            <td className="mono-readout" style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>
              {original.token_exact ? 'Token-exact (IDs)' : 'Re-tokenized'}
            </td>
            <td className="mono-readout" style={{ fontSize: '0.72rem', color: 'var(--color-accent)' }}>
              {modified.token_exact ? 'Token-exact (IDs)' : 'Re-tokenized (Text)'}
            </td>
            <td style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>
              Re-tokenized on edited text
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
