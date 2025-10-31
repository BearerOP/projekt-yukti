// src/services/solanaWallet.ts
// Lightweight wrapper around Solana Mobile Wallet Adapter (scaffold)
// Note: Ensure you install and configure the mobile wallet adapter packages in app config.

import { Connection, Transaction, PublicKey, VersionedTransaction, clusterApiUrl } from '@solana/web3.js';
// import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

export type Cluster = 'devnet' | 'testnet' | 'mainnet-beta';

export interface SolanaConfig {
  rpcUrl?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export class SolanaWalletClient {
  readonly connection: Connection;

  constructor(cluster: Cluster = 'devnet', config?: SolanaConfig) {
    const rpcUrl = config?.rpcUrl ?? clusterApiUrl(cluster);
    this.connection = new Connection(rpcUrl, config?.commitment ?? 'confirmed');
  }

  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash('finalized');
    return blockhash;
  }

  // Scaffold: invoke mobile wallet adapter to sign and send
  async signAndSend(transaction: Transaction | VersionedTransaction): Promise<string> {
    const mod = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js').catch(() => null);
    if (!mod?.transact) {
      throw new Error('Solana Mobile Wallet Adapter not available. Rebuild dev client with the native module.');
    }
    let sig = '';
    await mod.transact(async (wallet: any) => {
      const resp = await wallet.signAndSendTransactions({ transactions: [transaction] });
      sig = resp?.[0];
    });
    if (!sig) throw new Error('No signature returned from wallet');
    return sig;
  }
}

export const getProgramPublicKey = (programId: string): PublicKey => new PublicKey(programId);


