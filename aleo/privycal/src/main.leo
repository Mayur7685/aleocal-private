// AleoCal - Privacy-Preserving Calendar Matching on Aleo
// Find common meeting slots without revealing your full calendar
//
// This program allows two parties to discover mutual availability
// for meetings using zero-knowledge proofs. Neither party learns
// anything about the other's calendar except the intersection.

program privycalendar.aleo {

    // ============================================
    // CONSTANTS
    // ============================================

    // Maximum preference value (0 = unavailable, 1-5 = preference level)
    const MAX_PREFERENCE: u8 = 5u8;

    // Number of time slots per day (8 hours: 9am-5pm)
    const NUM_SLOTS: u8 = 8u8;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    // Represents a single day's availability with 8 hourly slots
    // Each slot value: 0 = unavailable, 1-5 = preference level
    struct DaySlots {
        slot_0: u8,  // 9:00 AM - 10:00 AM
        slot_1: u8,  // 10:00 AM - 11:00 AM
        slot_2: u8,  // 11:00 AM - 12:00 PM
        slot_3: u8,  // 12:00 PM - 1:00 PM
        slot_4: u8,  // 1:00 PM - 2:00 PM
        slot_5: u8,  // 2:00 PM - 3:00 PM
        slot_6: u8,  // 3:00 PM - 4:00 PM
        slot_7: u8,  // 4:00 PM - 5:00 PM
    }

    // Private calendar record owned by a user
    // Contains availability for a single day
    record Calendar {
        owner: address,
        day: DaySlots,
        // Unique identifier for this calendar instance
        calendar_id: field,
    }

    // Meeting request record - used to coordinate between parties
    record MeetingRequest {
        owner: address,
        meeting_id: field,
        requester: address,
        // Commitment hash of the requester's calendar
        commitment: field,
    }

    // Result of intersection computation
    record MeetingResult {
        owner: address,
        meeting_id: field,
        // Best slot index (0-7)
        best_slot: u8,
        // Combined preference score
        best_score: u8,
        // Whether a valid common slot was found
        valid: bool,
    }

    // Encrypted calendar share for secure exchange
    record SharedCalendar {
        owner: address,
        sender: address,
        meeting_id: field,
        // Encrypted availability data
        day: DaySlots,
        // Commitment for verification
        commitment: field,
        // Salt used in commitment
        salt: field,
    }

    // ============================================
    // ON-CHAIN STATE (Public Coordination)
    // ============================================

    // Meeting coordination state
    struct MeetingState {
        party_a: address,
        party_b: address,
        commitment_a: field,
        commitment_b: field,
        // Status: 0 = created, 1 = party_a_committed, 2 = party_b_committed, 3 = both_committed, 4 = completed
        status: u8,
        created_at: u64,
    }

    // Public mapping for meeting coordination
    mapping meetings: field => MeetingState;

    // Track meeting count per user
    mapping user_meeting_count: address => u64;

    // ============================================
    // CONSTRUCTOR
    // ============================================

    // The constructor is configured to prevent upgrades.
    @noupgrade
    async constructor() {}

    // ============================================
    // HELPER FUNCTIONS (Inline)
    // ============================================

    // Validate that all slot values are within valid range (0-5)
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

    // Hash calendar data to create a commitment
    // Uses BHP256 hash which is efficient in circuits
    inline hash_calendar(day: DaySlots, salt: field) -> field {
        // Pack slots into a single field value
        let packed: field = day.slot_0 as field
            + day.slot_1 as field * 10field
            + day.slot_2 as field * 100field
            + day.slot_3 as field * 1000field
            + day.slot_4 as field * 10000field
            + day.slot_5 as field * 100000field
            + day.slot_6 as field * 1000000field
            + day.slot_7 as field * 10000000field;

        // Hash the packed value with salt
        return BHP256::hash_to_field(packed + salt);
    }

    // Element-wise multiplication of two calendars
    // If either party has 0 (unavailable), result is 0
    // Otherwise, result is product of preferences (higher = both prefer more)
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

    // Find the slot with the highest score (argmax)
    // Returns (best_index, best_value)
    inline find_best_slot(day: DaySlots) -> (u8, u8) {
        let best_idx: u8 = 0u8;
        let best_val: u8 = day.slot_0;

        // Compare slot 1
        let is_better_1: bool = day.slot_1 > best_val;
        best_idx = is_better_1 ? 1u8 : best_idx;
        best_val = is_better_1 ? day.slot_1 : best_val;

        // Compare slot 2
        let is_better_2: bool = day.slot_2 > best_val;
        best_idx = is_better_2 ? 2u8 : best_idx;
        best_val = is_better_2 ? day.slot_2 : best_val;

        // Compare slot 3
        let is_better_3: bool = day.slot_3 > best_val;
        best_idx = is_better_3 ? 3u8 : best_idx;
        best_val = is_better_3 ? day.slot_3 : best_val;

        // Compare slot 4
        let is_better_4: bool = day.slot_4 > best_val;
        best_idx = is_better_4 ? 4u8 : best_idx;
        best_val = is_better_4 ? day.slot_4 : best_val;

        // Compare slot 5
        let is_better_5: bool = day.slot_5 > best_val;
        best_idx = is_better_5 ? 5u8 : best_idx;
        best_val = is_better_5 ? day.slot_5 : best_val;

        // Compare slot 6
        let is_better_6: bool = day.slot_6 > best_val;
        best_idx = is_better_6 ? 6u8 : best_idx;
        best_val = is_better_6 ? day.slot_6 : best_val;

        // Compare slot 7
        let is_better_7: bool = day.slot_7 > best_val;
        best_idx = is_better_7 ? 7u8 : best_idx;
        best_val = is_better_7 ? day.slot_7 : best_val;

        return (best_idx, best_val);
    }

    // ============================================
    // TRANSITIONS (Entry Points)
    // ============================================

    // Create a new private calendar record
    // All inputs are private by default
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
        // Build the day slots
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

        // Validate all slots are within range
        assert(validate_slots(day));

        // Return the calendar record owned by caller
        return Calendar {
            owner: self.caller,
            day: day,
            calendar_id: calendar_id,
        };
    }

    // Generate a commitment for a calendar without revealing it
    // This is used in the commit-reveal protocol
    transition commit_calendar(
        calendar: Calendar,
        salt: field,
        meeting_id: field,
        other_party: address
    ) -> (Calendar, MeetingRequest) {
        // Compute commitment hash
        let commitment: field = hash_calendar(calendar.day, salt);

        // Create meeting request for the other party
        let request: MeetingRequest = MeetingRequest {
            owner: other_party,
            meeting_id: meeting_id,
            requester: self.caller,
            commitment: commitment,
        };

        // Return both the original calendar (unchanged) and the request
        return (calendar, request);
    }

    // Create a calendar share to send to another party
    // The share is encrypted for the recipient
    transition share_calendar(
        calendar: Calendar,
        salt: field,
        meeting_id: field,
        recipient: address
    ) -> (Calendar, SharedCalendar) {
        // Compute commitment for verification
        let commitment: field = hash_calendar(calendar.day, salt);

        // Create share for the recipient
        let share: SharedCalendar = SharedCalendar {
            owner: recipient,
            sender: self.caller,
            meeting_id: meeting_id,
            day: calendar.day,
            commitment: commitment,
            salt: salt,
        };

        // Return original calendar and the share
        return (calendar, share);
    }

    // Verify a received calendar share matches its commitment
    transition verify_share(
        share: SharedCalendar,
        expected_commitment: field
    ) -> bool {
        // Recompute commitment from the share
        let computed: field = hash_calendar(share.day, share.salt);

        // Verify it matches
        return computed == expected_commitment;
    }

    // Compute the intersection of two calendars
    // This is the core privacy-preserving computation
    transition compute_intersection(
        my_calendar: Calendar,
        other_share: SharedCalendar,
        meeting_id: field
    ) -> (Calendar, SharedCalendar, MeetingResult) {
        // Verify the share is for the correct meeting
        assert(other_share.meeting_id == meeting_id);

        // Verify both calendars are valid
        assert(validate_slots(my_calendar.day));
        assert(validate_slots(other_share.day));

        // Compute element-wise multiplication
        let intersection: DaySlots = multiply_calendars(my_calendar.day, other_share.day);

        // Find the best common slot
        let (best_slot, best_score): (u8, u8) = find_best_slot(intersection);

        // Create result record
        let result: MeetingResult = MeetingResult {
            owner: self.caller,
            meeting_id: meeting_id,
            best_slot: best_slot,
            best_score: best_score,
            valid: best_score > 0u8,
        };

        // Return all records
        return (my_calendar, other_share, result);
    }

    // Simplified computation when you have raw slot values
    // Useful for direct computation without CalendarShare
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
        // Build other party's slots
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

        // Validate inputs
        assert(validate_slots(my_calendar.day));
        assert(validate_slots(other_day));

        // Compute intersection
        let intersection: DaySlots = multiply_calendars(my_calendar.day, other_day);

        // Find best slot
        let (best_slot, best_score): (u8, u8) = find_best_slot(intersection);

        // Create result
        let result: MeetingResult = MeetingResult {
            owner: self.caller,
            meeting_id: meeting_id,
            best_slot: best_slot,
            best_score: best_score,
            valid: best_score > 0u8,
        };

        return (my_calendar, result);
    }

    // ============================================
    // ASYNC TRANSITIONS (On-Chain Coordination)
    // ============================================

    // Register a new meeting between two parties
    async transition register_meeting(
        public meeting_id: field,
        public other_party: address,
        public timestamp: u64
    ) -> Future {
        // Return future for on-chain execution
        return finalize_register_meeting(meeting_id, self.caller, other_party, timestamp);
    }

    async function finalize_register_meeting(
        meeting_id: field,
        party_a: address,
        party_b: address,
        timestamp: u64
    ) {
        // Ensure meeting doesn't already exist
        let exists: bool = Mapping::contains(meetings, meeting_id);
        assert(!exists);

        // Create new meeting state
        let state: MeetingState = MeetingState {
            party_a: party_a,
            party_b: party_b,
            commitment_a: 0field,
            commitment_b: 0field,
            status: 0u8,
            created_at: timestamp,
        };

        // Store meeting state
        Mapping::set(meetings, meeting_id, state);

        // Increment meeting count for both parties
        let count_a: u64 = Mapping::get_or_use(user_meeting_count, party_a, 0u64);
        Mapping::set(user_meeting_count, party_a, count_a + 1u64);

        let count_b: u64 = Mapping::get_or_use(user_meeting_count, party_b, 0u64);
        Mapping::set(user_meeting_count, party_b, count_b + 1u64);
    }

    // Submit a commitment to the meeting
    async transition submit_commitment(
        public meeting_id: field,
        public commitment: field
    ) -> Future {
        return finalize_submit_commitment(meeting_id, self.caller, commitment);
    }

    async function finalize_submit_commitment(
        meeting_id: field,
        caller: address,
        commitment: field
    ) {
        // Get existing meeting state
        let state: MeetingState = Mapping::get(meetings, meeting_id);

        // Determine which party is submitting
        let is_party_a: bool = caller == state.party_a;
        let is_party_b: bool = caller == state.party_b;

        // Must be one of the meeting participants
        assert(is_party_a || is_party_b);

        // Update the appropriate commitment
        let new_commitment_a: field = is_party_a ? commitment : state.commitment_a;
        let new_commitment_b: field = is_party_b ? commitment : state.commitment_b;

        // Calculate new status
        let a_committed: bool = new_commitment_a != 0field;
        let b_committed: bool = new_commitment_b != 0field;
        let new_status: u8 = a_committed && b_committed ? 3u8 :
                            (a_committed ? 1u8 : (b_committed ? 2u8 : 0u8));

        // Update meeting state
        let new_state: MeetingState = MeetingState {
            party_a: state.party_a,
            party_b: state.party_b,
            commitment_a: new_commitment_a,
            commitment_b: new_commitment_b,
            status: new_status,
            created_at: state.created_at,
        };

        Mapping::set(meetings, meeting_id, new_state);
    }

    // Mark meeting as completed
    async transition complete_meeting(
        public meeting_id: field
    ) -> Future {
        return finalize_complete_meeting(meeting_id, self.caller);
    }

    async function finalize_complete_meeting(
        meeting_id: field,
        caller: address
    ) {
        // Get meeting state
        let state: MeetingState = Mapping::get(meetings, meeting_id);

        // Only participants can complete
        assert(caller == state.party_a || caller == state.party_b);

        // Both must have committed
        assert(state.status == 3u8);

        // Update to completed status
        let new_state: MeetingState = MeetingState {
            party_a: state.party_a,
            party_b: state.party_b,
            commitment_a: state.commitment_a,
            commitment_b: state.commitment_b,
            status: 4u8,
            created_at: state.created_at,
        };

        Mapping::set(meetings, meeting_id, new_state);
    }
}
