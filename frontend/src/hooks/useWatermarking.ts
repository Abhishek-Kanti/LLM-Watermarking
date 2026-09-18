import { useState, useRef, useCallback, useEffect } from 'react';
import {
  GenerateRequest,
  DetectResult,
  ParameterPreset,
} from '../types/api';
import { streamGenerate, detectWatermark } from '../services/api';
import { PRESETS } from '../constants/presets';

export function useWatermarking() {
  // Configurable Parameters
  const [prompt, setPrompt] = useState(PRESETS[0].prompt);
  const [watermark, setWatermark] = useState(PRESETS[0].watermark);
  const [secretKey, setSecretKey] = useState(PRESETS[0].secret_key);
  const [contextLength, setContextLength] = useState(PRESETS[0].context_length);
  const [gamma, setGamma] = useState(PRESETS[0].gamma);
  const [greenFraction, setGreenFraction] = useState(PRESETS[0].green_fraction);
  const [temperature, setTemperature] = useState(PRESETS[0].temperature);
  const [topP, setTopP] = useState(PRESETS[0].top_p);
  const [maxTokens, setMaxTokens] = useState(PRESETS[0].max_tokens);

  // Active Preset
  const [activePresetId, setActivePresetId] = useState<string>('default');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState('');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [preservedTokenIds, setPreservedTokenIds] = useState<number[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Editing State
  const [editedText, setEditedText] = useState('');
  const isModified = hasGenerated && editedText !== generatedText;

  // Detection State
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [originalDetection, setOriginalDetection] = useState<DetectResult | null>(null);
  const [modifiedDetection, setModifiedDetection] = useState<DetectResult | null>(null);

  // Token Inspection / Context-Lens State
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);

  // Abort Controller for in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Apply a preset
  const applyPreset = useCallback((preset: ParameterPreset) => {
    setActivePresetId(preset.id);
    setPrompt(preset.prompt);
    setWatermark(preset.watermark);
    setSecretKey(preset.secret_key);
    setContextLength(preset.context_length);
    setGamma(preset.gamma);
    setGreenFraction(preset.green_fraction);
    setTemperature(preset.temperature);
    setTopP(preset.top_p);
    setMaxTokens(preset.max_tokens);
  }, []);

  // Detect original untouched generation
  const detectOriginal = useCallback(
    async (
      genId: string | null,
      tokenIds: number[],
      currentPrompt: string,
      currentKey: string,
      currentCtxLen: number,
      currentGreenFrac: number,
      rawText: string
    ) => {
      setIsDetecting(true);
      setDetectError(null);

      try {
        const result = await detectWatermark({
          prompt: currentPrompt,
          generation_id: genId,
          token_ids: tokenIds.length > 0 ? tokenIds : null,
          text: tokenIds.length === 0 ? rawText : null,
          secret_key: currentKey,
          context_length: currentCtxLen,
          green_fraction: currentGreenFrac,
        });

        setOriginalDetection(result);
        return result;
      } catch (err) {
        setDetectError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );

  // Start generation with live SSE streaming
  const startGeneration = useCallback(async () => {
    if (isGenerating) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedText('');
    setEditedText('');
    setGenerationId(null);
    setPreservedTokenIds([]);
    setOriginalDetection(null);
    setModifiedDetection(null);
    setHoveredTokenIndex(null);
    setHasGenerated(false);

    let accumulatedText = '';

    const req: GenerateRequest = {
      prompt,
      watermark,
      secret_key: secretKey,
      context_length: contextLength,
      gamma,
      green_fraction: greenFraction,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
    };

    await streamGenerate(
      req,
      {
        onChunk: (chunk: string) => {
          accumulatedText += chunk;
          setGeneratedText(accumulatedText);
          setEditedText(accumulatedText);
        },
        onComplete: (genId: string | null, tokenIds: number[]) => {
          setIsGenerating(false);
          setHasGenerated(true);
          setGenerationId(genId);
          setPreservedTokenIds(tokenIds);

          // Automatically run initial detection on completed original text
          if (accumulatedText.trim().length > 0) {
            detectOriginal(
              genId,
              tokenIds,
              prompt,
              secretKey,
              contextLength,
              greenFraction,
              accumulatedText
            );
          }
        },
        onError: (err: Error) => {
          setIsGenerating(false);
          setGenerationError(err.message);
        },
      },
      controller.signal
    );
  }, [
    isGenerating,
    prompt,
    watermark,
    secretKey,
    contextLength,
    gamma,
    greenFraction,
    temperature,
    topP,
    maxTokens,
    detectOriginal,
  ]);

  // Stop / cancel generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setHasGenerated(true);
  }, []);

  // Run detection on modified/edited text
  const detectModifiedText = useCallback(async () => {
    if (!editedText || isDetecting) return;

    setIsDetecting(true);
    setDetectError(null);

    try {
      // NOTE: Per Requirement 14, DO NOT pass preserved token IDs for modified text!
      // Send the current edited text so the backend re-tokenizes the modified sequence.
      const result = await detectWatermark({
        prompt,
        text: editedText,
        token_ids: null,
        generation_id: null,
        secret_key: secretKey,
        context_length: contextLength,
        green_fraction: greenFraction,
      });

      setModifiedDetection(result);
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDetecting(false);
    }
  }, [editedText, isDetecting, prompt, secretKey, contextLength, greenFraction]);

  // Re-run detection on original text
  const reDetectOriginal = useCallback(() => {
    if (!generatedText) return;
    detectOriginal(
      generationId,
      preservedTokenIds,
      prompt,
      secretKey,
      contextLength,
      greenFraction,
      generatedText
    );
  }, [
    generatedText,
    detectOriginal,
    generationId,
    preservedTokenIds,
    prompt,
    secretKey,
    contextLength,
    greenFraction,
  ]);

  // Reset edited text back to original
  const resetToOriginal = useCallback(() => {
    setEditedText(generatedText);
    setModifiedDetection(null);
  }, [generatedText]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
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
    generationId,
    preservedTokenIds,
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
  };
}
