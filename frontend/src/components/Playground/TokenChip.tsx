import React from 'react';
import styles from './TokenChip.module.css';
import { TokenClassification } from '../../types/api';

interface TokenChipProps {
  tokenData: TokenClassification;
  index: number;
  isHovered: boolean;
  isInContext: boolean;
  onHover: (index: number | null) => void;
}

export const TokenChip: React.FC<TokenChipProps> = ({
  tokenData,
  index,
  isHovered,
  isInContext,
  onHover,
}) => {
  const isGreen = tokenData.color === 'green';

  return (
    <span
      className={`
        ${styles.chip}
        ${isGreen ? styles.green : styles.red}
        ${isHovered ? styles.hovered : ''}
        ${isInContext ? styles.inContext : ''}
      `}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      tabIndex={0}
      role="button"
      aria-label={`Token ${index}: "${tokenData.token}", classified ${tokenData.color}`}
    >
      <span
        className={styles.semanticDot}
        aria-hidden="true"
        title={isGreen ? 'Green token (watermark biased)' : 'Red token (unbiased)'}
      />
      <span>{tokenData.token}</span>
    </span>
  );
};
