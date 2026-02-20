// Calendar creation and management for AleoCal
import { aleoConfig } from './aleoConfig';
import { createProgramManager, generateRandomField, initAleoSDK, executeOffline } from './aleoClient';
import { AleoAccount, DaySlots, CalendarRecord } from './types';

// Leo program source code for local execution
// This allows ZK proof generation without deploying to testnet
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
 * Convert an array of slot values to DaySlots object
 */
export function arrayToDaySlots(slots: number[]): DaySlots {
  if (slots.length !== 8) {
    throw new Error('Must provide exactly 8 slot values');
  }

  // Validate all values are 0-5
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] < 0 || slots[i] > 5) {
      throw new Error(`Slot ${i} value must be between 0 and 5, got ${slots[i]}`);
    }
  }

  return {
    slot_0: slots[0],
    slot_1: slots[1],
    slot_2: slots[2],
    slot_3: slots[3],
    slot_4: slots[4],
    slot_5: slots[5],
    slot_6: slots[6],
    slot_7: slots[7],
  };
}

/**
 * Convert DaySlots object to array
 */
export function daySlotsToArray(day: DaySlots): number[] {
  return [
    day.slot_0,
    day.slot_1,
    day.slot_2,
    day.slot_3,
    day.slot_4,
    day.slot_5,
    day.slot_6,
    day.slot_7,
  ];
}

/**
 * Format slot values for Leo program input
 */
function formatSlotInput(value: number): string {
  return `${value}u8`;
}

/**
 * Create a calendar record locally (off-chain)
 * This executes the Leo program locally and returns the encrypted record
 */
export async function createCalendar(
  account: AleoAccount,
  slots: number[],
  calendarId?: string
): Promise<{ record: string; calendarId: string }> {
  try {
    // Generate calendar ID if not provided
    const finalCalendarId = calendarId || await generateRandomField();

    // Build inputs for the Leo program
    const inputs = [
      formatSlotInput(slots[0]),
      formatSlotInput(slots[1]),
      formatSlotInput(slots[2]),
      formatSlotInput(slots[3]),
      formatSlotInput(slots[4]),
      formatSlotInput(slots[5]),
      formatSlotInput(slots[6]),
      formatSlotInput(slots[7]),
      finalCalendarId,
    ];

    // Execute the transition locally (generates ZK proof)
    console.log('[AleoCal] Generating local execution (No Proof) for speed...');
    const result = await executeOffline(
      account,
      ALEOCAL_PROGRAM,
      'create_calendar',
      inputs,
      false // proveExecution=false for instant results
    );

    return {
      record: result.outputs[0],
      calendarId: finalCalendarId,
    };
  } catch (error) {
    console.error('Failed to create calendar:', error);
    throw error;
  }
}

/**
 * Create a calendar commitment (hash) for the commit-reveal protocol
 */
export async function createCalendarCommitment(
  account: AleoAccount,
  calendarRecord: string,
  salt: string,
  meetingId: string,
  otherParty: string
): Promise<{ commitment: string; request: string }> {
  try {
    const programManager = await createProgramManager(account);

    const inputs = [
      calendarRecord,
      salt,
      meetingId,
      otherParty,
    ];

    const result = await programManager.run(
      aleoConfig.program.programId,
      'commit_calendar',
      inputs,
      true,
      undefined,
      undefined,
      account.privateKey
    );

    return {
      commitment: extractFieldFromOutput(result.outputs[1], 'commitment'),
      request: result.outputs[1],
    };
  } catch (error) {
    console.error('Failed to create commitment:', error);
    throw error;
  }
}

/**
 * Share calendar with another party (creates encrypted CalendarShare)
 */
export async function shareCalendar(
  account: AleoAccount,
  calendarRecord: string,
  salt: string,
  meetingId: string,
  recipient: string
): Promise<{ share: string; commitment: string }> {
  try {
    const programManager = await createProgramManager(account);

    const inputs = [
      calendarRecord,
      salt,
      meetingId,
      recipient,
    ];

    const result = await programManager.run(
      aleoConfig.program.programId,
      'share_calendar',
      inputs,
      true,
      undefined,
      undefined,
      account.privateKey
    );

    return {
      share: result.outputs[1],
      commitment: extractFieldFromOutput(result.outputs[1], 'commitment'),
    };
  } catch (error) {
    console.error('Failed to share calendar:', error);
    throw error;
  }
}

/**
 * Helper to extract a field value from a Leo record output
 */
function extractFieldFromOutput(output: string, fieldName: string): string {
  // Parse the record output string to extract the field
  const regex = new RegExp(`${fieldName}:\\s*([\\w.]+)`);
  const match = output.match(regex);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * Parse a Calendar record from Leo output
 */
export function parseCalendarRecord(recordOutput: string): CalendarRecord | null {
  try {
    // Extract owner
    const ownerMatch = recordOutput.match(/owner:\s*(aleo1[a-z0-9]+)/);
    const owner = ownerMatch ? ownerMatch[1] : '';

    // Extract calendar_id
    const calendarIdMatch = recordOutput.match(/calendar_id:\s*(\d+field)/);
    const calendar_id = calendarIdMatch ? calendarIdMatch[1] : '';

    // Extract day slots
    const slots: number[] = [];
    for (let i = 0; i < 8; i++) {
      const slotMatch = recordOutput.match(new RegExp(`slot_${i}:\\s*(\\d+)u8`));
      slots.push(slotMatch ? parseInt(slotMatch[1]) : 0);
    }

    return {
      owner,
      day: arrayToDaySlots(slots),
      calendar_id,
    };
  } catch (error) {
    console.error('Failed to parse calendar record:', error);
    return null;
  }
}

/**
 * Serialize DaySlots for off-chain transmission
 */
export function serializeDaySlots(day: DaySlots): string {
  return JSON.stringify(daySlotsToArray(day));
}

/**
 * Deserialize DaySlots from off-chain transmission
 */
export function deserializeDaySlots(serialized: string): DaySlots {
  const slots = JSON.parse(serialized);
  return arrayToDaySlots(slots);
}

export default {
  arrayToDaySlots,
  daySlotsToArray,
  createCalendar,
  createCalendarCommitment,
  shareCalendar,
  parseCalendarRecord,
  serializeDaySlots,
  deserializeDaySlots,
};
