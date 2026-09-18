import React, { useEffect, useState } from 'react';
import styles from './BorderedNav.module.css';
import { PRESETS } from '../../constants/presets';
import { ParameterPreset } from '../../types/api';
import { checkBackendHealth } from '../../services/api';

interface BorderedNavProps {
  activePresetId: string;
  onSelectPreset: (preset: ParameterPreset) => void;
  onOpenCommandPalette: () => void;
  onOpenCompareModal: () => void;
}

export const BorderedNav: React.FC<BorderedNavProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenCommandPalette,
  onOpenCompareModal,
}) => {
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth().then(setIsBackendHealthy);
    const interval = setInterval(() => {
      checkBackendHealth().then(setIsBackendHealthy);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className={styles.navBar} aria-label="Main Navigation">
      <div className={styles.navInner}>
        <div className={styles.brandGroup}>
          <div className={styles.logoBadge} aria-hidden="true">
            λ
          </div>
          <div className={styles.titleWrapper}>
            <span className={styles.brandTitle}>LLM Watermarking Workbench</span>
            <span className={styles.modelBadge}>Qwen3-0.6B · Kirchenbauer et al. (2023)</span>
          </div>

          <div
            className={`status-chip ${isBackendHealthy ? 'success' : ''}`}
            title={isBackendHealthy ? 'Connected to backend on port 8000' : 'Checking backend...'}
          >
            <span className="status-dot" />
            <span>{isBackendHealthy === true ? 'API LIVE' : isBackendHealthy === false ? 'OFFLINE' : 'CONNECTING'}</span>
          </div>
        </div>

        <div className={styles.actionsGroup}>
          <select
            className={styles.presetSelect}
            value={activePresetId}
            onChange={(e) => {
              const selected = PRESETS.find((p) => p.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            aria-label="Select parameter preset"
          >
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                Preset: {preset.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles.commandButton}
            onClick={onOpenCompareModal}
            title="Compare watermarked vs unwatermarked baseline"
          >
            <span>Compare Runs</span>
          </button>

          <button
            type="button"
            className={styles.commandButton}
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
          >
            <span>Actions</span>
            <span className={styles.kbdPill}>⌘K</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
