// Meeting coordination service for AleoCal
// Socket.io client wrapper for the meeting protocol
import { io, Socket } from 'socket.io-client';
import { MeetingResult } from './types';

export interface JoinerReadyData {
  meetingId: string;
  joinerAddress: string;
  slots: number[];
}

export interface MeetingResultData {
  meetingId: string;
  result: MeetingResult;
}

let socket: Socket | null = null;
let serverUrl = '';

/**
 * Initialize the socket connection to the meeting server.
 * Call once at app startup / when user is ready to create or join.
 */
export function connectToServer(url: string): Socket {
  if (socket && socket.connected && serverUrl === url) return socket;

  if (socket) {
    socket.disconnect();
  }

  serverUrl = url;
  socket = io(url, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('[Meeting] Connected to server'));
  socket.on('disconnect', () => console.log('[Meeting] Disconnected from server'));
  socket.on('connect_error', (e) => console.warn('[Meeting] Connection error:', e.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

/**
 * HOST: Create a meeting room on the server.
 * Returns a promise that resolves with the meetingId.
 */
export function createMeeting(
  meetingId: string,
  hostAddress: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Not connected to server'));

    const timeout = setTimeout(() => reject(new Error('Server timeout')), 5000);

    socket.once('meeting_created', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.emit('create_meeting', { meetingId, hostAddress });
  });
}

/**
 * JOINER: Join an existing meeting room.
 * Returns the host's address.
 */
export function joinMeeting(
  meetingId: string,
  joinerAddress: string
): Promise<{ hostAddress: string }> {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Not connected to server'));

    const timeout = setTimeout(() => reject(new Error('Server timeout')), 5000);

    socket.once('meeting_joined', (data: { hostAddress: string }) => {
      clearTimeout(timeout);
      resolve(data);
    });

    socket.once('join_error', (data: { error: string }) => {
      clearTimeout(timeout);
      reject(new Error(data.error));
    });

    socket.emit('join_meeting', { meetingId, joinerAddress });
  });
}

/**
 * JOINER: Submit calendar slots to the server after ZK creation.
 * The server forwards slots to the host.
 */
export function submitSlots(
  meetingId: string,
  slots: number[],
  joinerAddress: string
): void {
  if (!socket) return;
  socket.emit('submit_slots', { meetingId, slots, joinerAddress });
}

/**
 * HOST: Broadcast the computed ZK result to both parties.
 */
export function broadcastResult(meetingId: string, result: MeetingResult): void {
  if (!socket) return;
  socket.emit('broadcast_result', { meetingId, result });
}

/**
 * Listen for when the joiner has submitted their slots.
 * HOST uses this to know when it can compute the intersection.
 */
export function onJoinerReady(callback: (data: JoinerReadyData) => void): () => void {
  if (!socket) return () => {};
  socket.on('joiner_ready', callback);
  return () => socket?.off('joiner_ready', callback);
}

/**
 * Listen for when the joiner connects (before they submit slots).
 */
export function onJoinerConnected(callback: (data: { joinerAddress: string }) => void): () => void {
  if (!socket) return () => {};
  socket.on('joiner_connected', callback);
  return () => socket?.off('joiner_connected', callback);
}

/**
 * Listen for the meeting result (both host and joiner).
 */
export function onMeetingResult(callback: (data: MeetingResultData) => void): () => void {
  if (!socket) return () => {};
  socket.on('meeting_result', callback);
  return () => socket?.off('meeting_result', callback);
}

/**
 * Listen for peer disconnect events.
 */
export function onPeerDisconnected(callback: (data: { role: string }) => void): () => void {
  if (!socket) return () => {};
  socket.on('peer_disconnected', callback);
  return () => socket?.off('peer_disconnected', callback);
}

/**
 * Disconnect and clean up.
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if a meeting exists on the server.
 */
export async function checkMeetingExists(
  serverUrl: string,
  meetingId: string
): Promise<{ exists: boolean; hostAddress?: string }> {
  try {
    const res = await fetch(`${serverUrl}/api/meeting/${meetingId}`);
    if (!res.ok) return { exists: false };
    const data = await res.json();
    return { exists: true, hostAddress: data.hostAddress };
  } catch {
    return { exists: false };
  }
}
