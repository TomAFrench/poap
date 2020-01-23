const ROUTES = {
  home: '/',
  token: '/token/:tokenId',
  signerClaimPage: '/signer/claim/:event',
  codeClaimPageHash: '/claim/:hash',
  codeClaimPage: '/claim',
};

const TX_STATUS = {
  failed: 'failed',
  passed: 'passed',
  pending: 'pending',
};

const ETHERSCAN_URL = 'https://etherscan.io';

const etherscanLinks = {
  tx: (hash: string): string => `${ETHERSCAN_URL}/tx/${hash}`,
  address: (address: string): string => `${ETHERSCAN_URL}/address/${address}`,
};

export { ROUTES, TX_STATUS, etherscanLinks };
