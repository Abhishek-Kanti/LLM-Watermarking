import React, { useState, useEffect } from 'react';
import { useWatermarking } from './hooks/useWatermarking';
import { BorderedNav } from './components/Nav/BorderedNav';
import { CommandPalette } from './components/Nav/CommandPalette';
import { ParameterPanel } from './components/Controls/ParameterPanel';
import { OutputWorkbench } from './components/Playground/OutputWorkbench';
import { DualRunModal } from './components/Comparison/DualRunModal';
import { MinimalFooter } from './components/Footer/MinimalFooter';

export const App: React.FC = () => {
  const {
    // Parameters
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
    activePresetId,
    applyPreset,

    // Generation state
    isGenerating,
    generationError,
    generatedText,
    hasGenerated,
    startGeneration,
    stopGeneration,

    // Editing state
    editedText,
    setEditedText,
    isModified,
    resetToOriginal,

    // Detection state
    isDetecting,
    detectError,
    originalDetection,
    modifiedDetection,
    reDetectOriginal,
    detectModifiedText,

    // Token inspection
    hoveredTokenIndex,
    setHoveredTokenIndex,
    pinnedTokenIndex,
    togglePinToken,
  } = useWatermarking();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Global key listener for Ctrl+K / ⌘K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="app-container">
      {/* Hallmark Cobalt Bordered Nav */}
      <BorderedNav
        activePresetId={activePresetId}
        onSelectPreset={applyPreset}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
      />

      {/* Main Two-Pane Responsive Workbench */}
      <main className="main-content" role="main">
        <div className="workbench-grid">
          {/* Left / Configuration Pane */}
          <aside aria-label="Workbench Parameters & Configuration">
            <ParameterPanel
              prompt={prompt}
              setPrompt={setPrompt}
              watermark={watermark}
              setWatermark={setWatermark}
              secretKey={secretKey}
              setSecretKey={setSecretKey}
              contextLength={contextLength}
              setContextLength={setContextLength}
              gamma={gamma}
              setGamma={setGamma}
              greenFraction={greenFraction}
              setGreenFraction={setGreenFraction}
              temperature={temperature}
              setTemperature={setTemperature}
              topP={topP}
              setTopP={setTopP}
              maxTokens={maxTokens}
              setMaxTokens={setMaxTokens}
              isGenerating={isGenerating}
              onGenerate={startGeneration}
              onStop={stopGeneration}
            />
          </aside>

          {/* Right / Live Output & Statistical Evidence Pane */}
          <section aria-label="Output & Detection Canvas">
            <OutputWorkbench
              isGenerating={isGenerating}
              generationError={generationError}
              generatedText={generatedText}
              hasGenerated={hasGenerated}
              contextLength={contextLength}
              originalDetection={originalDetection}
              modifiedDetection={modifiedDetection}
              isDetecting={isDetecting}
              detectError={detectError}
              onDetectOriginal={reDetectOriginal}
              editedText={editedText}
              onTextChange={setEditedText}
              isModified={isModified}
              onRedetectModified={detectModifiedText}
              onResetText={resetToOriginal}
              hoveredTokenIndex={hoveredTokenIndex}
              onHoverToken={setHoveredTokenIndex}
              pinnedTokenIndex={pinnedTokenIndex}
              onTogglePinToken={togglePinToken}
            />
          </section>
        </div>
      </main>

      {/* Hallmark Minimal Ft2 Footer */}
      <MinimalFooter />

      {/* Modals & Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onGenerate={startGeneration}
        onDetect={reDetectOriginal}
        onToggleWatermark={() => setWatermark(!watermark)}
        isWatermarkOn={watermark}
        onApplyPreset={applyPreset}
        onOpenCompare={() => setIsCompareModalOpen(true)}
        onResetText={resetToOriginal}
      />

      <DualRunModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        prompt={prompt}
        secretKey={secretKey}
        contextLength={contextLength}
        gamma={gamma}
        greenFraction={greenFraction}
        temperature={temperature}
        topP={topP}
        maxTokens={maxTokens}
      />
    </div>
  );
};
