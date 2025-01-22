import { WebSocketMessage, GamePayload } from './types.ts';
import config from './config.ts';

export class WsClient {
  private ws: WebSocket;
  private heartbeatRef: number;
  private heartbeatInterval?: number;
  private connected: boolean = false;
  private topics: Set<string> = new Set();

  constructor(
    private url: string,
    private heartbeatTime: number = config.websocket.heartbeatInterval
  ) {
    this.ws = new WebSocket(this.url);
    this.heartbeatRef = 1;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.ws.onopen = () => {
      console.log('Connected to WebSocket server');
      this.connected = true;
      this.startHeartbeat();
      
      // Rejoin any topics that were previously joined
      this.topics.forEach(topic => {
        this.joinTopic(topic);
      });
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      this.connected = false;
      this.stopHeartbeat();
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleFrame(msg);
      } catch (error) {
        console.log('Error parsing message:', error);
      }
    };
  }

  private handleFrame(msg: WebSocketMessage): void {
    try {
      // Handle different message types
      switch (msg.event) {
        case 'phx_reply':
          if (msg.payload?.response?.status === 'ok' && msg.payload?.status === 'ok') {
            console.log('Message acknowledged:', msg.topic);
          }
          break;

        case 'phx_error':
          console.error('Channel error:', msg);
          break;

        case 'presence_state':
          console.log('Presence state update:', msg.payload);
          break;

        case 'presence_diff':
          console.log('Presence change:', msg.payload);
          break;

        default:
          if (msg.payload && 'id' in msg.payload && 'state' in msg.payload) {
            console.log(
              `Received: ${msg.event}, on topic: ${msg.topic}, with game_id: ${msg.payload.id} and state: ${msg.payload.state}`
            );
          } else {
            console.log('Received message:', msg);
          }
      }
    } catch (error) {
      console.log('Error handling message:', error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMsg: WebSocketMessage = {
        topic: 'phoenix',
        event: 'heartbeat',
        payload: {},
        ref: this.heartbeatRef++
      };
      this.sendFrame(heartbeatMsg);
    }, this.heartbeatTime);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private reconnect(): void {
    console.log('Attempting to reconnect...');
    setTimeout(() => {
      this.ws = new WebSocket(this.url);
      this.setupHandlers();
    }, 5000); // Wait 5 seconds before reconnecting
  }

  public joinTopic(topic: string, payload: GamePayload = {}): void {
    this.topics.add(topic);
    
    if (this.connected) {
      const joinMessage: WebSocketMessage = {
        topic,
        event: 'phx_join',
        payload: {
          ...payload,
          api_key: config.auth.token
        },
        ref: this.heartbeatRef++
      };
      this.sendFrame(joinMessage);
      console.log(`Joined topic: ${topic}`);
    }
  }

  public leaveTopic(topic: string): void {
    this.topics.delete(topic);
    
    if (this.connected) {
      const leaveMessage: WebSocketMessage = {
        topic,
        event: 'phx_leave',
        payload: {},
        ref: this.heartbeatRef++
      };
      this.sendFrame(leaveMessage);
      console.log(`Left topic: ${topic}`);
    }
  }

  public sendFrame(message: WebSocketMessage): void {
    if (this.connected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('Cannot send message: WebSocket is not connected');
    }
  }

  public disconnect(): void {
    this.topics.clear();
    this.stopHeartbeat();
    this.ws.close();
  }

  public static async startLink(
    url: string = config.websocket.url
  ): Promise<WsClient> {
    return new Promise((resolve) => {
      const client = new WsClient(url);
      client.ws.onopen = () => {
        client.connected = true;
        client.startHeartbeat();
        resolve(client);
      };
    });
  }
}
