import { FastifyInstance } from 'fastify';
import createError from 'http-errors';
import {
  getEvent,
  getEventByFancyId,
  getEvents,
  getPoapSettingByName,
  getPoapSettings,
  updatePoapSettingByName,
  getTransactions,
  getTotalTransactions,
  getSigners,
  updateSignerGasPrice,
  getQrClaim,
  getTransaction,
  claimQrClaim,
  updateQrClaim,
  checkDualQrClaim,
  getPendingTxsAmount,
  unclaimQrClaim
} from './db';

import {
  getAllTokens,
  verifyClaim,
  getAddressBalance,
  resolveName,
  lookupAddress,
  checkAddress,
  checkHasToken,
} from './poap-helper';

import { Claim, PoapEvent, TransactionStatus } from './types';
import crypto from 'crypto';
import getEnv from './envs';

function sleep(ms: number){
  return new Promise(resolve=>{
      setTimeout(resolve,ms)
  })
}

function buildMetadataJson(tokenUrl: string, ev: PoapEvent) {
  return {
    description: ev.description,
    external_url: tokenUrl,
    home_url: tokenUrl,
    image: ev.image_url,
    image_url: ev.image_url,
    name: ev.name,
    year: ev.year,
    tags: ['poap', 'event'],
    attributes: [
      {
        trait_type: 'startDate',
        value: ev.start_date,
      },
      {
        trait_type: 'endDate',
        value: ev.end_date,
      },
      {
        trait_type: 'city',
        value: ev.city,
      },
      {
        trait_type: 'country',
        value: ev.country,
      },
      {
        trait_type: 'eventURL',
        value: ev.event_url,
      },
    ],
    properties: [],
  };
}

