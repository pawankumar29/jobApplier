import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.js';

interface SSEEventPayload {
  type: string;
  data: any;
  timestamp: string;
}

interface SSEContextType {
  lastEvent: SSEEventPayload | null;
  isConnected: boolean;
}

const SSEContext = createContext<SSEContextType>({ lastEvent: null, isConnected: false });

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [lastEvent, setLastEvent] = useState<SSEEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const sseUrl = `http://localhost:5000/api/sse/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setLastEvent(parsed);
      } catch (err) {
        // Ignored
      }
    };

    const listeners = ['JOB_DISCOVERED', 'JOB_QUEUED', 'APPLICATION_UPDATED', 'LOG_ENTRY'];
    listeners.forEach((evt) => {
      eventSource.addEventListener(evt, (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          setLastEvent({ type: evt, data: parsed.data, timestamp: parsed.timestamp });
        } catch (err) {
          // Ignored
        }
      });
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [token]);

  return <SSEContext.Provider value={{ lastEvent, isConnected }}>{children}</SSEContext.Provider>;
};

export const useSSE = () => useContext(SSEContext);

