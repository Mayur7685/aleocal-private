// Mock Aleo SDK for development/testing
// This simulates the Aleo SDK functionality without WASM dependencies
// Replace with actual @provablehq/sdk when using Vite or ejected CRA

import { AleoAccount, DaySlots, MeetingResult } from './types';

// Flag to enable/disable mock mode
export const MOCK_MODE = false;

// Generate a random Aleo-like address
function generateMockAddress(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'aleo1';
  for (let i = 0; i < 58; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random private key-like string
function generateMockPrivateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'APrivateKey1';
  for (let i = 0; i < 47; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random view key-like string
function generateMockViewKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'AViewKey1';
  for (let i = 0; i < 50; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Mock Account class
export class MockAccount {
  private _privateKey: string;
  private _viewKey: string;
  private _address: string;

  constructor(options?: { privateKey?: string }) {
    if (options?.privateKey) {
      this._privateKey = options.privateKey;
      // Derive deterministic view key and address from private key
      const hash = this.simpleHash(options.privateKey);
      this._viewKey = 'AViewKey1' + hash.substring(0, 50);
      this._address = 'aleo1' + hash.substring(0, 58).toLowerCase();
    } else {
      this._privateKey = generateMockPrivateKey();
      this._viewKey = generateMockViewKey();
      this._address = generateMockAddress();
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const absHash = Math.abs(hash);
    for (let i = 0; i < 60; i++) {
      result += chars.charAt((absHash + i * 7) % chars.length);
    }
    return result;
  }

  privateKey() {
    return { to_string: () => this._privateKey };
  }

  viewKey() {
    return { to_string: () => this._viewKey };
  }

  address() {
    return { to_string: () => this._address };
  }
}

// Mock Program Manager
export class MockProgramManager {
  private account: MockAccount | null = null;

  constructor(apiUrl?: string) {
    // Mock initialization
  }

  setAccount(account: MockAccount) {
    this.account = account;
  }

  // Simulate running a Leo transition locally
  async run(
    programId: string,
    functionName: string,
    inputs: string[],
    prove: boolean = true,
    _fee?: number,
    _feeRecord?: any,
    privateKey?: string
  ): Promise<{ outputs: string[] }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Mock responses based on function name
    switch (functionName) {
      case 'create_calendar':
        return this.mockCreateCalendar(inputs);
      case 'compute_intersection_direct':
        return this.mockComputeIntersection(inputs);
      case 'commit_calendar':
        return this.mockCommitCalendar(inputs);
      case 'share_calendar':
        return this.mockShareCalendar(inputs);
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private mockCreateCalendar(inputs: string[]): { outputs: string[] } {
    const slots = inputs.slice(0, 8).map(s => parseInt(s.replace('u8', '')));
    const calendarId = inputs[8] || '123field';
    const owner = this.account?.address().to_string() || generateMockAddress();

    const record = `Calendar {
      owner: ${owner}.private,
      day: DaySlots {
        slot_0: ${slots[0]}u8.private,
        slot_1: ${slots[1]}u8.private,
        slot_2: ${slots[2]}u8.private,
        slot_3: ${slots[3]}u8.private,
        slot_4: ${slots[4]}u8.private,
        slot_5: ${slots[5]}u8.private,
        slot_6: ${slots[6]}u8.private,
        slot_7: ${slots[7]}u8.private
      },
      calendar_id: ${calendarId}.private,
      _nonce: 1234567890group.public
    }`;

    return { outputs: [record] };
  }

  private mockComputeIntersection(inputs: string[]): { outputs: string[] } {
    // Parse my calendar from the record
    const myRecord = inputs[0];
    const mySlots = this.extractSlotsFromRecord(myRecord);

    // Parse other slots
    const otherSlots = inputs.slice(1, 9).map(s => parseInt(s.replace('u8', '')));
    const meetingId = inputs[9] || '0field';

    // Compute intersection (element-wise multiplication)
    const intersection = mySlots.map((s, i) => s * otherSlots[i]);

    // Find best slot (argmax)
    let bestSlot = 0;
    let bestScore = intersection[0];
    for (let i = 1; i < intersection.length; i++) {
      if (intersection[i] > bestScore) {
        bestScore = intersection[i];
        bestSlot = i;
      }
    }

    const owner = this.account?.address().to_string() || generateMockAddress();
    const valid = bestScore > 0;

    const calendarRecord = inputs[0];
    const resultRecord = `MeetingResult {
      owner: ${owner}.private,
      meeting_id: ${meetingId}.private,
      best_slot: ${bestSlot}u8.private,
      best_score: ${bestScore}u8.private,
      valid: ${valid}.private
    }`;

    return { outputs: [calendarRecord, resultRecord] };
  }

  private mockCommitCalendar(inputs: string[]): { outputs: string[] } {
    const calendarRecord = inputs[0];
    const salt = inputs[1];
    const meetingId = inputs[2];
    const otherParty = inputs[3];

    // Generate a mock commitment hash
    const commitment = Math.abs(this.hashString(calendarRecord + salt)).toString() + 'field';

    const requestRecord = `MeetingRequest {
      owner: ${otherParty}.private,
      meeting_id: ${meetingId}.private,
      requester: ${this.account?.address().to_string()}.private,
      commitment: ${commitment}.private
    }`;

    return { outputs: [calendarRecord, requestRecord] };
  }

  private mockShareCalendar(inputs: string[]): { outputs: string[] } {
    const calendarRecord = inputs[0];
    const salt = inputs[1];
    const meetingId = inputs[2];
    const recipient = inputs[3];

    const commitment = Math.abs(this.hashString(calendarRecord + salt)).toString() + 'field';
    const slots = this.extractSlotsFromRecord(calendarRecord);

    const shareRecord = `CalendarShare {
      owner: ${recipient}.private,
      sender: ${this.account?.address().to_string()}.private,
      meeting_id: ${meetingId}.private,
      day: DaySlots {
        slot_0: ${slots[0]}u8.private,
        slot_1: ${slots[1]}u8.private,
        slot_2: ${slots[2]}u8.private,
        slot_3: ${slots[3]}u8.private,
        slot_4: ${slots[4]}u8.private,
        slot_5: ${slots[5]}u8.private,
        slot_6: ${slots[6]}u8.private,
        slot_7: ${slots[7]}u8.private
      },
      commitment: ${commitment}.private,
      salt: ${salt}.private
    }`;

    return { outputs: [calendarRecord, shareRecord] };
  }

  private extractSlotsFromRecord(record: string): number[] {
    const slots: number[] = [];
    for (let i = 0; i < 8; i++) {
      const match = record.match(new RegExp(`slot_${i}:\\s*(\\d+)u8`));
      slots.push(match ? parseInt(match[1]) : 0);
    }
    return slots;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  // Execute offline (local execution without submitting to network)
  async executeOffline(
    programCode: string,
    functionName: string,
    inputs: string[]
  ): Promise<{ getOutputs: () => string[]; getProof?: () => string }> {
    // Use the existing run method to process the function
    const result = await this.run('aleocal.aleo', functionName, inputs);

    return {
      getOutputs: () => result.outputs,
      getProof: () => 'mock_proof_' + Date.now(),
    };
  }

  // Execute a transaction (for on-chain operations)
  async execute(
    programId: string,
    functionName: string,
    inputs: string[],
    fee: number,
    _feeRecord?: any,
    _imports?: any,
    privateKey?: string
  ): Promise<{ transactionId: string }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Generate mock transaction ID
    const txId = 'at1' + Array(58).fill(0).map(() =>
      'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))
    ).join('');

    return { transactionId: txId };
  }
}

// Mock Network Client
export class MockNetworkClient {
  constructor(apiUrl?: string) {
    // Mock initialization
  }

  async getProgramMappingValue(
    programId: string,
    mappingName: string,
    key: string
  ): Promise<string | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return null for most queries (no data)
    return null;
  }
}

// Export mock SDK
export const MockAleoSDK = {
  Account: MockAccount,
  ProgramManager: MockProgramManager,
  AleoNetworkClient: MockNetworkClient,
};

export default MockAleoSDK;