export default async function routes(fastify: FastifyInstance) {
  fastify.addSchema({
    $id: 'address',
    type: 'string',
    minLength: 42,
    maxLength: 42,
    pattern: '^0x[0-9a-fA-F]{40}$',
  });

  fastify.addSchema({
    $id: 'signature',
    type: 'string',
    minLength: 132,
    maxLength: 132,
    pattern: '^0x[0-9a-fA-F]{130}$',
  });

  fastify.get('/metadata/:eventId/:tokenId', async (req, res) => {
    const event = await getEvent(parseInt(req.params.eventId));
    if (!event) {
      throw new createError.NotFound('Invalid Event');
    }
    const tokenUrl = `https://api.poap.xyz/metadata/${req.params.eventId}/${req.params.tokenId}`;
    return buildMetadataJson(tokenUrl, event);
  });

  //********************************************************************
  // ACTIONS
  //********************************************************************

  fastify.get(
    '/actions/ens_resolve',
    {
      schema: {
        querystring: {
          name: { type: 'string' },
        },
      },
    },
    async (req, res) => {
      if (req.query['name'] == null || req.query['name'] == '') {
        throw new createError.BadRequest('"name" query parameter is required');
      }
      const resolvedAddress = await resolveName(req.query['name']);

      if (resolvedAddress == null) {
        return {
          valid: false,
        };
      } else {
        return {
          valid: true,
          address: resolvedAddress,
        };
      }
    }
  );

  fastify.get(
    '/actions/ens_lookup/:address',
    {
      schema: {
        params: {
          address: {
            type: 'string',
          },
        },
      },
    },
    async (req, res) => {
      const address = req.params.address;

      if (address == null || address == '') {
        throw new createError.BadRequest('"address" query parameter is required');
      }

      const resolved = await lookupAddress(address);

      if (resolved == null) {
        return {
          valid: false,
        };
      } else {
        return {
          valid: true,
          ens: resolved,
        };
      }
    }
  );

  fastify.post(
    '/actions/claim',
    {
      schema: {
        body: {
          type: 'object',
          required: ['claimId', 'eventId', 'proof', 'claimer', 'claimerSignature'],
          properties: {
            claimId: { type: 'string' },
            eventId: { type: 'integer', minimum: 1 },
            proof: 'signature#',
            claimer: 'address#',
            claimerSignature: 'signature#',
          },
        },
      },
    },
    async (req, res) => {
      const claim: Claim = req.body;
      const isValid = await verifyClaim(claim);
      if (isValid) {
        //mark attended
        //await mintToken(claim.eventId, claim.claimer);
        res.status(204);
      } else {
        throw new createError.BadRequest('Invalid Claim');
      }
    }
  );

  fastify.get(
    '/actions/claim-qr',
    {
      schema: {
        querystring: {
          qr_hash: { type: 'string' },
        },
      }
    },
    async (req, res) => {
      const qr_hash = req.query.qr_hash || '';

      if (!qr_hash) {
        return new createError.NotFound('Please send qr_hash as querystring parameter');
      }

      const qr_claim = await getQrClaim(qr_hash);
      if (!qr_claim) {
        await sleep(1000);
        return new createError.NotFound('Qr Claim not found');
      }

      const event = await getEvent(qr_claim.event_id);
      if (!event) {
        return new createError.InternalServerError('Qr Claim does not have any event');
      }
      qr_claim.event = event;

      const env = getEnv();
      qr_claim.secret = crypto.createHmac('sha256', env.secretKey).update(qr_hash).digest('hex');

      qr_claim.tx_status = null;
      if (qr_claim.tx_hash) {
        const transaction_status = await getTransaction(qr_claim.tx_hash);
        if(transaction_status) {
          qr_claim.tx_status = transaction_status.status;
        }
      }

      return qr_claim
    }
  );

  fastify.post(
    '/actions/claim-qr',
    {
      schema: {
        body: {
          type: 'object',
          required: ['address', 'qr_hash', 'secret'],
        },
      },
    },
    async (req, res) => {
      const env = getEnv();
      const secret = crypto.createHmac('sha256', env.secretKey).update(req.body.qr_hash).digest('hex');

      if(req.body.secret != secret) {
        await sleep(1000)
        return new createError.NotFound('Invalid secret');
      }

      const qr_claim = await getQrClaim(req.body.qr_hash);
      if (!qr_claim) {
        await sleep(1000)
        return new createError.NotFound('Qr Claim not found');
      }

      if (qr_claim.claimed) {
        return new createError.BadRequest('Qr is already Claimed');
      }

      let claim_qr_claim = await claimQrClaim(req.body.qr_hash);
      if (!claim_qr_claim) {
        return new createError.InternalServerError('There was a problem updating claim boolean');
      }
      qr_claim.claimed = true

      const event = await getEvent(qr_claim.event_id);
      if (!event) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.InternalServerError('Qr Claim does not have any event');
      }
      qr_claim.event = event

      const parsed_address = await checkAddress(req.body.address);
      if (!parsed_address) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.BadRequest('Address is not valid');
      }

      const dual_qr_claim = await checkDualQrClaim(qr_claim.event.id, parsed_address);
      if (!dual_qr_claim) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.BadRequest('Address already has this claim');
      }

      const has_token = await checkHasToken(qr_claim.event.id, parsed_address);
      if (has_token) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.BadRequest('Address already has this claim');
      }

      const tx_mint = await mintToken(qr_claim.event.id, parsed_address, false);
      if (!tx_mint || !tx_mint.hash) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.InternalServerError('There was a problem in token mint');
      }

      let set_qr_claim_hash = await updateQrClaim(req.body.qr_hash, parsed_address, tx_mint);
      if (!set_qr_claim_hash) {
        return new createError.InternalServerError('There was a problem saving tx_hash');
      }

      qr_claim.tx_hash = tx_mint.hash
      qr_claim.beneficiary = parsed_address
      qr_claim.signer = tx_mint.from
      qr_claim.tx_status = null

      if (qr_claim.tx_hash) {
        const transaction_status = await getTransaction(qr_claim.tx_hash);
        if(transaction_status) {
          qr_claim.tx_status = transaction_status.status
        }

      }

      return qr_claim
    }
  );

  //********************************************************************
  // SETTINGS
  //********************************************************************

  fastify.get('/settings', () => getPoapSettings());

  fastify.get(
    '/settings/:name',
    {
      schema: {
        params: {
          name: { type: 'string' },
        },
      },
    },
    async (req, res) => {
      const value = await getPoapSettingByName(req.params.name);
      if (!value) {
        return new createError.NotFound('poap setting variable not found');
      }
      return value;
    }
  );

  // TODO Update this endpoint to use value as body parameter
  fastify.put(
    '/settings/:name/:value',
    {
      preValidation: [fastify.authenticate],
      schema: {
        params: {
          name: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    async (req, res) => {
      // Verify that setting variable exist
      const setting_type = await getPoapSettingByName(req.params.name);
      if (!setting_type) {
        return new createError.BadRequest('unsuccessful operation');
      }

      const isOk = await updatePoapSettingByName(
        req.params.name,
        setting_type['type'],
        req.params.value
      );
      if (!isOk) {
        return new createError.BadRequest('unsuccessful operation');
      }

      res.status(204);
      return;
    }
  );

  //********************************************************************
  // EVENTS
  //********************************************************************

  fastify.get('/events', () => getEvents());

  fastify.get(
    '/events/:fancyid',
    {
      schema: {
        params: {
          fancyid: { type: 'string' },
        },
      },
    },
    async (req, res) => {
      const event = await getEventByFancyId(req.params.fancyid);
      if (!event) {
        return new createError.NotFound('Invalid Event');
      }
      return event;
    }
  );

  //********************************************************************
  // TRANSACTIONS
  //********************************************************************

  fastify.get(
    '/transactions',
    {
      preValidation: [fastify.authenticate],
      schema: {
        querystring: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    async (req, res) => {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      let status = req.query.status || null;
      if (status) {
        status = status.split(',');
      } else {
        status = [TransactionStatus.failed, TransactionStatus.passed, TransactionStatus.pending];
      }

      const transactions = await getTransactions(limit, offset, status);
      const totalTransactions = await getTotalTransactions(status);

      if (!transactions) {
        return new createError.NotFound('Transactions not found');
      }
      return {
        limit: limit,
        offset: offset,
        total: totalTransactions,
        transactions: transactions,
      };
    }
  );

  //********************************************************************
  // SIGNERS
  //********************************************************************

  fastify.get(
    '/signers', {},
    async (req, res) => {
      let signers = await getSigners();

      if (!signers) {
        return new createError.NotFound('Signers not found');
      }
      signers = await Promise.all(signers.map(signer => getPendingTxsAmount(signer)));
      signers = await Promise.all(signers.map(signer => getAddressBalance(signer)));

      return signers
    });

  fastify.put(
    '/signers/:id',
    {
      preValidation: [fastify.authenticate],
      schema: {
        params: {
          id: { type: 'string' },
        },
        body: {
          type: 'object',
          required: ['gas_price'],
        },
      },
    },
    async (req, res) => {
      const isOk = await updateSignerGasPrice(req.params.id, req.body.gas_price);
      if (!isOk) {
        return new createError.NotFound('Invalid signer');
      }
      res.status(204);
      return;
    }
  );
}