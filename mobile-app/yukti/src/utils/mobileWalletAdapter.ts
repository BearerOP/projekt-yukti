import { PublicKey, Transaction } from '@solana/web3.js';
import {
  transact as mwaTransact,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store/store';
import {
  setConnected,
  setDisconnected,
  setConnecting,
  setError,
  setSolBalance
} from '../store/slices/walletSlice';
import { walletAPI } from '../services/api';
import bs58 from 'bs58';

const WALLET_STORAGE_KEY = '@yukti_wallet_address';
const AUTH_TOKEN_KEY = '@yukti_wallet_auth_token';

export interface MobileWalletAdapter {
  connect(): Promise<{ publicKey: PublicKey; address: string }>;
  disconnect(): Promise<void>;
  signMessage(message: string): Promise<string>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAndSendTransaction(transaction: Transaction): Promise<string>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  reconnectIfPossible(): Promise<boolean>;
  isConnected: boolean;
  publicKey: PublicKey | null;
  address: string | null;
}

class MobileWalletAdapterImpl implements MobileWalletAdapter {
  private _publicKey: PublicKey | null = null;
  private _address: string | null = null;
  private _authToken: string | null = null;

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get address(): string | null {
    return this._address;
  }

  get isConnected(): boolean {
    return !!this._publicKey && !!this._address;
  }

  /**
   * Connect to Phantom mobile wallet
   */
  async connect(): Promise<{ publicKey: PublicKey; address: string }> {
    try {
      console.log('🔌 Connecting to Phantom mobile wallet...');
      store.dispatch(setConnecting(true));

      const result = await mwaTransact(async (wallet) => {
        // Request authorization
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'Yukti - Opinion Trading',
            uri: 'https://yukti.app',
            icon: 'favicon.ico',
          },
        });

        console.log('✅ Authorization successful');

        // Get the first account
        const account = authResult.accounts[0];
        if (!account?.address) {
          throw new Error('No wallet account returned');
        }

        // The address comes as a base64 string, decode it
        const addressBase64 = account.address;
        const addressBytes = Uint8Array.from(atob(addressBase64), c => c.charCodeAt(0));
        const publicKey = new PublicKey(addressBytes);
        const addressString = publicKey.toString();

        console.log('📍 Wallet address:', addressString);

        return {
          publicKey,
          address: addressString,
          authToken: authResult.auth_token
        };
      });

      // Store in instance
      this._publicKey = result.publicKey;
      this._address = result.address;
      this._authToken = result.authToken;

      // Persist to AsyncStorage
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, result.address);
      if (result.authToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.authToken);
      }

      // Update Redux store
      store.dispatch(setConnected({
        address: result.address,
        authToken: result.authToken
      }));

      console.log('✅ Successfully connected to wallet:', result.address);

      // Link wallet to backend immediately (no signature required anymore)
      this.linkWalletToBackend(result.address).catch((linkError) => {
        console.error('⚠️ Background wallet linking failed (will retry when needed):', linkError.message);
        // Wallet is still connected locally - user can retry linking later when placing bid
      });

      return {
        publicKey: result.publicKey,
        address: result.address
      };
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Phantom wallet';
      store.dispatch(setError(errorMessage));
      throw new Error(errorMessage);
    }
  }

  /**
   * Link wallet to backend database (public method for retry)
   */
  async linkWalletToBackend(walletAddress?: string): Promise<void> {
    const address = walletAddress || this._address;
    if (!address) {
      throw new Error('No wallet connected');
    }

    try {
      console.log('🔗 Linking wallet to backend...');
      console.log('📤 Wallet address:', address);

      // Send wallet address directly to backend (no signature required for now)
      const response = await walletAPI.linkWallet({
        walletAddress: address,
        walletType: 'PHANTOM',
      });

      console.log('✅ Wallet linked successfully:', response.data);
    } catch (error: any) {
      console.error('❌ Failed to link wallet to backend:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting wallet...');

      if (this._authToken) {
        await mwaTransact(async (wallet) => {
          await wallet.deauthorize({ auth_token: this._authToken || '' });
        });
      }
    } catch (error) {
      console.log('⚠️ Deauthorization error (may be expected):', error);
    } finally {
      // Clear instance state
      this._publicKey = null;
      this._address = null;
      this._authToken = null;

      // Clear AsyncStorage
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);

      // Update Redux store
      store.dispatch(setDisconnected());

      console.log('✅ Wallet disconnected');
    }
  }

  /**
   * Try to reconnect using stored credentials
   */
  async reconnectIfPossible(): Promise<boolean> {
    try {
      const storedAddress = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      const storedAuthToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (!storedAddress) {
        console.log('📭 No stored wallet address found');
        return false;
      }

      console.log('🔄 Attempting to reconnect to wallet...');
      store.dispatch(setConnecting(true));

      const result = await mwaTransact(async (wallet) => {
        // Try to reauthorize with stored token
        if (storedAuthToken) {
          try {
            const reauth = await wallet.reauthorize({
              auth_token: storedAuthToken,
              identity: {
                name: 'Yukti - Opinion Trading',
                uri: 'https://yukti.app',
              },
            });

            const account = reauth.accounts[0];
            if (!account?.address) {
              throw new Error('No account in reauthorization');
            }

            const addressBase64 = account.address;
            const addressBytes = Uint8Array.from(atob(addressBase64), c => c.charCodeAt(0));
            const publicKey = new PublicKey(addressBytes);

            return {
              publicKey,
              address: publicKey.toString(),
              authToken: reauth.auth_token,
            };
          } catch (reauthError) {
            console.log('⚠️ Reauthorization failed, clearing stored credentials');
            await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            throw reauthError;
          }
        }

        // If no token or reauth failed, need manual connection
        throw new Error('Manual connection required');
      });

      // Update instance state
      this._publicKey = result.publicKey;
      this._address = result.address;
      this._authToken = result.authToken;

      // Update Redux
      store.dispatch(setConnected({
        address: result.address,
        authToken: result.authToken,
      }));

      console.log('✅ Reconnected to wallet:', result.address);
      return true;
    } catch (error) {
      console.log('❌ Reconnection failed:', error);
      store.dispatch(setConnecting(false));
      return false;
    }
  }

  /**
   * Sign an arbitrary message
   */
  async signMessage(message: string): Promise<string> {
    if (!this._publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('✍️ Signing message...');

      const result = await mwaTransact(async (wallet) => {
        // Use authorize instead of reauthorize for better compatibility
        let authResult;
        let needsTokenUpdate = false;

        try {
          // Try reauthorize first if we have a token
          if (this._authToken) {
            authResult = await wallet.reauthorize({
              auth_token: this._authToken,
              identity: {
                name: 'Yukti - Opinion Trading',
                uri: 'https://yukti.app',
                icon: 'favicon.ico',
              },
            });
          } else {
            throw new Error('No auth token, need fresh authorization');
          }
        } catch (reauthError) {
          console.log('Reauthorization failed, requesting fresh authorization...');
          // If reauthorize fails, do fresh authorization
          authResult = await wallet.authorize({
            cluster: 'devnet',
            identity: {
              name: 'Yukti - Opinion Trading',
              uri: 'https://yukti.app',
              icon: 'favicon.ico',
            },
          });
          // Flag that we need to update token
          needsTokenUpdate = true;
        }

        // Convert message to Uint8Array
        const messageBytes = new TextEncoder().encode(message);

        // Sign the message
        const signedMessages = await wallet.signMessages({
          addresses: [this._publicKey!.toBytes()],
          payloads: [messageBytes],
        });

        // signedMessages returns an array of Uint8Array signatures
        const signature = signedMessages[0];

        // Return signature and token update info
        return {
          signature: bs58.encode(signature),
          newToken: needsTokenUpdate ? authResult.auth_token : null,
        };
      });

      // Update auth token if needed (outside transact callback)
      if (result.newToken) {
        this._authToken = result.newToken;
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.newToken);
      }

      console.log('✅ Message signed successfully');
      return result.signature;
    } catch (error) {
      console.error('❌ Message signing failed:', error);
      throw error;
    }
  }

  /**
   * Sign a single transaction
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this._publicKey || !this._authToken) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('✍️ Signing transaction...');

      const result = await mwaTransact(async (wallet) => {
        // Reauthorize with the stored token
        await wallet.reauthorize({
          auth_token: this._authToken || '',
          identity: {
            name: 'Yukti - Opinion Trading',
            uri: 'https://yukti.app',
          },
        });

        // Sign the transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      console.log('✅ Transaction signed successfully');
      return result;
    } catch (error) {
      console.error('❌ Transaction signing failed:', error);
      throw error;
    }
  }

  /**
   * Sign and send a transaction to Solana
   */
  async signAndSendTransaction(transaction: Transaction): Promise<string> {
    if (!this._publicKey || !this._authToken) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🚀 Signing and sending transaction...');

      const result = await mwaTransact(async (wallet) => {
        // Reauthorize with the stored token
        await wallet.reauthorize({
          auth_token: this._authToken || '',
          identity: {
            name: 'Yukti - Opinion Trading',
            uri: 'https://yukti.app',
          },
        });

        // Sign and send the transaction
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signatures[0];
      });

      console.log('✅ Transaction sent successfully! Signature:', result);
      return result;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    if (!this._publicKey || !this._authToken) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`✍️ Signing ${transactions.length} transactions...`);

      const result = await mwaTransact(async (wallet) => {
        // Reauthorize with the stored token
        await wallet.reauthorize({
          auth_token: this._authToken || '',
          identity: {
            name: 'Yukti - Opinion Trading',
            uri: 'https://yukti.app',
          },
        });

        // Sign all transactions
        return await wallet.signTransactions({ transactions });
      });

      console.log('✅ All transactions signed successfully');
      return result;
    } catch (error) {
      console.error('❌ Batch signing failed:', error);
      throw error;
    }
  }

  /**
   * Update SOL balance in Redux
   */
  updateSolBalance(balance: number): void {
    store.dispatch(setSolBalance(balance));
  }
}

// Export singleton instance
export const mobileWalletAdapter = new MobileWalletAdapterImpl();

// Export for type safety
export default mobileWalletAdapter;
