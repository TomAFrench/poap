import { Contract, ContractTransaction, Wallet, getDefaultProvider, utils } from 'ethers';
import { verifyMessage } from 'ethers/utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import {
  getEvent,
  getEvents,
  getPoapSettingByName,
  saveTransaction,
  getSigner,
  getAvailableHelperSigners,
  getTransaction,
  updateTransactionStatus
} from './db';
import getEnv from './envs';
import { Poap } from './poap-eth/Poap';
import {
  Address,
  Claim,
  TokenInfo,
  Signer,
  TransactionStatus,
  OperationType,
} from './types';

const Logger = pino();
const ABI_DIR = join(__dirname, '../abi');

export function getABI(name: string) {
  return JSON.parse(readFileSync(join(ABI_DIR, `${name}.json`)).toString());
}

const ABI = getABI('Poap');

export function getContract(wallet: Wallet): Poap {
  const env = getEnv();
  return new Contract(env.poapAddress, ABI, wallet) as Poap;
}

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
      } else if(a.pending_tx > b.pending_tx){
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

/**
 * Estimate gas cost for mintTokenBatch() call.
 * We don't rely on estimateGas() since it fails.
 *
 * The estimated is based on empirical tests and it's
 * also +50% of the actual empirical estimate
 * @param n number of addresses
 */
export function estimateMintingGas(n: number) {
  const delta = 136907;
  const baseCost = 35708;
  return (baseCost + n * delta) * 1.5;
}

/**
 * Get current gas price from Poap Settings singleton
 */
export async function getCurrentGasPrice(address: string) {
  // Default gas price (to be used only when no gas-price configuration detected)
  let gasPrice = 5e9;

  // Get defined gasPrice for selected signer
  let signer: Signer | null = await getSigner(address);
  if (signer) {
    if (signer.gas_price) {
      return parseInt(signer.gas_price);
    }
  }

  // If signer was not defined, then get gas-price value from db Poap Setting variable
  let gasPriceSetting = await getPoapSettingByName('gas-price');
  if (gasPriceSetting) {
    gasPrice = parseInt(gasPriceSetting.value);
  }

  return gasPrice;
}

export async function getTxObj(onlyAdminSigner: boolean, extraParams?: any) {
  const env = getEnv();
  let estimate_mint_gas = 1;
  let signerWallet: Wallet;
  let gasPrice: number = 0;
  if (extraParams && extraParams.gas_price) {
    gasPrice = extraParams.gas_price
  }

  // Use extraParams signer if it's specified in extraParams 
  if (extraParams && extraParams.signer) {
    signerWallet = await getSignerWallet(extraParams.signer.toLowerCase());
  } else if (onlyAdminSigner) {
    signerWallet = env.poapAdmin;
  } else {
    const helperWallet = await getHelperSigner(gasPrice);
    signerWallet = helperWallet ? helperWallet : env.poapAdmin;
  }

  const contract = getContract(signerWallet);

  if(gasPrice == 0) {
    gasPrice = await getCurrentGasPrice(signerWallet.address);
  }

  if (extraParams && extraParams.estimate_mint_gas) {
    estimate_mint_gas = extraParams.estimate_mint_gas
  }

  const transactionParams: any = {
    gasLimit: estimateMintingGas(estimate_mint_gas),
    gasPrice: Number(gasPrice),
  };

  if (extraParams && extraParams.nonce) {
    transactionParams.nonce = extraParams.nonce;
  }

  return {
    signerWallet: signerWallet,
    contract: contract,
    transactionParams: transactionParams,
  };
  
}

export async function getAllTokens(address: Address): Promise<TokenInfo[]> {
  const events = await getEvents();

  const getEvent = (id: number) => {
    const ev = events.find(e => e.id === id);
    if (!ev) {
      throw new Error(`Invalid EventId: ${id}`);
    }
    return ev;
  };

  const env = getEnv();
  const contract = getContract(env.poapAdmin);
  const tokensAmount = (await contract.functions.balanceOf(address)).toNumber();

  const tokens: TokenInfo[] = [];
  for (let i = 0; i < tokensAmount; i++) {
    const { tokenId, eventId } = await contract.functions.tokenDetailsOfOwnerByIndex(address, i);
    tokens.push({
      event: getEvent(eventId.toNumber()),
      tokenId: tokenId.toString(),
      owner: address,
    });
  }
  return tokens;
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
  let response:string | null = null;
  try {
    response = await utils.getAddress(address);
  }
  catch(error) {
    try {
      response = await resolveName(address)
    }
    catch(error) {
      return response;
    }
  }
  return response;
}

export async function checkHasToken(event_id:number, address: string): Promise<boolean> {
  const all_tokens = await getAllTokens(address);
  let token = all_tokens.find(token => token.event.id === event_id);
  return !!token;
}
