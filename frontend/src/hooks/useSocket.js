import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

/**
 * Subscribe to a socket event and auto-cleanup on unmount.
 * @param {string} event - socket event name
 * @param {function} handler - callback
 */
const useSocket = (event, handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const cb = (...args) => handlerRef.current(...args);
    socket.on(event, cb);
    return () => socket.off(event, cb);
  }, [event]);
};

export default useSocket;
