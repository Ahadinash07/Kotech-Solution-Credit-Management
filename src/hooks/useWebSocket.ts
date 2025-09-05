'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface UseWebSocketProps {
  onCreditUpdate: (credits: number) => void;
  onSessionEnd: () => void;
}

export const useWebSocket = ({ onCreditUpdate, onSessionEnd }: UseWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000');

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      // Authenticate with the server
      socket.emit('authenticate', token);
    });

    socket.on('authenticated', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        console.log('WebSocket authentication successful');
      } else {
        console.error('WebSocket authentication failed:', data.error);
      }
    });

    socket.on('credit_update', (data: { credits: number }) => {
      onCreditUpdate(data.credits);
    });

    socket.on('session_end', () => {
      onSessionEnd();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]); // Remove callback dependencies to prevent re-renders

  // Update event handlers when callbacks change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Remove old listeners and add new ones
    socket.off('credit_update');
    socket.off('session_end');
    
    socket.on('credit_update', (data: { credits: number }) => {
      onCreditUpdate(data.credits);
    });

    socket.on('session_end', () => {
      onSessionEnd();
    });
  }, [onCreditUpdate, onSessionEnd]);

  return socketRef.current;
};
