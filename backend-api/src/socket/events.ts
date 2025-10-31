export const SOCKET_EVENTS = {
  JOIN_POLL: 'join_poll',
  LEAVE_POLL: 'leave_poll',
  POLL_UPDATE: 'poll_update'
} as const;

export type SocketEventKeys = keyof typeof SOCKET_EVENTS;


