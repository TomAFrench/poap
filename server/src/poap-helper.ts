import { Contract, Wallet, getDefaultProvider, utils } from 'ethers';
import { verifyMessage } from 'ethers/utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import {
  getEvent,
  getSigner,
  getAvailableHelperSigners,
} from './db';
import getEnv from './envs';
import {
  Address,
  Claim,
  Signer,
} from './types';

const Logger = pino();
const ABI_DIR = join(__dirname, '../abi');

export function getABI(name: string) {
  return JSON.parse(readFileSync(join(ABI_DIR, `${name}.json`)).toString());
}

const ABI = getABI('Poap');

// export function getContract(wallet: Wallet): Poap {
//   const env = getEnv();
//   return new Contract(env.poapAddress, ABI, wallet) as Poap;
// }

/**
 * Get an available helper signer in order to sign a new requested transaction
 */
export async function getHelperSigner(requiredBalance: number = 0): Promise<null | Wallet> {
  const env = getEnv();
  let signers: null | Signer[] = await getAvailableHelperSigners();

  let wallet: null | Wallet = null;

  if (signers) {
    signers = await Promise.all(signers.map(signer => getAddressBalance(signer)));
    let sorted_signers: Signer[] = signers.sort((a, b) => {
      if (a.pending_tx === b.pending_tx) {
        return (parseInt(b.balance) - parseInt(a.balance));
      } else if (a.pending_tx > b.pending_tx) {
        return 1;
      }
      return -1;
    });

    for (let signer of sorted_signers) {
      if (!wallet) {
        console.log('signerWithBalance: ', signer);
        if (+signer.balance > requiredBalance) {
          wallet = env.poapHelpers[signer.signer.toLowerCase()];
        }
      }
    }
  }
  return wallet;
}

/**
 * Get an available helper signer in order to sign a new requested transaction
 */
export async function getSignerWallet(address: Address): Promise<Wallet> {
  const env = getEnv();
  const signer: null | Signer = await getSigner(address);
  if (signer) {
    const wallet = env.poapHelpers[signer.signer.toLowerCase()];
    return wallet;
  }
  throw new Error('Signer was not found');
}

export async function verifyClaim(claim: Claim): Promise<string | boolean> {
  const event = await getEvent(claim.eventId);

  if (!event) {
    throw new Error('Invalid Event Id');
  }

  Logger.info({ claim }, 'Claim for event: %d from: %s', claim.eventId, claim.claimer);

  const claimerMessage = JSON.stringify([claim.claimId, claim.eventId, claim.claimer, claim.proof]);

  Logger.info({ claimerMessage }, 'claimerMessage');

  const supposedClaimedAddress = verifyMessage(claimerMessage, claim.claimerSignature);

  if (supposedClaimedAddress !== claim.claimer) {
    console.log('invalid claimer signature');
    return false;
  }

  const proofMessage = JSON.stringify([claim.claimId, claim.eventId, claim.claimer]);
  Logger.info({ proofMessage }, 'proofMessage');
  const signerAddress = verifyMessage(proofMessage, claim.proof);

  if (signerAddress !== event.signer) {
    console.log('invalid signer signature');
    return false;
  }

  return true;
}

export async function getAddressBalance(signer: Signer): Promise<Signer> {
  let provider = getDefaultProvider();
  let balance = await provider.getBalance(signer.signer);

  signer.balance = balance.toString();

  return signer;
}

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