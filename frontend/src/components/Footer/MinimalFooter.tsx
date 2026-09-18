import React from 'react';
import styles from './MinimalFooter.module.css';

export const MinimalFooter: React.FC = () => {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.citation}>
          <span>Based on</span>
          <strong style={{ color: 'var(--color-ink-2)' }}>
            Kirchenbauer et al. (2023)
          </strong>
          <span>&mdash; &ldquo;A Watermark for Large Language Models&rdquo;</span>
        </div>

        <div className={styles.metaTags}>
          <span className={styles.tag}>Model: Qwen3-0.6B</span>
          <span>&middot;</span>
          <span className={styles.tag}>FastAPI Backend (Port 8000)</span>
          <span>&middot;</span>
          <span className={styles.tag}>Hallmark Cobalt Design</span>
        </div>
      </div>
    </footer>
  );
};
