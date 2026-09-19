import React from 'react';
import styles from './TokenChip.module.css';
import { TokenClassification } from '../../types/api';

interface TokenChipProps {
  tokenData: TokenClassification;
  index: number;
  isHovered: boolean;
  isPinned?: boolean;
  isInContext: boolean;
  onHover: (index: number | null) => void;
  onSelect?: (index: number) => void;
}

export const TokenChip: React.FC<TokenChipProps> = ({
  tokenData,
  index,
  isHovered,
  isPinned = false,
  isInContext,
  onHover,
  onSelect,
}) => {
  const isGreen = tokenData.color === 'green';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(index);
    }
  };

  return (
    <span
      className={`
        ${styles.chip}
        ${isGreen ? styles.green : styles.red}
        ${isHovered ? styles.hovered : ''}
        ${isPinned ? styles.pinned : ''}
        ${isInContext ? styles.inContext : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      tabIndex={0}
      role="button"
      aria-pressed={isPinned}
      aria-label={`Token ${index}: "${tokenData.token}", classified ${tokenData.color}${isPinned ? ', pinned' : ''}`}
    >
      <span
        className={styles.semanticDot}
        aria-hidden="true"
        title={isGreen ? 'Green token (watermark biased)' : 'Red token (unbiased)'}
      />
      <span>{tokenData.token}</span>
      {isPinned && <span className={styles.pinIndicator} aria-hidden="true">●</span>}
    </span>
  );
};
