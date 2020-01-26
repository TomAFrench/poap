import { Wallet } from 'ethers';
import { verifyMessage } from 'ethers/utils';
import pino from 'pino';
import { Claim } from './types'

const Logger = pino()

export async function verifyClaim(claim: Claim): Promise<boolean> {

  Logger.info({ claim }, 'Claim for event: %d from: %s', claim.eventAddress, claim.userAddress);

  const claimerMessage = JSON.stringify([claim.eventAddress, claim.userAddress]);

  Logger.info({ claimerMessage }, 'claimerMessage');

  const supposedClaimedAddress = verifyMessage(claimerMessage, claim.claimSignature);

  // User has not signed this claim
  if (supposedClaimedAddress !== claim.userAddress) {
    console.log('invalid claimer signature');
    return false;
  }
  return true;
}

export async function signReceipt(signer: Wallet, claim: Claim): Promise<string> {
  const msg = JSON.stringify([claim.eventAddress, claim.userAddress, claim.claimSignature]);
  return signer.signMessage(msg);
}