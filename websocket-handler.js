// Durable Object for handling WebSocket connections
export class WebSocketHandler {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    
    await this.handleSession(server);
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(websocket) {
    websocket.accept();
    
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      websocket,
      type: null, // 'client' or 'admin'
      id: sessionId
    });

    websocket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(sessionId, data);
      } catch (error) {
        console.error('Invalid message:', error);
      }
    });

    websocket.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });
  }

  handleMessage(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (data.type) {
      case 'client-ready':
        session.type = 'client';
        this.broadcastToAdmins({
          type: 'camera-available',
          clientId: sessionId
        });
        break;
        
      case 'admin-ready':
        session.type = 'admin';
        const clients = Array.from(this.sessions.values())
          .filter(s => s.type === 'client')
          .map(s => s.id);
        session.websocket.send(JSON.stringify({
          type: 'available-cameras',
          cameras: clients
        }));
        break;
        
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.forwardMessage(data.target, {
          ...data,
          sender: sessionId
        });
        break;
    }
  }

  broadcastToAdmins(message) {
    for (const session of this.sessions.values()) {
      if (session.type === 'admin') {
        session.websocket.send(JSON.stringify(message));
      }
    }
  }

  forwardMessage(targetId, message) {
    const target = this.sessions.get(targetId);
    if (target) {
      target.websocket.send(JSON.stringify(message));
    }
  }
}