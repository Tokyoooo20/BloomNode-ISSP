import { io } from 'socket.io-client';

// Get API base URL from environment or default to localhost (same logic as api.js)
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

let socket = null;

/**
 * Initialize Socket.io connection
 * @param {string} token - Authentication token
 * @param {string} userId - User ID
 * @param {string} role - User role (admin, president, unit)
 */
export const connectSocket = (token, userId, role) => {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If socket exists but not connected, try to reconnect
  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }

  // Create new socket connection
  socket = io(API_BASE_URL, {
    auth: {
      token,
      userId,
      role
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  socket.on('connect', () => {
    console.log('✅ Socket.io connected:', socket.id);
    // Authenticate with server
    if (userId && role) {
      socket.emit('authenticate', { userId, role });
      console.log('✅ Socket.io authenticated:', { userId, role });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.io disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.io connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket.io reconnected after', attemptNumber, 'attempts');
    // Re-authenticate after reconnection
    if (userId && role) {
      socket.emit('authenticate', { userId, role });
    }
  });

  return socket;
};

/**
 * Disconnect Socket.io
 * Only disconnect if explicitly needed (e.g., logout)
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
};

/**
 * Get current socket instance
 */
export const getSocket = () => {
  return socket;
};

/**
 * Subscribe to an event
 * @param {string} event - Event name
 * @param {function} callback - Callback function
 */
export const subscribe = (event, callback) => {
  if (!socket) {
    console.warn(`Cannot subscribe to ${event}: Socket not initialized. Call connectSocket() first.`);
    return;
  }

  if (socket.connected) {
    socket.on(event, callback);
    console.log(`✅ Subscribed to event: ${event}`);
  } else {
    // If socket exists but not connected, wait for connection
    console.log(`⏳ Waiting for socket connection before subscribing to ${event}...`);
    socket.once('connect', () => {
      socket.on(event, callback);
      console.log(`✅ Subscribed to event: ${event} (after connection)`);
    });
  }
};

/**
 * Unsubscribe from an event
 * @param {string} event - Event name
 * @param {function} callback - Callback function (optional)
 */
export const unsubscribe = (event, callback) => {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  subscribe,
  unsubscribe
};

