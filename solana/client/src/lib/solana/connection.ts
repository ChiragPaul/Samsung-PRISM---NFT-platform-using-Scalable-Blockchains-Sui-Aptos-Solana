import { Connection } from '@solana/web3.js';
import { config } from '../config';

/**
 * Single shared Connection. We pass an explicit `wsEndpoint` so that
 * onAccountChange / onProgramAccountChange subscriptions use the intended
 * WebSocket (important when using a dedicated RPC provider for live updates).
 */
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: config.rpcWsUrl,
      confirmTransactionInitialTimeout: 60_000,
    });
  }
  return connection;
}
