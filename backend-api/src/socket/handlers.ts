import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from './events';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on(SOCKET_EVENTS.JOIN_POLL, (pollId: string) => {
      socket.join(`poll_${pollId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_POLL, (pollId: string) => {
      socket.leave(`poll_${pollId}`);
    });
  });
}


