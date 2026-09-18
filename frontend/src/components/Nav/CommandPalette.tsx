import React, { useState, useEffect, useRef } from 'react';
import styles from './CommandPalette.module.css';
import { PRESETS } from '../../constants/presets';
import { ParameterPreset } from '../../types/api';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onDetect: () => void;
  onToggleWatermark: () => void;
  isWatermarkOn: boolean;
  onApplyPreset: (preset: ParameterPreset) => void;
  onOpenCompare: () => void;
  onResetText: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onGenerate,
  onDetect,
  onToggleWatermark,
  isWatermarkOn,
  onApplyPreset,
  onOpenCompare,
  onResetText,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'generate',
      label: 'Generate Stream',
      category: 'Actions',
      shortcut: 'Ctrl+Enter',
      action: () => {
        onGenerate();
        onClose();
      },
    },
    {
      id: 'detect',
      label: 'Detect Watermark',
      category: 'Actions',
      shortcut: 'Ctrl+D',
      action: () => {
        onDetect();
        onClose();
      },
    },
    {
      id: 'toggle-wm',
      label: `Turn Watermarking ${isWatermarkOn ? 'OFF' : 'ON'}`,
      category: 'Configuration',
      action: () => {
        onToggleWatermark();
        onClose();
      },
    },
    {
      id: 'compare',
      label: 'Compare Watermarked vs Baseline',
      category: 'Analysis',
      action: () => {
        onOpenCompare();
        onClose();
      },
    },
    {
      id: 'reset',
      label: 'Reset Text to Original Generation',
      category: 'Editor',
      action: () => {
        onResetText();
        onClose();
      },
    },
    ...PRESETS.map((preset) => ({
      id: `preset-${preset.id}`,
      label: `Load Preset: ${preset.name}`,
      category: 'Presets',
      action: () => {
        onApplyPreset(preset);
        onClose();
      },
    })),
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className={styles.palette}>
        <div className={styles.searchBar}>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Type a command or search presets..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>

        <div className={styles.commandList}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                className={`${styles.commandItem} ${idx === selectedIndex ? styles.selected : ''}`}
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={styles.commandLeft}>
                  <span className={styles.badge}>{cmd.category}</span>
                  <span>{cmd.label}</span>
                </div>
                {cmd.shortcut && <span className={styles.kbd}>{cmd.shortcut}</span>}
              </button>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>↑↓ Navigate</span>
          <span>↵ Execute</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};
