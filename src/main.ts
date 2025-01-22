import { WsClient } from './websocket_client.ts';
import config from './config.ts';
import { WebSocketMessage } from './types.ts';

async function main() {
  try {
    // Handle Ctrl+C gracefully
    Deno.addSignalListener("SIGINT", () => {
      console.log("\nReceived SIGINT - Shutting down...");
      Deno.exit(0);
    });

    console.log(`Connecting to ${config.websocket.url}...`);
    const client = await WsClient.startLink();

    // Join the lobby topic
    client.joinTopic(config.topics.lobby);

    console.log('Client running... (Press Ctrl+C to exit)');
    
    // Keep the process running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
