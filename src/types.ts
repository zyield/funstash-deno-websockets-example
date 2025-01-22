export interface GamePayload {
  id?: string;
  state?: string;
  token?: string;
  status?: string;
  response?: {
    status: string;
  };
  [key: string]: unknown;
}

export interface WebSocketMessage {
  payload: GamePayload;
  topic: string;
  event: string;
  ref?: number | null;
}
