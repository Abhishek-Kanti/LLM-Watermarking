export interface GenerateRequest {
  prompt: string;
  watermark: boolean;
  secret_key: string;
  context_length: number;
  gamma: number;
  green_fraction: number;
  temperature: number;
  top_p: number;
  max_tokens: number;
  stream_format?: 'sse' | 'text';
  enable_thinking?: boolean;
}

export interface DetectRequest {
  prompt: string;
  text?: string | null;
  token_ids?: number[] | null;
  generation_id?: string | null;
  secret_key: string;
  context_length: number;
  green_fraction: number;
  enable_thinking?: boolean;
}

export interface TokenClassification {
  token_id: number;
  token: string;
  color: 'green' | 'red';
}

export interface DetectResult {
  tokens: TokenClassification[];
  total_tokens: number;
  green_tokens: number;
  red_tokens: number;
  green_ratio: number;
  expected_ratio: number;
  z_score: number;
  p_value: number;
  detection_threshold: number;
  detected: boolean;
  token_exact: boolean;
  generation_id?: string;
}

export interface GenerationMetadata {
  token_ids: number[];
  prompt: string;
  text: string;
  secret_key: string;
  context_length: number;
  green_fraction: number;
  enable_thinking?: boolean;
}

export interface ParameterPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  prompt: string;
  watermark: boolean;
  secret_key: string;
  context_length: number;
  gamma: number;
  green_fraction: number;
  temperature: number;
  top_p: number;
  max_tokens: number;
}
