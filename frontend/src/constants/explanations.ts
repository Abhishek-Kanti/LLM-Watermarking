export interface ExplanationItem {
  title: string;
  symbol?: string;
  summary: string;
  mathFormula?: string;
}

export const EXPLANATIONS: Record<string, ExplanationItem> = {
  // Generation & Watermark Parameters
  watermark: {
    title: 'Watermark Engine',
    symbol: 'W',
    summary: 'Enables or disables statistical watermarking during autoregressive text generation.',
  },
  secretKey: {
    title: 'Secret Key',
    symbol: 'k',
    summary: 'A private key used to decide which tokens belong to the green list. The same key is required to detect the watermark.',
  },
  contextLength: {
    title: 'Context Length',
    symbol: 'h',
    summary: 'How many previous tokens are used to decide the green/red token split. Higher values make the split depend on more surrounding text.',
  },
  greenFraction: {
    title: 'Green Fraction',
    symbol: 'γ',
    summary: 'The approximate fraction of the vocabulary marked as green for each token. 0.5 means roughly half of the tokens are green.',
  },
  gamma: {
    title: 'Gamma / Logit Bonus',
    symbol: 'δ',
    summary: 'How strongly the generator prefers green tokens. Higher values create a stronger watermark, but may affect the generated text more.',
  },
  temperature: {
    title: 'Temperature',
    symbol: 'T',
    summary: 'Controls randomness when choosing the next token. Lower values make generation more predictable; higher values make it more random.',
  },
  topP: {
    title: 'Top-P (Nucleus)',
    symbol: 'p',
    summary: 'Limits token selection to the most likely tokens whose combined probability reaches this value. Lower values restrict the choices more.',
  },
  maxTokens: {
    title: 'Max Tokens',
    symbol: 'N',
    summary: 'The maximum number of new tokens the model can generate.',
  },

  // Detection Metrics
  greenRatio: {
    title: 'Green Ratio',
    symbol: '|G| / T',
    summary: 'Percentage of analyzed tokens that belong to the green list.',
  },
  expectedRatio: {
    title: 'Expected Ratio',
    symbol: 'γ',
    summary: 'The green-token percentage we would expect, on average, if there were no watermark.',
  },
  zScore: {
    title: 'Z-Score',
    symbol: 'z',
    summary: 'Measures how far the observed green-token count is from the no-watermark expectation. A higher positive value provides stronger statistical evidence of a watermark.',
    mathFormula: 'z = (|G| - γT) / √(Tγ(1 - γ))',
  },
  pValue: {
    title: 'P-Value',
    symbol: 'p',
    summary: 'Indicates how unusual the observed result would be if the text were unwatermarked. Smaller values indicate stronger statistical evidence.',
    mathFormula: 'p = 0.5 · erfc(z / √2)',
  },
  detectionThreshold: {
    title: 'Detection Threshold',
    symbol: 'z_th',
    summary: 'The Z-score required by this playground to classify the text as watermarked.',
  },
};
