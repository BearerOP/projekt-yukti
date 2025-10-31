/**
 * Initialize a poll on-chain using the deployed program
 */
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import { OpinionTrading } from '../target/types/opinion_trading';

const POLL_ID = 'f1095803003c4cc88470bd8f0ca50e6f'; // Without hyphens
const POLL_TITLE = 'Will Tommorow be raining??';
const OPTION_A = 'Yes';
const OPTION_B = 'No';
const END_TIMESTAMP = Math.floor(new Date('2025-10-31T23:58:22.466Z').getTime() / 1000);

async function main() {
  console.log('🚀 Initializing poll on-chain...\n');

  // Setup connection
  const connection = new anchor.web3.Connection('http://127.0.0.1:8899', 'confirmed');

  // Load admin keypair
  const adminKeypairData = JSON.parse(fs.readFileSync('./admin-keypair.json', 'utf-8'));
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(adminKeypairData));

  console.log('Admin Public Key:', adminKeypair.publicKey.toBase58());

  // Setup provider
  const wallet = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);

  // Load program
  const programId = new PublicKey('3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C');
  const idl = JSON.parse(fs.readFileSync('./target/idl/opinion_trading.json', 'utf-8'));
  const program = new Program(idl, provider) as Program<OpinionTrading>;

  // Derive PDAs
  const [pollPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('poll'), Buffer.from(POLL_ID)],
    programId
  );

  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), Buffer.from(POLL_ID)],
    programId
  );

  console.log('Poll PDA:', pollPDA.toBase58());
  console.log('Vault PDA:', vaultPDA.toBase58());
  console.log('');

  try {
    console.log('📝 Creating poll on-chain...');

    const tx = await (program.methods as any)
      .initializePoll(
        POLL_ID,
        POLL_TITLE,
        OPTION_A,
        OPTION_B,
        new anchor.BN(END_TIMESTAMP)
      )
      .accountsStrict({
        poll: pollPDA,
        vault: vaultPDA,
        authority: adminKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Poll initialized on-chain!');
    console.log('Transaction Signature:', tx);
    console.log('');
    console.log('🎉 SUCCESS! The poll is now fully on-chain and ready for bids!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Open your mobile app');
    console.log('2. Find the poll: "Will Tommorow be raining??"');
    console.log('3. Place a bid (e.g., 0.1 SOL)');
    console.log('4. Phantom will open for approval');
    console.log('5. Sign the transaction');
    console.log('6. Your bid amount will be transferred to the escrow vault!');
    console.log('');
    console.log('Verify escrow vault after bidding:');
    console.log(`solana balance ${vaultPDA.toBase58()} --url http://127.0.0.1:8899`);

  } catch (error: any) {
    console.error('❌ Error initializing poll:', error);

    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error(log));
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
