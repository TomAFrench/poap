const ROUTES = {
  home: '/',
  scan: '/scan/:account',
  token: '/token/:tokenId',
  signerClaimPage: '/signer/claim/:event',
  codeClaimPageHash: '/claim/:hash',
  codeClaimPage: '/claim',
  events: '/admin/events',
  eventsNew: '/admin/events/new',
  event: '/admin/events/:eventId',
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
