import { format } from 'date-fns';
import pgPromise from 'pg-promise';
import { PoapEvent, Signer, Address, ClaimQR } from '../types';

const db = pgPromise()({
  host: process.env.INSTANCE_CONNECTION_NAME ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` : 'localhost',
  user: process.env.SQL_USER || 'poap',
  password: process.env.SQL_PASSWORD || 'poap',
  database: process.env.SQL_DATABASE || 'poap_dev',
});

function replaceDates(event: PoapEvent): PoapEvent {
  event.start_date = format(new Date(event.start_date), 'MM/DD/YYYY');
  event.end_date = format(new Date(event.end_date), 'MM/DD/YYYY');
  return event;
}

export async function getEvents(): Promise<PoapEvent[]> {
  const res = await db.manyOrNone<PoapEvent>('SELECT * FROM events ORDER BY start_date DESC');

  return res.map(replaceDates);
}

export async function getSigners(): Promise<Signer[]> {
  const res = await db.manyOrNone<Signer>('SELECT * FROM signers ORDER BY id ASC');
  return res;
}

export async function getSigner(address: string): Promise<null | Signer> {
  const res = await db.oneOrNone<Signer>('SELECT * FROM signers WHERE signer ILIKE $1', [address]);
  return res;
}

export async function getAvailableHelperSigners(): Promise<null | Signer[]> {
  const res = await db.manyOrNone(`
    SELECT s.id, s.signer, SUM(case when st.status = 'pending' then 1 else 0 end) as pending_txs
    FROM signers s LEFT JOIN server_transactions st on s.signer = st.signer
    WHERE s.role != 'administrator'
    GROUP BY s.id, s.signer
    ORDER BY pending_txs, s.id ASC
  `);
  return res;
}

export async function getEvent(id: number): Promise<null | PoapEvent> {
  const res = await db.oneOrNone<PoapEvent>('SELECT * FROM events WHERE id = $1', [id]);
  return res ? replaceDates(res) : res;
}

export async function getEventByFancyId(fancyid: string): Promise<null | PoapEvent> {
  const res = await db.oneOrNone<PoapEvent>('SELECT * FROM events WHERE fancy_id = $1', [fancyid]);
  return res ? replaceDates(res) : res;
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
