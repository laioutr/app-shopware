/** Which of the app's Orchestr directories the module registers, relative to `src/runtime`. */
export const orchestrDirsFor = (options: { newsletter?: { enabled?: boolean } }): string[] => [
  'server/orchestr',
  ...(options.newsletter?.enabled === false ? [] : ['server/orchestr-newsletter']),
];
