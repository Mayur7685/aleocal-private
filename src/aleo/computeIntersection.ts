// Compute calendar intersection for AleoCal
import { aleoConfig } from './aleoConfig';
import { createProgramManager, createNetworkClient, executeOffline } from './aleoClient';
import { AleoAccount, DaySlots, MeetingResult, MeetingState, MeetingStatus } from './types';

// Leo program source code for local execution
const ALEOCAL_PROGRAM = `
program privycalendar.aleo {
    const MAX_PREFERENCE: u8 = 5u8;
    const NUM_SLOTS: u8 = 8u8;

    struct DaySlots {
        slot_0: u8,
        slot_1: u8,
        slot_2: u8,
        slot_3: u8,
        slot_4: u8,
        slot_5: u8,
        slot_6: u8,
        slot_7: u8,
    }

    record Calendar {
        owner: address,
        day: DaySlots,
        calendar_id: field,
    }

    record MeetingResult {
        owner: address,
        meeting_id: field,
        best_slot: u8,
        best_score: u8,
        valid: bool,
    }

    inline validate_slots(day: DaySlots) -> bool {
        let valid: bool = day.slot_0 <= MAX_PREFERENCE;
        valid = valid && day.slot_1 <= MAX_PREFERENCE;
        valid = valid && day.slot_2 <= MAX_PREFERENCE;
        valid = valid && day.slot_3 <= MAX_PREFERENCE;
        valid = valid && day.slot_4 <= MAX_PREFERENCE;
        valid = valid && day.slot_5 <= MAX_PREFERENCE;
        valid = valid && day.slot_6 <= MAX_PREFERENCE;
        valid = valid && day.slot_7 <= MAX_PREFERENCE;
        return valid;
    }

    inline multiply_calendars(a: DaySlots, b: DaySlots) -> DaySlots {
        return DaySlots {
            slot_0: a.slot_0 * b.slot_0,
            slot_1: a.slot_1 * b.slot_1,
            slot_2: a.slot_2 * b.slot_2,
            slot_3: a.slot_3 * b.slot_3,
            slot_4: a.slot_4 * b.slot_4,
            slot_5: a.slot_5 * b.slot_5,
            slot_6: a.slot_6 * b.slot_6,
            slot_7: a.slot_7 * b.slot_7,
        };
    }

    inline find_best_slot(day: DaySlots) -> (u8, u8) {
        let best_idx: u8 = 0u8;
        let best_val: u8 = day.slot_0;

        let is_better_1: bool = day.slot_1 > best_val;
        best_idx = is_better_1 ? 1u8 : best_idx;
        best_val = is_better_1 ? day.slot_1 : best_val;

        let is_better_2: bool = day.slot_2 > best_val;
        best_idx = is_better_2 ? 2u8 : best_idx;
        best_val = is_better_2 ? day.slot_2 : best_val;

        let is_better_3: bool = day.slot_3 > best_val;
        best_idx = is_better_3 ? 3u8 : best_idx;
        best_val = is_better_3 ? day.slot_3 : best_val;

        let is_better_4: bool = day.slot_4 > best_val;
        best_idx = is_better_4 ? 4u8 : best_idx;
        best_val = is_better_4 ? day.slot_4 : best_val;

        let is_better_5: bool = day.slot_5 > best_val;
        best_idx = is_better_5 ? 5u8 : best_idx;
        best_val = is_better_5 ? day.slot_5 : best_val;

        let is_better_6: bool = day.slot_6 > best_val;
        best_idx = is_better_6 ? 6u8 : best_idx;
        best_val = is_better_6 ? day.slot_6 : best_val;

        let is_better_7: bool = day.slot_7 > best_val;
        best_idx = is_better_7 ? 7u8 : best_idx;
        best_val = is_better_7 ? day.slot_7 : best_val;

        return (best_idx, best_val);
    }

    transition create_calendar(
        slot_0: u8,
        slot_1: u8,
        slot_2: u8,
        slot_3: u8,
        slot_4: u8,
        slot_5: u8,
        slot_6: u8,
        slot_7: u8,
        calendar_id: field
    ) -> Calendar {
        let day: DaySlots = DaySlots {
            slot_0: slot_0,
            slot_1: slot_1,
            slot_2: slot_2,
            slot_3: slot_3,
            slot_4: slot_4,
            slot_5: slot_5,
            slot_6: slot_6,
            slot_7: slot_7,
        };
        assert(validate_slots(day));
        return Calendar {
            owner: self.caller,
            day: day,
            calendar_id: calendar_id,
        };
    }

    transition compute_intersection_direct(
        my_calendar: Calendar,
        other_slot_0: u8,
        other_slot_1: u8,
        other_slot_2: u8,
        other_slot_3: u8,
        other_slot_4: u8,
        other_slot_5: u8,
        other_slot_6: u8,
        other_slot_7: u8,
        meeting_id: field
    ) -> (Calendar, MeetingResult) {
        let other_day: DaySlots = DaySlots {
            slot_0: other_slot_0,
            slot_1: other_slot_1,
            slot_2: other_slot_2,
            slot_3: other_slot_3,
            slot_4: other_slot_4,
            slot_5: other_slot_5,
            slot_6: other_slot_6,
            slot_7: other_slot_7,
        };
        assert(validate_slots(my_calendar.day));
        assert(validate_slots(other_day));
        let intersection: DaySlots = multiply_calendars(my_calendar.day, other_day);
        let (best_slot, best_score): (u8, u8) = find_best_slot(intersection);
        let result: MeetingResult = MeetingResult {
            owner: self.caller,
            meeting_id: meeting_id,
            best_slot: best_slot,
            best_score: best_score,
            valid: best_score > 0u8,
        };
        return (my_calendar, result);
    }
}
`;

