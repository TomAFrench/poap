export type Address = string;
export interface PoapEvent {
  id: number;
  fancy_id: string;
  signer: Address;
  signer_ip: string;
  name: string;
  description: string;
  city: string;
  country: string;
  event_url: string;
  image_url: string;
  year: number;
  start_date: string;
  end_date: string;
}
export interface KickbackEvent {
  eventAddress: Address;
  signer: Address;
  signer_ip: string;
  name: string;
  event_url: string;
  image_url: string;
}

export interface Claim extends ClaimProof {
  claimerSignature: string;
}
export interface ClaimProof {
  claimId: string;
  eventAddress: Address;
  claimer: Address;
  proof: string;
}
export interface HashClaim {
  id: number;
  qr_hash: string;
  tx_hash: string;
  tx: Transaction;
  event_id: number;
  event: PoapEvent;
  beneficiary: Address;
  signer: Address;
  claimed: boolean;
  claimed_date: string;
  created_date: string;
  tx_status: string
  secret: string;
}
export interface AdminAddress {
  id: number;
  signer: Address;
  role: string;
  gas_price: string;
  balance: string;
  created_date: string;
  pending_tx: number;
}
export interface Transaction {
  id: number;
  tx_hash: string;
  nonce: number;
  operation: string;
  arguments: string;
  created_date: string;
  gas_price: string;
  signer: string;
  status: string;
}

export type ENSQueryResult = { valid: false } | { valid: true; address: string };

export type AddressQueryResult = { valid: false } | { valid: true; ens: string };

const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://api.poap.xyz';

async function fetchJson<A>(input: RequestInfo, init?: RequestInit): Promise<A> {
  const res = await fetch(input, init);
  if (res.ok) {
    return await res.json();
  } else {
    console.error(res);
    throw new Error(`Error with request statusCode: ${res.status}`);
  }
}

export function resolveENS(name: string): Promise<ENSQueryResult> {
  return fetchJson(`${API_BASE}/actions/ens_resolve?name=${encodeURIComponent(name)}`);
}

export function getENSFromAddress(address: Address): Promise<AddressQueryResult> {
  return fetchJson(`${API_BASE}/actions/ens_lookup/${address}`);
}

export async function getEvent(eventAddress: string): Promise<null | KickbackEvent> {
  return null //fetchJson(`${API_BASE}/events/${fancyId}`);
}

export async function claimToken(claim: Claim): Promise<void> {
  const res = await fetch(`${API_BASE}/actions/claim`, {
    method: 'POST',
    body: JSON.stringify(claim),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    console.error(res);
    throw new Error(`Error with request statusCode: ${res.status}`);
  }
}

export async function checkSigner(signerIp: string, eventAddress: Address): Promise<boolean> {
  try {
    const res = await fetch(`${signerIp}/check`);
    if (!res.ok) {
      return false;
    }
    const body = await res.json();
    return body.eventAddress === eventAddress;
  } catch (err) {
    return false;
  }
}

export async function requestProof(
  signerIp: string,
  eventAddress: Address,
  claimer: string
): Promise<ClaimProof> {
  return fetchJson(`${signerIp}/api/proof`, {
    method: 'POST',
    body: JSON.stringify({ eventAddress, claimer }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getSigners(): Promise<AdminAddress[]> {
  return fetchJson(`${API_BASE}/signers`);
}

// export async function getClaimHash(hash: string): Promise<HashClaim> {
//   return fetchJson(`${API_BASE}/actions/claim-qr?qr_hash=${hash}`);
// }

// export async function postClaimHash(qr_hash: string, address: string, secret: string): Promise<HashClaim> {
//   return fetchJson(`${API_BASE}/actions/claim-qr`, {
//     method: 'POST',
//     body: JSON.stringify({ qr_hash, address, secret }),
//     headers: { 'Content-Type': 'application/json' },
//   });
// }