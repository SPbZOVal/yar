/** Shared dark-theme palette + node colors. Kept tiny; screens import what they need. */
export const colors = {
  bg: '#11131a',
  surface: '#1f2230',
  surfaceAlt: '#374151',
  primary: '#6d28d9',
  text: '#f4f4f5',
  textDim: '#9ca3af',
  hp: '#dc2626',
  block: '#3b82f6',
  energy: '#eab308',
  success: '#16a34a',
  danger: '#b91c1c',
  border: '#6d28d9',
} as const;

/** Level-graph node fill by `NodeType` (string-keyed for the Skia map). */
export const nodeColor: Readonly<Record<string, string>> = {
  Start: '#16a34a',
  Combat: '#dc2626',
  Boss: '#7c3aed',
  Loot: '#eab308',
  Question: '#3b82f6',
  End: '#7c3aed',
  Idle: '#6b7280',
};