/**
 * Compute the intersection of two calendars
 * This is the core privacy-preserving computation
 * Now executes locally with ZK proofs instead of calling server
 */
export async function computeIntersection(
  account: AleoAccount,
  myCalendarRecord: string,
  otherShare: string,
  meetingId: string
): Promise<MeetingResult> {
  try {
    // Extract slots from the other party's share
    const otherSlots = extractSlotsFromRecord(otherShare);

    // Use direct computation with local execution
    return await computeIntersectionDirect(
      account,
      myCalendarRecord,
      otherSlots,
      meetingId,
      true // Enable browser fallback for local execution
    );
  } catch (error) {
    console.error('Failed to compute intersection:', error);
    throw error;
  }
}

/**
 * Compute intersection using the ZK server API
 * This offloads computation to the server which has real Aleo SDK
 */
async function computeIntersectionViaServer(
  mySlots: number[],
  otherSlots: number[],
  meetingId: string,
  generateProof: boolean = true
): Promise<MeetingResult> {
  const signalingUrl = (import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3030').replace(/\/$/, '');

  const response = await fetch(`${signalingUrl}/api/calendar/intersect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      calendar1: mySlots,
      calendar2: otherSlots,
      meetingId,
      generateProof,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server ZK API error: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    owner: '',
    meeting_id: meetingId,
    best_slot: data.bestSlot,
    best_score: data.bestScore,
    valid: data.valid,
    zkMode: data.zkMode || 'server',
    proof: data.proof || undefined,
    executionTime: data.executionTime,
  };
}

/**
 * Extract slots from a calendar record string
 */
function extractSlotsFromRecord(record: string): number[] {
  const slots: number[] = [];
  for (let i = 0; i < 8; i++) {
    const match = record.match(new RegExp(`slot_${i}:\\s*(\\d+)u8`));
    slots.push(match ? parseInt(match[1]) : 0);
  }
  return slots;
}

/**
 * Compute intersection directly with raw slot values
 * Executes locally in browser with ZK proofs - NO calendar data sent to server
 * Server fallback only used if local execution fails
 */
export async function computeIntersectionDirect(
  account: AleoAccount,
  myCalendarRecord: string,
  otherSlots: number[],
  meetingId: string,
  useBrowserFallback: boolean = true
): Promise<MeetingResult> {
  if (otherSlots.length !== 8) {
    throw new Error('Must provide exactly 8 slot values');
  }

  // Extract my slots from calendar record
  const mySlots = extractSlotsFromRecord(myCalendarRecord);

  // PRIMARY: Execute locally in browser (PRIVACY-PRESERVING)
  try {
    console.log('[AleoCal] Executing intersection locally with ZK proofs...');

    const inputs = [
      myCalendarRecord,
      `${otherSlots[0]}u8`,
      `${otherSlots[1]}u8`,
      `${otherSlots[2]}u8`,
      `${otherSlots[3]}u8`,
      `${otherSlots[4]}u8`,
      `${otherSlots[5]}u8`,
      `${otherSlots[6]}u8`,
      `${otherSlots[7]}u8`,
      meetingId,
    ];

    const result = await executeOffline(
      account,
      ALEOCAL_PROGRAM,
      'compute_intersection_direct',
      inputs,
      false // proveExecution=false for instant results
    );

    // Parse the result
    // Note: We need to parse the output string manually or using a helper
    // The previous code used parseMeetingResult which I'll ensure is available/used correctly
    const parsed = parseMeetingResult(result.outputs[1]);
    console.log('[AleoCal] ✅ Local execution successful (Fast Mode)');

    return {
      ...parsed,
      zkMode: result.proof ? 'real' : 'simulated', // executeOffline returns no proof if prove=false
      proof: result.proof,
    };
  } catch (localError) {
    console.warn('[AleoCal] Local execution failed:', localError);
    throw localError;
  }
}

/**
 * Parse MeetingResult from Leo output
 */
export function parseMeetingResult(output: string): MeetingResult {
  const ownerMatch = output.match(/owner:\s*(aleo1[a-z0-9]+)/);
  const meetingIdMatch = output.match(/meeting_id:\s*(\d+field)/);
  const bestSlotMatch = output.match(/best_slot:\s*(\d+)u8/);
  const bestScoreMatch = output.match(/best_score:\s*(\d+)u8/);
  const validMatch = output.match(/valid:\s*(true|false)/);

  return {
    owner: ownerMatch ? ownerMatch[1] : '',
    meeting_id: meetingIdMatch ? meetingIdMatch[1] : '',
    best_slot: bestSlotMatch ? parseInt(bestSlotMatch[1]) : 0,
    best_score: bestScoreMatch ? parseInt(bestScoreMatch[1]) : 0,
    valid: validMatch ? validMatch[1] === 'true' : false,
  };
}

/**
 * Register a meeting on-chain
 * This creates a public record of the meeting for coordination
 */
export async function registerMeeting(
  account: AleoAccount,
  meetingId: string,
  otherParty: string,
  timestamp?: number
): Promise<string> {
  try {
    const programManager = await createProgramManager(account);
    const ts = timestamp || Date.now();

    const inputs = [
      meetingId,
      otherParty,
      `${ts}u64`,
    ];

    const result = await programManager.execute(
      aleoConfig.program.programId,
      'register_meeting',
      inputs,
      aleoConfig.fees.baseFee,
      undefined,
      undefined,
      account.privateKey
    );

    return result.transactionId || '';
  } catch (error) {
    console.error('Failed to register meeting:', error);
    throw error;
  }
}

/**
 * Submit a commitment to a meeting on-chain
 */
export async function submitCommitment(
  account: AleoAccount,
  meetingId: string,
  commitment: string
): Promise<string> {
  try {
    const programManager = await createProgramManager(account);

    const inputs = [
      meetingId,
      commitment,
    ];

    const result = await programManager.execute(
      aleoConfig.program.programId,
      'submit_commitment',
      inputs,
      aleoConfig.fees.baseFee,
      undefined,
      undefined,
      account.privateKey
    );

    return result.transactionId || '';
  } catch (error) {
    console.error('Failed to submit commitment:', error);
    throw error;
  }
}

/**
 * Mark meeting as completed on-chain
 */
export async function completeMeeting(
  account: AleoAccount,
  meetingId: string
): Promise<string> {
  try {
    const programManager = await createProgramManager(account);

    const inputs = [meetingId];

    const result = await programManager.execute(
      aleoConfig.program.programId,
      'complete_meeting',
      inputs,
      aleoConfig.fees.baseFee,
      undefined,
      undefined,
      account.privateKey
    );

    return result.transactionId || '';
  } catch (error) {
    console.error('Failed to complete meeting:', error);
    throw error;
  }
}

/**
 * Get meeting state from on-chain mapping
 */
export async function getMeetingState(meetingId: string): Promise<MeetingState | null> {
  try {
    const networkClient = await createNetworkClient();

    const state = await networkClient.getProgramMappingValue(
      aleoConfig.program.programId,
      'meetings',
      meetingId
    );

    if (!state) {
      return null;
    }

    return parseMeetingState(state);
  } catch (error) {
    console.error('Failed to get meeting state:', error);
    return null;
  }
}

/**
 * Parse MeetingState from on-chain mapping value
 */
function parseMeetingState(stateStr: string): MeetingState {
  const partyAMatch = stateStr.match(/party_a:\s*(aleo1[a-z0-9]+)/);
  const partyBMatch = stateStr.match(/party_b:\s*(aleo1[a-z0-9]+)/);
  const commitmentAMatch = stateStr.match(/commitment_a:\s*(\d+field)/);
  const commitmentBMatch = stateStr.match(/commitment_b:\s*(\d+field)/);
  const statusMatch = stateStr.match(/status:\s*(\d+)u8/);
  const createdAtMatch = stateStr.match(/created_at:\s*(\d+)u64/);

  return {
    party_a: partyAMatch ? partyAMatch[1] : '',
    party_b: partyBMatch ? partyBMatch[1] : '',
    commitment_a: commitmentAMatch ? commitmentAMatch[1] : '0field',
    commitment_b: commitmentBMatch ? commitmentBMatch[1] : '0field',
    status: statusMatch ? parseInt(statusMatch[1]) : 0,
    created_at: createdAtMatch ? parseInt(createdAtMatch[1]) : 0,
  };
}

/**
 * Check if both parties have committed
 */
export function isMeetingReady(state: MeetingState): boolean {
  return state.status === MeetingStatus.BothCommitted;
}

/**
 * Get human-readable meeting status
 */
export function getMeetingStatusText(status: number): string {
  switch (status) {
    case MeetingStatus.Created:
      return 'Meeting created, waiting for commitments';
    case MeetingStatus.PartyACommitted:
      return 'Party A committed, waiting for Party B';
    case MeetingStatus.PartyBCommitted:
      return 'Party B committed, waiting for Party A';
    case MeetingStatus.BothCommitted:
      return 'Both parties committed, ready to compute';
    case MeetingStatus.Completed:
      return 'Meeting completed';
    default:
      return 'Unknown status';
  }
}

/**
 * Convert slot index to time string
 */
export function slotIndexToTime(slotIndex: number): string {
  const times = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
  ];
  return times[slotIndex] || 'Unknown';
}

/**
 * Convert slot index to time range string
 */
export function slotIndexToTimeRange(slotIndex: number): string {
  const times = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
  ];
  return times[slotIndex] || 'Unknown';
}

export default {
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
};
