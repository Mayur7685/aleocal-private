// TypeScript types for Aleo AleoCal integration

// Represents availability for each time slot (0-5 preference)
export interface DaySlots {
  slot_0: number;
  slot_1: number;
  slot_2: number;
  slot_3: number;
  slot_4: number;
  slot_5: number;
  slot_6: number;
  slot_7: number;
}

// Calendar record structure
export interface CalendarRecord {
  owner: string;
  day: DaySlots;
  calendar_id: string;
}

// Meeting result from intersection computation
export interface MeetingResult {
  owner: string;
  meeting_id: string;
  best_slot: number;
  best_score: number;
  valid: boolean;
  // ZK proof metadata
  zkMode?: 'real' | 'mock' | 'server' | 'simulated';
  proof?: string;
  executionTime?: number;
}

// Calendar share for secure exchange between parties
export interface CalendarShare {
  owner: string;
  sender: string;
  meeting_id: string;
  day: DaySlots;
  commitment: string;
  salt: string;
}

// Meeting state stored on-chain
export interface MeetingState {
  party_a: string;
  party_b: string;
  commitment_a: string;
  commitment_b: string;
  status: number;
  created_at: number;
}

// Aleo account info
export interface AleoAccount {
  privateKey: string;
  viewKey: string;
  address: string;
}

// Execution result from Leo program
export interface ExecutionResult {
  outputs: string[];
  proof?: string;
  executionId?: string;
  zkMode?: 'real' | 'mock' | 'server';
  executionTime?: number;
}

// Time slot labels for UI
export const TIME_SLOTS = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '1:00 PM - 2:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
] as const;

// Meeting status enum
export enum MeetingStatus {
  Created = 0,
  PartyACommitted = 1,
  PartyBCommitted = 2,
  BothCommitted = 3,
  Completed = 4,
}
