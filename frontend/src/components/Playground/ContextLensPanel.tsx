import React from 'react';
import styles from './ContextLensPanel.module.css';
import { TokenClassification } from '../../types/api';

interface ContextLensPanelProps {
  tokens: TokenClassification[];
  activeIndex: number;
  contextLength: number;
  isPinned: boolean;
  onUnpin?: () => void;
}

export const ContextLensPanel: React.FC<ContextLensPanelProps> = ({
  tokens,
  activeIndex,
  contextLength,
  isPinned,
  onUnpin,
}) => {
  const targetToken = tokens[activeIndex];
  if (!targetToken) return null;

  // The preceding context tokens that determined this token's green/red split
  const startIdx = Math.max(0, activeIndex - contextLength);
  const contextTokens = tokens.slice(startIdx, activeIndex);

  return (
    <div className={styles.lensBox} role="region" aria-label="Context Lens details">
      <div className={styles.titleRow}>
        <div className={styles.lensTitle}>
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
          {isPinned && (
            <span className={styles.pinnedTag} title="Token pinned. Click token again or ✕ to unpin">
              PINNED
            </span>
          )}
        </div>

        <div className={styles.rightActions}>
          <span className="mono-label">h = {contextLength}</span>
          {isPinned && onUnpin && (
            <button
              type="button"
              className={styles.unpinBtn}
              onClick={onUnpin}
              title="Unpin context lens"
              aria-label="Unpin context lens"
            >
              ✕ Unpin
            </button>
          )}
        </div>
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
        {isPinned ? ' (Click or tap the token again to unpin)' : ' (Click or tap any token to lock this inspection)'}
      </p>
    </div>
  );
};
