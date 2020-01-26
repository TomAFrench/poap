#!/usr/bin/env node
import commander from 'commander';
import { Wallet } from 'ethers';
import fastifyFactory from 'fastify';
// @ts-ignore
import fastifyCompress from 'fastify-compress';
import fastifyCors from 'fastify-cors';
import fastifyHelmet from 'fastify-helmet';
import createError from 'http-errors';

import { extractUsersWithGivenEventRole, ROLE } from '@wearekickback/shared'

import { verifyClaim, signReceipt } from './verify_proof';
import { Address, ClaimReceipt, Claim } from './types';
import { getParty } from './api';


const axios = require('axios');

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
  console.log('Remember to add the address as an admin to the event on kickback.events');
  process.exit(0);
}

if (!program.event) {
  console.error('Address is Required');
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

fastify.addSchema({
  $id: 'address',
  type: 'string',
  minLength: 42,
  maxLength: 42,
  pattern: '^0x[0-9a-fA-F]{40}$',
});


fastify.addSchema({
  $id: 'signature',
  type: 'string',
  minLength: 132,
  maxLength: 132,
  pattern: '^0x[0-9a-fA-F]{130}$',
});


fastify.addSchema({
  $id: 'claim',
  type: 'object',
  required: ['eventAddress', 'userAddress', 'claimSignature'],
  properties: {
    eventAddress: 'address#',
    userAddress: 'address#',
    claimSignature: 'signature#',

  }
});

fastify.addSchema({
  $id: 'receipt',
  type: 'object',
  required: ['claim', 'receiptSignature'],
  properties: {
    claim: 'claim#',
    receiptSignature: 'signature#'
  }
});

fastify.get('/event', async (req, res) => {
  return {
    eventAddress: program.event,
  };
});

fastify.post(
  '/api/checkin',
  {
    schema: {
      body: 'claim#',
      response: {
        200: 'receipt#',
      }
    },
  },
  async (req, reply) => {
    console.log(req.body)
    const claim: Claim = req.body

    if (claim.eventAddress != program.event) {
      return new createError.BadRequest('Invalid eventAddress');
    }

    const userRegistered = isRegistered(claim.userAddress)
    if (!userRegistered) {
      return new createError.BadRequest('Invalid userAddress');
    }

    const userSignedClaim: Boolean = await verifyClaim(claim)
    if (!userSignedClaim) {
      return new createError.BadRequest('Invalid Signature')
    }

    const receiptSignature: string = await signReceipt(signerWallet, claim)
    const receipt: ClaimReceipt = { claim, receiptSignature }

    try {
      await axios.post('http://localhost:8081/actions/claim', receipt)
      // Return receipt to user for verification
      return receipt
    } catch (err) {
      // Alert user to the fact that receipt hasn't been recorded
      // TODO: Locally save a copy of the receipt.
      return new createError.InternalServerError('Couldn\'t upload receipt')
    }


  }
);

let party: any = {}
let participants: Array<Address> = []
let admins: Array<Address> = []

function isRegistered(address: Address) {
  return participants.includes(address.toLowerCase())
}

function isAdmin(address: Address) {
  return admins.includes(address.toLowerCase())
}

const start = async () => {
  console.log(`Kickback Signer Started (v1.1):`);
  console.log(`Event Address: ${program.event}`);

  // Caches a copy of the event info to quickly verify user addresses
  party = await getParty(program.event)
  participants = party.participants.map(({ user }: { user: { address: Address } }) => user.address)
  admins = extractUsersWithGivenEventRole(party, ROLE.EVENT_ADMIN).map(({ address }: { address: Address }) => address)


  if (!isAdmin(signerWallet.address)) {
    console.log("This private key is not listed as an admin of this event!")
    console.log(`Please add ${signerWallet.address} as an admin on kickback.events`)
    process.exit(1);
  }
  console.log(`Admin Account: ${signerWallet.address}`);

  try {
    console.log()
    console.log(`Ready to take check-ins for ${party.name}`)
    await fastify.listen(program.port, '0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
