// Aleo AleoCal SDK - Main Export
// Privacy-preserving calendar matching on Aleo blockchain

// Configuration
export { aleoConfig, validateConfig, getNetworkUrl, isUsingMockSDK } from './aleoConfig';

// Client and account management
export {
  initAleoSDK,
  initializeAleoSDK,
  generateAccount,
  importAccount,
  getOrCreateAccount,
  createProgramManager,
  createNetworkClient,
  isValidAleoAddress,
  generateRandomField,
  getProgramId,
  getBaseFee,
  getSDKStatus,
  isSDKReady,
  executeOffline,
  executeOnChain,
  waitForTransaction,
  getMappingValue,
  isProgramDeployed,
  deployProgram,
  getAccountBalance,
  requestFaucetCredits,
} from './aleoClient';
export type { SDKStatus } from './aleoClient';

// React hooks
export { useAleoSDK, useAleoSDKStatus } from './useAleoSDK';

// Worker client
export { getAleoWorker, isWorkerReady, getWorkerError, terminateWorker } from './aleoWorkerClient';

// Calendar operations
export {
  arrayToDaySlots,
  daySlotsToArray,
  createCalendar,
  createCalendarCommitment,
  shareCalendar,
  parseCalendarRecord,
  serializeDaySlots,
  deserializeDaySlots,
} from './createCalendar';

// Intersection computation
export {
  computeIntersection,
  computeIntersectionDirect,
  parseMeetingResult,
  registerMeeting,
  submitCommitment,
  completeMeeting,
  getMeetingState,
  isMeetingReady,
  getMeetingStatusText,
  slotIndexToTime,
  slotIndexToTimeRange,
} from './computeIntersection';

// Types
export type {
  DaySlots,
  CalendarRecord,
  MeetingResult,
  CalendarShare,
  MeetingState,
  AleoAccount,
  ExecutionResult,
} from './types';

export { TIME_SLOTS, MeetingStatus } from './types';
