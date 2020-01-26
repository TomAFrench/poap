import { Provider, InfuraProvider, JsonRpcProvider } from 'ethers/providers';
import { getDefaultProvider } from 'ethers';

export interface EnvVariables {
  provider: Provider;
  secretKey: string;
  infuraNet: string;
  providerStr: string;
}

function ensureEnvVariable(name: string): string {
  if (!process.env[name]) {
    console.error(`ENV variable ${name} is required`);
    process.exit(1);
  }
  return process.env[name]!;
}

export default function getEnv(): EnvVariables {
  let provider: Provider;
  let envProvider = ensureEnvVariable('PROVIDER');

  if (envProvider == 'infura') {
    const infuraNet = ensureEnvVariable('ETH_NETWORK');
    const infuraPK = ensureEnvVariable('INFURA_PK');
    provider = new InfuraProvider(infuraNet, infuraPK);

  } else if (envProvider == 'local') {
    provider = new JsonRpcProvider('http://localhost:7545');

  } else {
    const network = ensureEnvVariable('ETH_NETWORK');
    provider = getDefaultProvider(network);

  }

  return {
    provider,
    secretKey: ensureEnvVariable('SECRET_KEY'),
    infuraNet: ensureEnvVariable('ETH_NETWORK'),
    providerStr: ensureEnvVariable('PROVIDER')
  };
}
