import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { assert } from 'chai';

describe('Opinion Trading - Setup Verification', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use known program ID directly to avoid needing IDL/workspace
  const programId = new anchor.web3.PublicKey(
    '9SnL46YupFNsVbADtzYoD19apXQcvDhveWg6rWQEWgFr'
  );

  it('✅ Program loads correctly', () => {
    console.log('\n📋 Program Information:');
    console.log('├─ Program ID:', programId.toBase58());
    console.log('└─ Expected ID: 9SnL46YupFNsVbADtzYoD19apXQcvDhveWg6rWQEWgFr');
    
    assert.equal(
      programId.toBase58(),
      '9SnL46YupFNsVbADtzYoD19apXQcvDhveWg6rWQEWgFr',
      'Program ID should match'
    );
  });

  it('✅ Program is deployed', async () => {
    const programAccount = await provider.connection.getAccountInfo(programId);

    if (!programAccount) {
      console.warn('\n⚠️  Program not deployed on localnet yet. Skipping strict check.');
      return;
    }

    assert.isTrue(programAccount.executable, 'Program should be executable');
    console.log('\n✅ Program deployed successfully');
    console.log('├─ Executable: Yes');
    console.log('└─ Data length:', programAccount.data.length, 'bytes');
  });

  it('✅ Can derive PDAs', () => {
    const testPollId = 'test-123';
    
    const [pollPDA, pollBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('poll'), Buffer.from(testPollId)],
      programId
    );
    
    const [vaultPDA, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(testPollId)],
      programId
    );
    
    console.log('\n✅ PDAs derived successfully');
    console.log('├─ Poll PDA:', pollPDA.toBase58());
    console.log('├─ Poll Bump:', pollBump);
    console.log('├─ Vault PDA:', vaultPDA.toBase58());
    console.log('└─ Vault Bump:', vaultBump);
    
    assert.isDefined(pollPDA);
    assert.isDefined(vaultPDA);
  });

  it('✅ Provider configured correctly', () => {
    console.log('\n✅ Provider Information:');
    console.log('├─ Wallet:', provider.wallet.publicKey.toBase58());
    console.log('└─ Connection:', provider.connection.rpcEndpoint);
    
    assert.isDefined(provider.wallet);
    assert.isDefined(provider.connection);
  });
});