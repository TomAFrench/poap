export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Address = string;

export interface Claim {
  readonly eventAddress: Address;
  readonly userAddress: Address;
  readonly claimSignature: string
}

export interface ClaimReceipt {
  readonly claim: Claim;
  readonly receiptSignature: string;
}
