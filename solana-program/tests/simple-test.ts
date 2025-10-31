import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assert } from 'chai';

describe('Opinion Trading - Simple Test', () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get program from workspace using snake_case name
  const program = anchor.workspace.opinion_trading as Program<any>;

  console.log('Program ID:', program.programId.toBase58());

  it('Program ID is correct', () => {
    const expectedProgramId = '9SnL46YupFNsVbADtzYoD19apXQcvDhveWg6rWQEWgFr';
    assert.equal(
      program.programId.toBase58(),
      expectedProgramId,
      'Program ID should match'
    );
  });

  it('Can fetch program account', async () => {
    const programAccount = await provider.connection.getAccountInfo(program.programId);
    assert.isNotNull(programAccount, 'Program account should exist');
    assert.isTrue(programAccount!.executable, 'Program account should be executable');
  });
});
