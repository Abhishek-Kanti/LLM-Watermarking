import React from 'react';
import styles from './ContextLensPanel.module.css';
import { TokenClassification } from '../../types/api';

interface ContextLensPanelProps {
  tokens: TokenClassification[];
  hoveredIndex: number;
  contextLength: number;
}

export const ContextLensPanel: React.FC<ContextLensPanelProps> = ({
  tokens,
  hoveredIndex,
  contextLength,
}) => {
  const targetToken = tokens[hoveredIndex];
  if (!targetToken) return null;

  // The preceding context tokens that determined this token's green/red split
  const startIdx = Math.max(0, hoveredIndex - contextLength);
  const contextTokens = tokens.slice(startIdx, hoveredIndex);

  return (
    <div className={styles.lensBox} role="region" aria-label="Context Lens details">
      <div className={styles.titleRow}>
        <span className={styles.lensTitle}>
          <span>Context Lens:</span>
          <span className={styles.tokenTarget}>
            &quot;{targetToken.token}&quot; (ID: {targetToken.token_id})
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: targetToken.color === 'green' ? 'var(--color-green-ink)' : 'var(--color-red-ink)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              marginLeft: '4px',
            }}
          >
            ● {targetToken.color}
          </span>
        </span>
        <span className="mono-label">h = {contextLength}</span>
      </div>

      <div className={styles.contextSnippet}>
        <span style={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem', marginRight: '4px' }}>
          Preceding context:
        </span>
        {contextTokens.length === 0 ? (
          <span style={{ fontStyle: 'italic', color: 'var(--color-ink-muted)' }}>
            [Initial prompt context tokens]
          </span>
        ) : (
          contextTokens.map((t, idx) => (
            <span key={idx} className={styles.contextToken}>
              {t.token}
            </span>
          ))
        )}
      </div>

      <p className={styles.explanation}>
        This {contextTokens.length}-token context sequence combined with the secret key seeded the pseudo-random generator, deterministically designating &quot;{targetToken.token}&quot; as {targetToken.color}.
      </p>
    </div>
  );
};
