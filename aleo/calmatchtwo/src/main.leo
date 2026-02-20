// calmatchtwo.aleo - Privacy-Preserving Calendar Matching
// find_common_time takes BOTH parties' slots as private struct inputs.
// ZK proof proves the intersection was computed correctly without
// revealing either party's availability. Only the result is stored on-chain.

program calmatchtwo.aleo {

    const MAX_PREFERENCE: u8 = 5u8;

    struct Slots {
        s0: u8,
        s1: u8,
        s2: u8,
        s3: u8,
        s4: u8,
        s5: u8,
        s6: u8,
        s7: u8,
    }

    mapping meeting_results: field => u8;
    mapping meeting_scores:  field => u8;
    mapping meeting_valid:   field => bool;

    @noupgrade
    async constructor() {}

    async transition find_common_time(
        public meeting_id: field,
        host: Slots,
        guest: Slots
    ) -> Future {
        assert(host.s0  <= MAX_PREFERENCE);
        assert(host.s1  <= MAX_PREFERENCE);
        assert(host.s2  <= MAX_PREFERENCE);
        assert(host.s3  <= MAX_PREFERENCE);
        assert(host.s4  <= MAX_PREFERENCE);
        assert(host.s5  <= MAX_PREFERENCE);
        assert(host.s6  <= MAX_PREFERENCE);
        assert(host.s7  <= MAX_PREFERENCE);
        assert(guest.s0 <= MAX_PREFERENCE);
        assert(guest.s1 <= MAX_PREFERENCE);
        assert(guest.s2 <= MAX_PREFERENCE);
        assert(guest.s3 <= MAX_PREFERENCE);
        assert(guest.s4 <= MAX_PREFERENCE);
        assert(guest.s5 <= MAX_PREFERENCE);
        assert(guest.s6 <= MAX_PREFERENCE);
        assert(guest.s7 <= MAX_PREFERENCE);

        let i0: u8 = host.s0 * guest.s0;
        let i1: u8 = host.s1 * guest.s1;
        let i2: u8 = host.s2 * guest.s2;
        let i3: u8 = host.s3 * guest.s3;
        let i4: u8 = host.s4 * guest.s4;
        let i5: u8 = host.s5 * guest.s5;
        let i6: u8 = host.s6 * guest.s6;
        let i7: u8 = host.s7 * guest.s7;

        let best_val: u8 = i0;
        let best_idx: u8 = 0u8;

        let cmp1: bool = i1 > best_val;
        best_val = cmp1 ? i1 : best_val;
        best_idx = cmp1 ? 1u8 : best_idx;

        let cmp2: bool = i2 > best_val;
        best_val = cmp2 ? i2 : best_val;
        best_idx = cmp2 ? 2u8 : best_idx;

        let cmp3: bool = i3 > best_val;
        best_val = cmp3 ? i3 : best_val;
        best_idx = cmp3 ? 3u8 : best_idx;

        let cmp4: bool = i4 > best_val;
        best_val = cmp4 ? i4 : best_val;
        best_idx = cmp4 ? 4u8 : best_idx;

        let cmp5: bool = i5 > best_val;
        best_val = cmp5 ? i5 : best_val;
        best_idx = cmp5 ? 5u8 : best_idx;

        let cmp6: bool = i6 > best_val;
        best_val = cmp6 ? i6 : best_val;
        best_idx = cmp6 ? 6u8 : best_idx;

        let cmp7: bool = i7 > best_val;
        best_val = cmp7 ? i7 : best_val;
        best_idx = cmp7 ? 7u8 : best_idx;

        let is_valid: bool = best_val > 0u8;

        return finalize_find_common_time(meeting_id, best_idx, best_val, is_valid);
    }

    async function finalize_find_common_time(
        meeting_id: field,
        best_slot: u8,
        best_score: u8,
        valid: bool
    ) {
        Mapping::set(meeting_results, meeting_id, best_slot);
        Mapping::set(meeting_scores,  meeting_id, best_score);
        Mapping::set(meeting_valid,   meeting_id, valid);
    }
}
