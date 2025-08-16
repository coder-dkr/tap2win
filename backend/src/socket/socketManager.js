const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const redisService = require('../services/redisService');

let wss;
let heartbeatInterval;
const clients = new Map(); // Map to store client connections
const rooms = new Map(); // Map to store room participants

const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws'
  });

  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection');

    // Extract token from query parameters or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers.authorization?.split(' ')[1];

    let user = null;
    
    // Authenticate user if token provided
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findByPk(decoded.userId);
        
        if (!user || !user.isActive) {
          user = null;
        } else {
          console.log(`User ${user.username} connected`);
        }
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        user = null;
      }
    }

    // Store client info
    const clientId = generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      user,
      rooms: new Set(),
      isAlive: true
    };

    clients.set(clientId, clientInfo);

    // Add to user room if authenticated
    if (user) {
      joinRoom(clientId, `user:${user.id}`);
    }

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await handleMessage(clientId, data);
      } catch (error) {
        console.error('Error handling message:', error);
        sendToClient(clientId, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });

    // Handle ping/pong for connection health
    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle connection close
    ws.on('close', async () => {
      console.log(`Client ${clientId} disconnected`);
      
      const client = clients.get(clientId);
      if (client) {
        // Remove from all rooms
        for (const roomId of client.rooms) {
          await leaveRoom(clientId, roomId);
        }
        
        clients.delete(clientId);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send connection confirmation
    sendToClient(clientId, {
      type: 'connected',
      clientId,
      user: user ? {
        id: user.id,
        username: user.username
      } : null
    });
  });

  // Heartbeat to keep connections alive and clean up dead connections
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = Array.from(clients.values()).find(c => c.ws === ws);
      if (client) {
        if (client.isAlive === false) {
          return ws.terminate();
        }
        client.isAlive = false;
        ws.ping();
      }
    });
  }, 30000);

  return wss;
};

const generateClientId = () => {
  return Math.random().toString(36).substr(2, 9);
};

const handleMessage = async (clientId, data) => {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'joinAuction':
      await handleJoinAuction(clientId, data.auctionId);
      break;
    
    case 'leaveAuction':
      await handleLeaveAuction(clientId, data.auctionId);
      break;
    
    case 'requestAuctionUpdate':
      await handleRequestAuctionUpdate(clientId, data.auctionId);
      break;
    
    case 'typing':
      handleTyping(clientId, data);
      break;
    
    case 'ping':
      sendToClient(clientId, { type: 'pong' });
      break;
    
    default:
      sendToClient(clientId, {
        type: 'error',
        message: 'Unknown message type'
      });
  }
};

const handleJoinAuction = async (clientId, auctionId) => {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    joinRoom(clientId, `auction:${auctionId}`);
    
    if (client.user) {
      await redisService.addAuctionParticipant(auctionId, client.user.id);
    }

    // Send current auction state
    const highestBid = await redisService.getAuctionHighestBid(auctionId);
    const bidCount = await redisService.getAuctionBidCount(auctionId);
    const participants = await redisService.getAuctionParticipants(auctionId);

    sendToClient(clientId, {
      type: 'auctionState',
      auctionId,
      highestBid,
      bidCount,
      participantCount: participants.length
    });

    // Notify others in the room
    broadcastToRoom(`auction:${auctionId}`, {
      type: 'userJoined',
      userId: client.user?.id,
      username: client.user?.username,
      participantCount: participants.length
    }, clientId);

    console.log(`User ${client.user?.username || 'Anonymous'} joined auction ${auctionId}`);
  } catch (error) {
    console.error('Error joining auction:', error);
    sendToClient(clientId, {
      type: 'error',
      message: 'Failed to join auction'
    });
  }
};

const handleLeaveAuction = async (clientId, auctionId) => {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    leaveRoom(clientId, `auction:${auctionId}`);
    
    if (client.user) {
      await redisService.removeAuctionParticipant(auctionId, client.user.id);
      const participants = await redisService.getAuctionParticipants(auctionId);
      
      broadcastToRoom(`auction:${auctionId}`, {
        type: 'userLeft',
        userId: client.user.id,
        username: client.user.username,
        participantCount: participants.length
      });
    }

    console.log(`User ${client.user?.username || 'Anonymous'} left auction ${auctionId}`);
  } catch (error) {
    console.error('Error leaving auction:', error);
  }
};

const handleRequestAuctionUpdate = async (clientId, auctionId) => {
  try {
    const highestBid = await redisService.getAuctionHighestBid(auctionId);
    const bidCount = await redisService.getAuctionBidCount(auctionId);
    const participants = await redisService.getAuctionParticipants(auctionId);

    sendToClient(clientId, {
      type: 'auctionUpdate',
      auctionId,
      highestBid,
      bidCount,
      participantCount: participants.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending auction update:', error);
    sendToClient(clientId, {
      type: 'error',
      message: 'Failed to get auction update'
    });
  }
};

const handleTyping = (clientId, data) => {
  const client = clients.get(clientId);
  if (!client || !client.user) return;

  broadcastToRoom(`auction:${data.auctionId}`, {
    type: 'userTyping',
    userId: client.user.id,
    username: client.user.username,
    isTyping: data.isTyping
  }, clientId);
};

const joinRoom = (clientId, roomId) => {
  const client = clients.get(clientId);
  if (!client) return;

  client.rooms.add(roomId);
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(clientId);
};

const leaveRoom = async (clientId, roomId) => {
  const client = clients.get(clientId);
  if (!client) return;

  client.rooms.delete(roomId);
  
  const room = rooms.get(roomId);
  if (room) {
    room.delete(clientId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
};

const sendToClient = (clientId, data) => {
  const client = clients.get(clientId);
  if (!client || !client.ws || client.ws.readyState !== WebSocket.OPEN) return;

  try {
    client.ws.send(JSON.stringify(data));
  } catch (error) {
    console.error('Error sending to client:', error);
  }
};

const broadcastToRoom = (roomId, data, excludeClientId = null) => {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`Room ${roomId} not found for broadcast`);
    return;
  }

  console.log(`Broadcasting to room ${roomId} with ${room.size} clients`);
  room.forEach(clientId => {
    if (clientId !== excludeClientId) {
      sendToClient(clientId, data);
    }
  });
};

const broadcastToUser = (userId, data) => {
  const userRoomId = `user:${userId}`;
  console.log(`Broadcasting to user ${userId} in room ${userRoomId}:`, data.type);
  broadcastToRoom(userRoomId, data);
};

// ✅ REAL-TIME: Broadcast to all connected clients (for global updates)
const broadcastToAll = (data) => {
  console.log(`Broadcasting to all clients:`, data.type);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  });
};

const broadcastToAuction = (auctionId, data) => {
  const auctionRoomId = `auction:${auctionId}`;
  broadcastToRoom(auctionRoomId, data);
};

const broadcastToAdmins = (data) => {
  clients.forEach((client, clientId) => {
    if (client.user && client.user.role === 'admin') {
      sendToClient(clientId, data);
    }
  });
};

const getAuctionParticipants = (auctionId) => {
  const room = rooms.get(`auction:${auctionId}`);
  return room ? room.size : 0;
};

const getWebSocketServer = () => {
  if (!wss) {
    throw new Error('WebSocket server not initialized');
  }
  return wss;
};

const cleanup = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  clients.clear();
  rooms.clear();
  console.log('WebSocket cleanup completed');
};

module.exports = {
  initializeWebSocket,
  getWebSocketServer,
  broadcastToAuction,
  broadcastToUser,
  broadcastToAll,
  broadcastToAdmins,
  getAuctionParticipants,
  cleanup
};
