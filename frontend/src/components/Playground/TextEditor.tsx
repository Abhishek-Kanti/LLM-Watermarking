import React from 'react';
import styles from './TextEditor.module.css';
import { DetectIcon, ResetIcon } from '../Icons';

interface TextEditorProps {
  editedText: string;
  onTextChange: (text: string) => void;
  isModified: boolean;
  isDetecting: boolean;
  onRedetect: () => void;
  onReset: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  editedText,
  onTextChange,
  isModified,
  isDetecting,
  onRedetect,
  onReset,
}) => {
  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorHeader}>
        <div className={styles.titleArea}>
          <span className={styles.editorTitle}>Robustness & Tampering Sandbox</span>
          {isModified ? (
            <span className={styles.badgeModified}>● Modified Text</span>
          ) : (
            <span className={styles.badgeOriginal}>Original Generation</span>
          )}
        </div>

        <span className={styles.charCount}>{editedText.length} characters</span>
      </div>

      <p className={styles.description}>
        Edit the text below (delete words, paraphrase, or inject new sentences), then run detection again to observe how human edits dilute the watermark signal.
      </p>

      <textarea
        className={styles.textarea}
        value={editedText}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Edit generated text here..."
        rows={4}
        aria-label="Editable generated text"
      />

      <div className={styles.actionBar}>
        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.redetectBtn}
            onClick={onRedetect}
            disabled={isDetecting || !editedText.trim()}
          >
            <DetectIcon size={14} color="var(--color-accent-contrast)" />
            <span>{isDetecting ? 'Analyzing...' : 'Run Detection Again'}</span>
          </button>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={onReset}
            disabled={!isModified || isDetecting}
            title="Reset back to the original model output"
          >
            <ResetIcon size={13} />
            <span>Reset to Original</span>
          </button>
        </div>

        <span className="mono-label" style={{ fontSize: '0.68rem' }}>
          Mode: {isModified ? 'Re-tokenized (Text)' : 'Token-exact (Preserved IDs)'}
        </span>
      </div>
    </div>
  );
};
