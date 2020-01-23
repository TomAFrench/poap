import { Wallet, getDefaultProvider, utils } from 'ethers';
import { verifyMessage } from 'ethers/utils';
import pino from 'pino';
import {
  getSigner,
} from './db';
import getEnv from './envs';
import {
  Address,
  Signer,
} from './types';

// const Logger = pino();

/**
 * Get an available helper signer in order to sign a new requested transaction
 */
// export async function getSignerWallet(address: Address): Promise<Wallet> {
//   const env = getEnv();
//   const signer: null | Signer = await getSigner(address);
//   if (signer) {
//     const wallet = env.poapHelpers[signer.signer.toLowerCase()];
//     return wallet;
//   }
//   throw new Error('Signer was not found');
// }

// export async function verifyClaim(claim: Claim): Promise<string | boolean> {
//   const event = await getEvent(claim.eventId);

//   if (!event) {
//     throw new Error('Invalid Event Id');
//   }

//   Logger.info({ claim }, 'Claim for event: %d from: %s', claim.eventId, claim.claimer);

//   const claimerMessage = JSON.stringify([claim.claimId, claim.eventId, claim.claimer, claim.proof]);

//   Logger.info({ claimerMessage }, 'claimerMessage');

//   const supposedClaimedAddress = verifyMessage(claimerMessage, claim.claimerSignature);

//   if (supposedClaimedAddress !== claim.claimer) {
//     console.log('invalid claimer signature');
//     return false;
//   }

//   const proofMessage = JSON.stringify([claim.claimId, claim.eventId, claim.claimer]);
//   Logger.info({ proofMessage }, 'proofMessage');
//   const signerAddress = verifyMessage(proofMessage, claim.proof);

//   if (signerAddress !== event.signer) {
//     console.log('invalid signer signature');
//     return false;
//   }

//   return true;
// }

export async function resolveName(name: string): Promise<string> {
  const mainnetProvider = getDefaultProvider('homestead');
  const resolvedAddress = await mainnetProvider.resolveName(name);
  return resolvedAddress
}

export async function lookupAddress(address: string): Promise<string> {
  const mainnetProvider = getDefaultProvider('homestead');
  const resolved = await mainnetProvider.lookupAddress(address);
  return resolved
}

export async function checkAddress(address: string): Promise<string | null> {
  let response: string | null = null;
  try {
    response = await utils.getAddress(address);
  }
  catch (error) {
    try {
      response = await resolveName(address)
    }
    catch (error) {
      return response;
    }
  }
  return response;
}