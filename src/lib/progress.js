// Backwards-compatible entry point. The implementation lives in ./progress/modules.js
// (adapter-based persistence); `@/lib/progress` resolves to this file, so existing imports
// keep working unchanged.
export {
  getAllProgress,
  getProgress,
  saveFlashcardProgress,
  saveQuizScore,
  getOverallProgress,
} from './progress/modules.js';
