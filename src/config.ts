export const config = {
  websocket: {
    url: 'ws://localhost:4000/ws/websocket',
    heartbeatInterval: 30000,
  },
  topics: {
    lobby: 'games:lobby',
    game: (gameId: string) => `games:${gameId}`,
  },
  auth: {
    token: 'dummy123',  // Replace with your actual token
  }
} as const;

export default config;
