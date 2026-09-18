import { DetectRequest, DetectResult, GenerateRequest, GenerationMetadata } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (generationId: string | null, tokenIds: number[]) => void;
  onError: (error: Error) => void;
}

/**
 * Stream text generation using SSE format
 */
export async function streamGenerate(
  request: GenerateRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const payload: GenerateRequest = {
      ...request,
      stream_format: 'sse',
      enable_thinking: false,
    };

    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText || response.statusText}`);
    }

    const headerGenId = response.headers.get('X-Generation-ID');
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error('Response body stream is not available');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalGenId: string | null = headerGenId;
    let finalTokenIds: number[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, '');
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.text) {
            callbacks.onChunk(parsed.text);
          }

          if (parsed.done) {
            if (parsed.generation_id) finalGenId = parsed.generation_id;
            if (Array.isArray(parsed.token_ids)) finalTokenIds = parsed.token_ids;
          }
        } catch {
          // Ignore partial or non-json keepalive comments
        }
      }
    }

    // Flush any leftover buffer
    if (buffer.trim().startsWith('data:')) {
      try {
        const parsed = JSON.parse(buffer.trim().replace(/^data:\s*/, ''));
        if (parsed.text) callbacks.onChunk(parsed.text);
        if (parsed.done) {
          if (parsed.generation_id) finalGenId = parsed.generation_id;
          if (Array.isArray(parsed.token_ids)) finalTokenIds = parsed.token_ids;
        }
      } catch {
        // ignore
      }
    }

    callbacks.onComplete(finalGenId, finalTokenIds);
  } catch (err) {
    if (signal?.aborted) {
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Detect watermark in generated text (token-exact or re-tokenized)
 */
export async function detectWatermark(request: DetectRequest): Promise<DetectResult> {
  const response = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      enable_thinking: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Detection failed (${response.status}): ${errorText || response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch cached generation record by ID
 */
export async function getGeneration(generationId: string): Promise<GenerationMetadata> {
  const response = await fetch(`${API_BASE}/generations/${generationId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch generation (${response.status})`);
  }
  return response.json();
}

/**
 * Check backend connection status
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
