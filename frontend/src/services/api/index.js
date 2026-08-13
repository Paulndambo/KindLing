export { API_BASE_URL, getAccessToken, getStoredTokens, setStoredTokens } from "./config";
export { apiRequest, ApiError } from "./client";
export {
  loginWithPassword,
  loginWithDemo,
  registerAccount,
  fetchCurrentUser,
  exportUserData,
  deleteAccount,
  logoutLocal,
} from "./auth";
export {
  getStudentProfile,
  saveStudentProfile,
  patchStudentProfile,
  getPrimaryStudent,
  savePrimaryStudent,
  patchPrimaryStudent,
} from "./students";
export {
  listSubjects,
  createSubject,
  deleteSubject,
  createTopic,
  deleteTopic,
  normalizeSubject,
} from "./subjects";
export {
  getDashboard,
  getLearningProfile,
  getSkillCatalog,
  getSkillPath,
  getWorkedExamples,
  getMisconceptionCatalog,
  detectMisconceptionsApi,
  getMultiStepProblems,
  listDigests,
  generateDigest,
  getDigest,
} from "./learning";
export {
  fetchConversationShelf,
  putConversationShelf,
  ensureConversation,
  fetchConversation,
  putConversation,
  appendConversationMessage,
  archiveConversationRemote,
  fetchContinueList,
  searchTranscripts,
  putResumeSnapshot,
} from "./conversations";
export {
  fetchPlanCatalog,
  fetchSubscription,
  selectSubscriptionPlan,
  patchSubscription,
  fetchAiRouting,
  patchAiRouting,
} from "./platform";

// Re-export telemetry helpers for app-wide use
export {
  reportError,
  trackMetric,
  markSessionStarted,
  markSessionFirstMessage,
  markSessionDropOff,
} from "../telemetry";
