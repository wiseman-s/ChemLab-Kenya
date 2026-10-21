// frontend/src/utils/guestLimitsLabels.ts
export const LIMITED_FEATURE_LABELS: Record<
  'analyze' | 'compound' | 'chat' | 'nmr' | 'balance',
  { singular: string; plural: string }
> = {
  analyze: { singular: 'Molecule Analyzer', plural: 'analyses' },
  compound: { singular: 'Compound Explorer', plural: 'compound searches' },
  chat: { singular: 'Chat Assistant', plural: 'chat messages' },
  nmr: { singular: 'NMR Predictor', plural: 'NMR predictions' },
  balance: { singular: 'Equation Balancer', plural: 'balanced equations' },
};
