// Optional 3D models (GLB) shown on the AR card of a monument. Decision of the owner: no 3D buildings; the monument pages
// keep the real photo and have a talking guide next to the story instead (see components/ar/MonumentGuide.tsx).
export const MONUMENT_MODELS: Record<string, string> = {};

export const hasMonumentModel = (slug: string) => slug in MONUMENT_MODELS;
