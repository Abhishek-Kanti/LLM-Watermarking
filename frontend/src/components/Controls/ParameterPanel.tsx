import React, { useState } from 'react';
import styles from './ParameterPanel.module.css';
import { Tooltip } from './Tooltip';
import {
  PlayIcon,
  StopIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  DiceIcon,
  RotateCcwIcon,
  SparklesIcon,
} from '../Icons';

interface ParameterPanelProps {
  prompt: string;
  setPrompt: (p: string) => void;
  watermark: boolean;
  setWatermark: (w: boolean) => void;
  secretKey: string;
  setSecretKey: (k: string) => void;
  contextLength: number;
  setContextLength: (c: number) => void;
  gamma: number;
  setGamma: (g: number) => void;
  greenFraction: number;
  setGreenFraction: (gf: number) => void;
  temperature: number;
  setTemperature: (t: number) => void;
  topP: number;
  setTopP: (tp: number) => void;
  maxTokens: number;
  setMaxTokens: (mt: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onStop: () => void;
}

const PROMPT_SUGGESTIONS = [
  {
    label: 'Beginner AI',
    text: 'Explain artificial intelligence in simple words for a beginner.',
  },
  {
    label: 'Sci-Fi Signal',
    text: 'Write a short sci-fi story about astronomers detecting a mysterious repeating signal from deep space.',
  },
  {
    label: 'Watermark Tech',
    text: 'Explain how statistical green-red watermarking works in large language models and why it resists tampering.',
  },
  {
    label: 'Quantum Future',
    text: 'Summarize the potential breakthroughs and challenges of quantum computing in the next decade.',
  },
];

const DEFAULT_PARAMS = {
  secretKey: 'kanti-private-key-2026',
  contextLength: 4,
  gamma: 2.0,
  greenFraction: 0.5,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 150,
};

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  prompt,
  setPrompt,
  watermark,
  setWatermark,
  secretKey,
  setSecretKey,
  contextLength,
  setContextLength,
  gamma,
  setGamma,
  greenFraction,
  setGreenFraction,
  temperature,
  setTemperature,
  topP,
  setTopP,
  maxTokens,
  setMaxTokens,
  isGenerating,
  onGenerate,
  onStop,
}) => {
  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && prompt.trim()) {
        onGenerate();
      }
    }
  };

  const handleRandomizeKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    setSecretKey(`seed-${randomHex}`);
  };

  const handleResetDefaults = () => {
    setWatermark(true);
    setSecretKey(DEFAULT_PARAMS.secretKey);
    setContextLength(DEFAULT_PARAMS.contextLength);
    setGamma(DEFAULT_PARAMS.gamma);
    setGreenFraction(DEFAULT_PARAMS.greenFraction);
    setTemperature(DEFAULT_PARAMS.temperature);
    setTopP(DEFAULT_PARAMS.topP);
    setMaxTokens(DEFAULT_PARAMS.maxTokens);
  };

  // Dynamic CSS slider progress gradient calculation
  const getSliderStyle = (val: number, min: number, max: number, active: boolean = true) => {
    if (!active) {
      return {
        background: 'var(--color-rule)',
      };
    }
    const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
    return {
      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${pct}%, var(--color-rule) ${pct}%, var(--color-rule) 100%)`,
    };
  };

  return (
    <div className={`hairline-card ${styles.panel}`}>
      {/* PANEL HEADER WITH INSTRUMENT BADGE */}
      <div className="panel-header">
        <div className={styles.headerTitleGroup}>
          <span className={styles.activeDot} />
          <span className="panel-title">Model & Watermark Controller</span>
        </div>
        <div className={styles.modelTag}>
          <span className={styles.modelName}>QWEN3-0.6B</span>
          <span className={styles.modelVer}>v1.0</span>
        </div>
      </div>

      <div className={`panel-body ${styles.panelBody}`}>
        {/* 1. PROMPT COMPOSER */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <SparklesIcon size={12} color="var(--color-accent)" />
              <span className={styles.sectionTitle}>Prompt Composer</span>
            </div>
            <span className={styles.keycapHint}>
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
            </span>
          </div>

          {/* Quick preset chips */}
          <div className={styles.presetChips}>
            {PROMPT_SUGGESTIONS.map((sp) => (
              <button
                key={sp.label}
                type="button"
                className={`${styles.presetChip} ${prompt === sp.text ? styles.presetChipActive : ''}`}
                onClick={() => setPrompt(sp.text)}
                disabled={isGenerating}
                title={sp.text}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <div className={styles.promptBox}>
            <textarea
              className={styles.promptTextarea}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a prompt for Qwen3-0.6B..."
              rows={3}
              disabled={isGenerating}
              aria-label="Model prompt"
            />
            <div className={styles.promptBoxFooter}>
              <span className={styles.charCounter}>{prompt.length} chars</span>
              {prompt.trim() && !isGenerating && (
                <button
                  type="button"
                  className={styles.clearPromptBtn}
                  onClick={() => setPrompt('')}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. WATERMARK ENGINE STATUS CARD */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <KeyIcon size={12} color="var(--color-accent)" />
              <span className={styles.sectionTitle}>Watermark Engine</span>
            </div>
            <span className={styles.engineStatusTag}>
              {watermark ? 'Active' : 'Bypassed'}
            </span>
          </div>

          <div className={`${styles.masterToggleCard} ${watermark ? styles.toggleActive : styles.toggleInactive}`}>
            <div className={styles.toggleTextGroup}>
              <div className={styles.toggleHeader}>
                <span className={`${styles.statusPill} ${watermark ? styles.statusPillActive : styles.statusPillInactive}`}>
                  {watermark ? '● WATERMARK ARMED' : '○ BASELINE UNWATERMARKED'}
                </span>
              </div>
              <span className={styles.toggleNote}>
                {watermark
                  ? 'Kirchenbauer et al. green-list bias active'
                  : 'Natural sampling without cryptographic perturbation'}
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
                disabled={isGenerating}
                aria-label="Toggle watermarking"
              />
              <span className={styles.sliderRound} />
            </label>
          </div>

          {/* Watermark Parameters Sub-card */}
          <div className={`${styles.paramSubcard} ${!watermark ? styles.subcardDisabled : ''}`}>
            {/* Secret Key Row */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="secretKey" align="left">
                  <span className={styles.paramLabel}>
                    <KeyIcon size={12} color="var(--color-ink-muted)" />
                    <span>Secret Seed Key</span>
                  </span>
                </Tooltip>
                <button
                  type="button"
                  className={styles.miniBtn}
                  onClick={handleRandomizeKey}
                  disabled={isGenerating || !watermark}
                  title="Generate a new random seed"
                >
                  <DiceIcon size={12} />
                  <span>Randomize</span>
                </button>
              </div>
              <div className={styles.secretKeyWrapper}>
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  className={styles.secretKeyInput}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  disabled={isGenerating || !watermark}
                  placeholder="private-seed-key"
                  aria-label="Secret key"
                />
                <button
                  type="button"
                  className={styles.keyToggleBtn}
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  title={showSecretKey ? 'Hide key' : 'Show key'}
                  disabled={isGenerating || !watermark}
                >
                  {showSecretKey ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
                </button>
              </div>
            </div>

            {/* Context Length (h) */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="contextLength" align="left">
                  <span className={styles.paramLabel}>Context Window (h)</span>
                </Tooltip>
                <span className={styles.valueBadge}>{contextLength} tokens</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={1}
                max={8}
                step={1}
                value={contextLength}
                onChange={(e) => setContextLength(Number(e.target.value))}
                disabled={isGenerating || !watermark}
                style={getSliderStyle(contextLength, 1, 8, watermark)}
                aria-label="Context length"
              />
              <div className={styles.tickRow}>
                <span>1 token (local)</span>
                <span>8 tokens (strict)</span>
              </div>
            </div>

            {/* Green Fraction (gamma) */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="greenFraction" align="left">
                  <span className={styles.paramLabel}>Green Partition (γ)</span>
                </Tooltip>
                <span className={styles.valueBadge}>{(greenFraction * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={0.1}
                max={0.9}
                step={0.05}
                value={greenFraction}
                onChange={(e) => setGreenFraction(Number(e.target.value))}
                disabled={isGenerating || !watermark}
                style={getSliderStyle(greenFraction, 0.1, 0.9, watermark)}
                aria-label="Green fraction"
              />
              <div className={styles.tickRow}>
                <span>10% (sparse)</span>
                <span>50% (balanced)</span>
                <span>90% (dense)</span>
              </div>
            </div>

            {/* Logit Bonus (delta / gamma) */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="gamma" align="left">
                  <span className={styles.paramLabel}>Logit Bonus (δ / γ)</span>
                </Tooltip>
                <span className={styles.valueBadge}>+{gamma.toFixed(1)} logits</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={0.0}
                max={5.0}
                step={0.1}
                value={gamma}
                onChange={(e) => setGamma(Number(e.target.value))}
                disabled={isGenerating || !watermark}
                style={getSliderStyle(gamma, 0.0, 5.0, watermark)}
                aria-label="Gamma logit bonus"
              />
              <div className={styles.tickRow}>
                <span>0.0 (no bias)</span>
                <span>2.0 (standard)</span>
                <span>5.0 (heavy)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SAMPLING PARAMETERS */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Sampling Parameters</span>
          </div>

          <div className={styles.samplingCard}>
            {/* Temperature */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="temperature" align="left">
                  <span className={styles.paramLabel}>Temperature</span>
                </Tooltip>
                <span className={styles.valueBadge}>{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={0.0}
                max={1.5}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                disabled={isGenerating}
                style={getSliderStyle(temperature, 0.0, 1.5, true)}
                aria-label="Temperature"
              />
              <div className={styles.quickPresetRow}>
                <button
                  type="button"
                  className={`${styles.quickBtn} ${temperature === 0.2 ? styles.quickBtnActive : ''}`}
                  onClick={() => setTemperature(0.2)}
                  disabled={isGenerating}
                >
                  0.2 Precise
                </button>
                <button
                  type="button"
                  className={`${styles.quickBtn} ${temperature === 0.7 ? styles.quickBtnActive : ''}`}
                  onClick={() => setTemperature(0.7)}
                  disabled={isGenerating}
                >
                  0.7 Balanced
                </button>
                <button
                  type="button"
                  className={`${styles.quickBtn} ${temperature === 1.0 ? styles.quickBtnActive : ''}`}
                  onClick={() => setTemperature(1.0)}
                  disabled={isGenerating}
                >
                  1.0 Creative
                </button>
              </div>
            </div>

            {/* Top-P (Nucleus) */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="topP" align="left">
                  <span className={styles.paramLabel}>Top-P (Nucleus)</span>
                </Tooltip>
                <span className={styles.valueBadge}>{topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={0.1}
                max={1.0}
                step={0.05}
                value={topP}
                onChange={(e) => setTopP(Number(e.target.value))}
                disabled={isGenerating}
                style={getSliderStyle(topP, 0.1, 1.0, true)}
                aria-label="Top-P"
              />
            </div>

            {/* Max Tokens */}
            <div className={styles.controlRow}>
              <div className={styles.labelRow}>
                <Tooltip id="maxTokens" align="left">
                  <span className={styles.paramLabel}>Max Tokens</span>
                </Tooltip>
                <span className={styles.valueBadge}>{maxTokens} tokens</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={20}
                max={400}
                step={10}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                disabled={isGenerating}
                style={getSliderStyle(maxTokens, 20, 400, true)}
                aria-label="Max tokens"
              />
              <div className={styles.quickPresetRow}>
                {[50, 100, 150, 250].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`${styles.quickBtn} ${maxTokens === num ? styles.quickBtnActive : ''}`}
                    onClick={() => setMaxTokens(num)}
                    disabled={isGenerating}
                  >
                    {num} tok
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. PRIMARY ACTIONS */}
        <div className={styles.actionGroup}>
          {!isGenerating ? (
            <button
              type="button"
              className={styles.generateButton}
              onClick={onGenerate}
              disabled={!prompt.trim()}
            >
              <PlayIcon size={14} color="var(--color-accent-contrast)" />
              <span>Generate Stream</span>
              <kbd className={styles.btnKbd}>↵</kbd>
            </button>
          ) : (
            <button type="button" className={styles.stopButton} onClick={onStop}>
              <StopIcon size={14} />
              <span>Stop Generating</span>
            </button>
          )}

          <button
            type="button"
            className={styles.resetAllBtn}
            onClick={handleResetDefaults}
            disabled={isGenerating}
          >
            <RotateCcwIcon size={11} />
            <span>Reset to default baseline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
