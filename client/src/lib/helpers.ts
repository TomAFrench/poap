import { getAddress } from 'ethers/utils';

function isValidAddress(str: string): boolean {
  try {
    getAddress(str);
    return true;
  } catch (error) {
    return false;
  }
}

const reduceAddress = (address: string) => {
  if (address.length < 10) return address
  return address.slice(0, 6) + '\u2026' + address.slice(-4)
};

export { isValidAddress, reduceAddress };
