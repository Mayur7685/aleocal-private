program calmatchtwo.aleo;

struct Slots:
    s0 as u8;
    s1 as u8;
    s2 as u8;
    s3 as u8;
    s4 as u8;
    s5 as u8;
    s6 as u8;
    s7 as u8;

mapping meeting_results:
    key as field.public;
    value as u8.public;

mapping meeting_scores:
    key as field.public;
    value as u8.public;

mapping meeting_valid:
    key as field.public;
    value as boolean.public;

function find_common_time:
    input r0 as field.public;
    input r1 as Slots.private;
    input r2 as Slots.private;
    lte r1.s0 5u8 into r3;
    assert.eq r3 true;
    lte r1.s1 5u8 into r4;
    assert.eq r4 true;
    lte r1.s2 5u8 into r5;
    assert.eq r5 true;
    lte r1.s3 5u8 into r6;
    assert.eq r6 true;
    lte r1.s4 5u8 into r7;
    assert.eq r7 true;
    lte r1.s5 5u8 into r8;
    assert.eq r8 true;
    lte r1.s6 5u8 into r9;
    assert.eq r9 true;
    lte r1.s7 5u8 into r10;
    assert.eq r10 true;
    lte r2.s0 5u8 into r11;
    assert.eq r11 true;
    lte r2.s1 5u8 into r12;
    assert.eq r12 true;
    lte r2.s2 5u8 into r13;
    assert.eq r13 true;
    lte r2.s3 5u8 into r14;
    assert.eq r14 true;
    lte r2.s4 5u8 into r15;
    assert.eq r15 true;
    lte r2.s5 5u8 into r16;
    assert.eq r16 true;
    lte r2.s6 5u8 into r17;
    assert.eq r17 true;
    lte r2.s7 5u8 into r18;
    assert.eq r18 true;
    mul r1.s0 r2.s0 into r19;
    mul r1.s1 r2.s1 into r20;
    mul r1.s2 r2.s2 into r21;
    mul r1.s3 r2.s3 into r22;
    mul r1.s4 r2.s4 into r23;
    mul r1.s5 r2.s5 into r24;
    mul r1.s6 r2.s6 into r25;
    mul r1.s7 r2.s7 into r26;
    gt r20 r19 into r27;
    ternary r27 r20 r19 into r28;
    ternary r27 1u8 0u8 into r29;
    gt r21 r28 into r30;
    ternary r30 r21 r28 into r31;
    ternary r30 2u8 r29 into r32;
    gt r22 r31 into r33;
    ternary r33 r22 r31 into r34;
    ternary r33 3u8 r32 into r35;
    gt r23 r34 into r36;
    ternary r36 r23 r34 into r37;
    ternary r36 4u8 r35 into r38;
    gt r24 r37 into r39;
    ternary r39 r24 r37 into r40;
    ternary r39 5u8 r38 into r41;
    gt r25 r40 into r42;
    ternary r42 r25 r40 into r43;
    ternary r42 6u8 r41 into r44;
    gt r26 r43 into r45;
    ternary r45 r26 r43 into r46;
    ternary r45 7u8 r44 into r47;
    gt r46 0u8 into r48;
    async find_common_time r0 r47 r46 r48 into r49;
    output r49 as calmatchtwo.aleo/find_common_time.future;

finalize find_common_time:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as boolean.public;
    set r1 into meeting_results[r0];
    set r2 into meeting_scores[r0];
    set r3 into meeting_valid[r0];

constructor:
    assert.eq edition 0u16;
