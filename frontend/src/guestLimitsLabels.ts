// frontend/src/utils/guestLimitsLabels.ts
export const LIMITED_FEATURE_LABELS: Record<
  'analyze' | 'compound' | 'chat',
  { singular: string; plural: string }
> = {
  analyze: { singular: 'Molecule Analyzer', plural: 'analyses' },
  compound: { singular: 'Compound Explorer', plural: 'compound searches' },
  chat: { singular: 'Chat Assistant', plural: 'chat messages' },
};
