#!/usr/bin/env node
import commander from 'commander';
import { Wallet } from 'ethers';
import fastifyFactory from 'fastify';
// @ts-ignore
import fastifyCompress from 'fastify-compress';
import fastifyCors from 'fastify-cors';
import fastifyHelmet from 'fastify-helmet';
import createError from 'http-errors';

import { isAdmin } from './api'
import { verifyClaim, signReceipt } from './verify_proof';
import { ClaimReceipt, Claim } from './types';

const program = commander
  .option('-g --genkeys', 'Generate Address/Private key pair')
  .option('-p --port <number>', 'Port to listen to', v => parseInt(v), 8080)
  .option('-e --event <address>', 'Event Address for signing')
  .option('-k --sk <privatekey>', 'Private Key for signing')
  .parse(process.argv);

if (program.genkeys) {
  const w = Wallet.createRandom();
  console.log('Generating Signer Address & Private Key');
  console.log(`Address: ${w.address}`);
  console.log(`Private Key: ${w.privateKey}`);

  console.log('Now call poap-signer using the private key');
  console.log(`  poap-signer --sk ${w.privateKey} ...`);
  console.log('Remember to save the address in POAP Backofice');
  process.exit(0);
}

if (!program.event) {
  console.error('event is Required');
  program.help();
}
if (!program.sk) {
  console.error('privateKey is Required');
  program.help();
}

if (program.sk.length != 66 || !program.sk.match(/^0x[a-f0-9]{64}$/i)) {
  console.error('Invalid privateKey. It should be an hexstring 66 long.');
  program.help();
}

const signerWallet = new Wallet(program.sk);

const fastify = fastifyFactory({
  logger: {
    prettyPrint: true,
  },
});

fastify.register(fastifyHelmet, {
  hidePoweredBy: true,
});

fastify.register(fastifyCors, {});
fastify.register(fastifyCompress, {});

fastify.get('/check', async (req, res) => {
  return {
    eventAddress: program.event,
  };
});

const claimObject = {
  type: 'object',
  required: ['eventAddress', 'userAddress', 'claimSignature'],
  properties: {
    eventAddress: {
      type: 'string',
      minLength: 42,
      maxLength: 42,
      pattern: '^0x[0-9a-fA-F]{40}$',
    },
    userAddress: {
      type: 'string',
      minLength: 42,
      maxLength: 42,
      pattern: '^0x[0-9a-fA-F]{40}$',
    },
    claimSignature: {
      type: 'string',
    },
  }
}


fastify.post(
  '/api/proof',
  {
    schema: {
      body: claimObject,
      response: {
        type: 'object',
        properties: {
          claim: claimObject,
          receiptSignature: {
            type: 'string',
          },
        },
      },
    },
  },
  async req => {
    const { eventAddress, userAddress, claimSignature }: { eventAddress: string; userAddress: string; claimSignature: string } = req.body;
    const claim: Claim = { eventAddress, userAddress, claimSignature }

    //TODO: Check that userAddress is registered for the event.

    if (eventAddress != program.event) {
      return new createError.BadRequest('Invalid EventId');
    }

    const userSignedClaim: Boolean = await verifyClaim(claim)
    if (!userSignedClaim) {
      return new createError.BadRequest('Invalid Signature');
    }

    const receiptSignature: string = await signReceipt(signerWallet, claim)
    const receipt: ClaimReceipt = { claim, receiptSignature }

    // TODO: Push receipt to server

    // Return receipt to user for verification
    return receipt
  }
);

const start = async () => {
  console.log(`POAP Signer Started (v1.1):`);
  console.log(`Event Address: ${program.event}`);

  const admin: Boolean = await isAdmin(program.event, signerWallet.address)
  if (!admin) {
    console.log("This private key is not listed as an admin of this event!")
    console.log(`Please add ${signerWallet.address} as an admin on kickback.events`)
  }

  try {
    await fastify.listen(program.port, '0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
