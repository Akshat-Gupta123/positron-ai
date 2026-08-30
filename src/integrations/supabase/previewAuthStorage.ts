// No longer uses Lovable Cloud session brokering.
// Previously: brokered session between Lovable editor and preview iframes.
// Now: plain localStorage in all environments.
export function brokeredPreviewStorage(): globalThis.Storage | undefined {
  return typeof window !== 'undefined' ? window.localStorage : undefined;
}
