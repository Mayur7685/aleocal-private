// Wallet service for AleoCal - uses @provablehq/aleo-types TransactionOptions
// Provides factory functions for building transaction options.
// Actual execution is done via the `executeTransaction` method from the
// `useWallet()` hook in @provablehq/aleo-wallet-adaptor-react.
import { TransactionOptions } from '@provablehq/aleo-types';
import { aleoConfig } from './aleoConfig';

// calmatchtwo.aleo — newly deployed program for on-chain ZK intersection
// Transition: find_common_time(public meeting_id, host: Slots, guest: Slots) -> Future
// Stores result in public mappings: meeting_results, meeting_scores, meeting_valid
export const CALMATCHTWO_PROGRAM_ID = 'calmatchtwo.aleo';
export const CALMATCHTWO_TX_ID = 'at12f08pp6reqlxf05zpyhsdrzv7wwycq4gk6hjy4r9rxlvq0c9gu8s47rjdc';
const ALEO_API = 'https://api.explorer.provable.com/v2/testnet';

/**
 * Build TransactionOptions for calmatchtwo.aleo::find_common_time.
 *
 * The Slots struct input format for the wallet adapter is:
 *   "{ s0: 2u8, s1: 0u8, s2: 3u8, s3: 1u8, s4: 0u8, s5: 4u8, s6: 2u8, s7: 1u8 }"
 *
 * meeting_id must be a valid Aleo field literal, e.g. "123456789field"
 */
export function buildFindCommonTimeOptions(
    meetingId: string,
    hostSlots: number[],
    guestSlots: number[]
): TransactionOptions {
    if (hostSlots.length !== 8 || guestSlots.length !== 8) {
        throw new Error('Must provide exactly 8 slot values for each party');
    }

    const formatSlots = (slots: number[]) =>
        `{ s0: ${slots[0]}u8, s1: ${slots[1]}u8, s2: ${slots[2]}u8, s3: ${slots[3]}u8, s4: ${slots[4]}u8, s5: ${slots[5]}u8, s6: ${slots[6]}u8, s7: ${slots[7]}u8 }`;

    return {
        program: CALMATCHTWO_PROGRAM_ID,
        function: 'find_common_time',
        inputs: [meetingId, formatSlots(hostSlots), formatSlots(guestSlots)],
        fee: 2_000_000, // 2 credits — async transition with private struct inputs needs more gas
        privateFee: false,
    };
}

/**
 * Poll the Aleo network until calmatchtwo.aleo::meeting_results has a value
 * for the given meeting_id. Returns { best_slot, best_score, valid } when ready.
 *
 * meetingIdField = the field literal WITH "field" suffix,
 *   e.g. "12345678901234567890field"
 *
 * Polls every 5 seconds, times out after maxWaitMs.
 */
export async function pollMeetingResult(
    meetingIdField: string,
    maxWaitMs = 180_000
): Promise<{ best_slot: number; best_score: number; valid: boolean }> {
    const deadline = Date.now() + maxWaitMs;

    let attempt = 0;
    while (Date.now() < deadline) {
        attempt++;
        try {
            const [slotRes, scoreRes, validRes] = await Promise.all([
                fetch(`${ALEO_API}/program/${CALMATCHTWO_PROGRAM_ID}/mapping/meeting_results/${meetingIdField}`),
                fetch(`${ALEO_API}/program/${CALMATCHTWO_PROGRAM_ID}/mapping/meeting_scores/${meetingIdField}`),
                fetch(`${ALEO_API}/program/${CALMATCHTWO_PROGRAM_ID}/mapping/meeting_valid/${meetingIdField}`),
            ]);

            const slotText  = await slotRes.text();
            const scoreText = await scoreRes.text();
            const validText = await validRes.text();
            console.log(`[poll #${attempt}] slot=${slotText} score=${scoreText} valid=${validText}`);

            if (slotRes.ok && scoreRes.ok && validRes.ok) {
                // API returns JSON-quoted strings: "0u8", "12u8", "true", "false"
                // Strip outer quotes, then use parseInt directly — it stops at the
                // first non-digit ('u'), so "0u8"→0, "12u8"→12, "null"→NaN.
                // Never use replace(/[^0-9]/g,'') — it concatenates ALL digits including
                // the suffix: "0u8"→"08"→8 wrong, "12u8"→"128"→128 wrong.
                const unquote = (s: string) => s.trim().replace(/^"|"$/g, '');
                const best_slot  = parseInt(unquote(slotText));
                const best_score = parseInt(unquote(scoreText));
                const valid      = unquote(validText) === 'true';
                console.log(`[poll #${attempt}] parsed → slot=${best_slot} score=${best_score} valid=${valid}`);

                if (!isNaN(best_slot)) {
                    return { best_slot, best_score, valid };
                }
            }
        } catch (e) {
            console.warn(`[poll #${attempt}] fetch error:`, e);
        }

        await new Promise(r => setTimeout(r, 5000));
    }

    throw new Error('Timed out waiting for on-chain result');
}

/** Legacy helpers kept for backward compatibility */
export function buildCreateCalendarOptions(
    slots: number[],
    calendarId: string
): TransactionOptions {
    if (slots.length !== 8) throw new Error('Must provide exactly 8 slot values');
    return {
        program: aleoConfig.program.programId,
        function: 'create_calendar',
        inputs: [...slots.map(s => `${s}u8`), calendarId],
        fee: aleoConfig.fees.baseFee,
        privateFee: false,
    };
}

export function buildComputeIntersectionOptions(
    calendarRecord: string,
    otherSlots: number[],
    meetingId: string
): TransactionOptions {
    if (otherSlots.length !== 8) throw new Error('Must provide exactly 8 slot values');
    return {
        program: aleoConfig.program.programId,
        function: 'compute_intersection_direct',
        inputs: [calendarRecord, ...otherSlots.map(s => `${s}u8`), meetingId],
        fee: aleoConfig.fees.baseFee,
        privateFee: false,
    };
}

export default {
    buildFindCommonTimeOptions,
    pollMeetingResult,
    buildCreateCalendarOptions,
    buildComputeIntersectionOptions,
};
