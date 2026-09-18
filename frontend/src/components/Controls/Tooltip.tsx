import React, { useState } from 'react';
import styles from './Tooltip.module.css';
import { EXPLANATIONS } from '../../constants/explanations';

interface TooltipProps {
  id?: string;
  title?: string;
  symbol?: string;
  text?: string;
  formula?: string;
  align?: 'center' | 'left' | 'right';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  id,
  title,
  symbol,
  text,
  formula,
  align = 'center',
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const item = id && EXPLANATIONS[id] ? EXPLANATIONS[id] : null;
  const displayTitle = title || item?.title;
  const displaySymbol = symbol || item?.symbol;
  const displayText = text || item?.summary;
  const displayFormula = formula || item?.mathFormula;

  if (!displayText && !displayTitle) {
    return <>{children}</>;
  }

  return (
    <span
      className={styles.tooltipContainer}
      onClick={() => setMobileOpen(!mobileOpen)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setMobileOpen(false);
      }}
    >
      <span
        tabIndex={0}
        role="button"
        aria-label={`Help for ${displayTitle || 'parameter'}`}
        className={styles.trigger}
      >
        {children}
      </span>

      <span
        role="tooltip"
        className={`
          ${styles.bubble}
          ${align === 'left' ? styles.alignLeft : ''}
          ${align === 'right' ? styles.alignRight : ''}
          ${mobileOpen ? styles.forceVisible : ''}
        `}
      >
        {displayTitle && (
          <span className={styles.header}>
            <span className={styles.title}>{displayTitle}</span>
            {displaySymbol && <span className={styles.symbol}>{displaySymbol}</span>}
          </span>
        )}
        <span className={styles.summary}>{displayText}</span>
        {displayFormula && <span className={styles.formula}>{displayFormula}</span>}
      </span>
    </span>
  );
};
