import pgPromise from 'pg-promise';
import { Signer, ClaimQR } from '../types';

const db = pgPromise()({
  host: process.env.INSTANCE_CONNECTION_NAME ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` : 'localhost',
  user: process.env.SQL_USER || 'poap',
  password: process.env.SQL_PASSWORD || 'poap',
  database: process.env.SQL_DATABASE || 'poap_dev',
});

export async function getSigners(): Promise<Signer[]> {
  const res = await db.manyOrNone<Signer>('SELECT * FROM signers ORDER BY id ASC');
  return res;
}

export async function getSigner(address: string): Promise<null | Signer> {
  const res = await db.oneOrNone<Signer>('SELECT * FROM signers WHERE signer ILIKE $1', [address]);
  return res;
}

export async function getQrClaim(qr_hash: string): Promise<null | ClaimQR> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash=${qr_hash} AND is_active = true', { qr_hash });
  return res;
}

export async function checkDualQrClaim(event_id: number, address: string): Promise<boolean> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE event_id = ${event_id} AND beneficiary = ${address} AND is_active = true', {
    event_id,
    address
  });
  return res === null;
}

export async function adQrClaim(qr_hash: string): Promise<null | ClaimQR> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash = $1 AND is_active = true', [qr_hash]);
  return res;
}

export async function claimQrClaim(qr_hash: string) {
  const res = await db.result('update qr_claims set claimed=true, claimed_date=current_timestamp where qr_hash = $1', [qr_hash]);
  return res.rowCount === 1;
}
