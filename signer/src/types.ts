export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Address = string;

export interface Claim {
  eventAddress: Address;
  userAddress: Address;
  claimSignature: string
}

export interface ClaimReceipt {
  claim: Claim;
  receiptSignature: string;
}
