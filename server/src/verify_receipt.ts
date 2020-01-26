import { verifyMessage } from 'ethers/utils';
import pino from 'pino';
import { Claim, ClaimReceipt } from './types'

import { isAdmin, isRegistered } from './api'
const Logger = pino()

export async function verifyReceipt(receipt: ClaimReceipt): Promise<boolean> {

  // Need to check that the receipt is correctly signed by event admin
  const receiptIsSigned = await verifyReceiptSignature(receipt)

  if (receiptIsSigned) {
    // and also that the claim itself is valid (ie. is from a registered user)
    const validClaim = await verifyClaim(receipt.claim)
    if (validClaim) {
      return true
    }
  }
  return false;
}


export async function verifyReceiptSignature(receipt: ClaimReceipt): Promise<boolean> {

  const { claim }: { claim: Claim } = receipt

  const receiptMessage = JSON.stringify([claim.eventAddress, claim.userAddress])

  const supposedAdminAddress = verifyMessage(receiptMessage, receipt.receiptSignature);

  const admin = isAdmin(claim.eventAddress, supposedAdminAddress)
  if (!admin) {
    console.log('invalid admin signature');
    return false;
  }
  return true;
}


export async function verifyClaim(claim: Claim): Promise<boolean> {

  // TODO: check that userAddress is registered for eventAddress
  const isParticipant = isRegistered(claim.eventAddress, claim.userAddress)
  if (!isParticipant) {
    console.log(`user isn't registered`);
    return false;
  }

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