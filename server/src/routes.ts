import { FastifyInstance } from 'fastify';
import createError from 'http-errors';

import {
  // verifyClaim,
  resolveName,
  lookupAddress,
} from './poap-helper';

// import crypto from 'crypto';
// import getEnv from './envs';

function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
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

  // fastify.post(
  //   '/actions/claim',
  //   {
  //     schema: {
  //       body: {
  //         type: 'object',
  //         required: ['claimId', 'eventId', 'proof', 'claimer', 'claimerSignature'],
  //         properties: {
  //           claimId: { type: 'string' },
  //           eventId: { type: 'integer', minimum: 1 },
  //           proof: 'signature#',
  //           claimer: 'address#',
  //           claimerSignature: 'signature#',
  //         },
  //       },
  //     },
  //   },
  //   async (req, res) => {
  //     const claim: Claim = req.body;
  //     const isValid = await verifyClaim(claim);
  //     if (isValid) {
  //       //mark attended
  //       //await mintToken(claim.eventId, claim.claimer);
  //       res.status(204);
  //     } else {
  //       throw new createError.BadRequest('Invalid Claim');
  //     }
  //   }
  // );

  // fastify.get(
  //   '/actions/claim-qr',
  //   {
  //     schema: {
  //       querystring: {
  //         qr_hash: { type: 'string' },
  //       },
  //     }
  //   },
  //   async (req, res) => {
  //     const qr_hash = req.query.qr_hash || '';

  //     if (!qr_hash) {
  //       return new createError.NotFound('Please send qr_hash as querystring parameter');
  //     }

  //     const qr_claim = await getQrClaim(qr_hash);
  //     if (!qr_claim) {
  //       await sleep(1000);
  //       return new createError.NotFound('Qr Claim not found');
  //     }

  // const event = await getEvent(qr_claim.event_id);
  // if (!event) {
  //   return new createError.InternalServerError('Qr Claim does not have any event');
  // }
  // qr_claim.event = event;

  // const env = getEnv();
  // qr_claim.secret = crypto.createHmac('sha256', env.secretKey).update(qr_hash).digest('hex');

  // qr_claim.tx_status = null;
  // if (qr_claim.tx_hash) {
  //   const transaction_status = await getTransaction(qr_claim.tx_hash);
  //   if (transaction_status) {
  //     qr_claim.tx_status = transaction_status.status;
  //   }
  // }

  //     return qr_claim
  //   }
  // );

  // fastify.post(
  //   '/actions/claim-qr',
  //   {
  //     schema: {
  //       body: {
  //         type: 'object',
  //         required: ['address', 'qr_hash', 'secret'],
  //       },
  //     },
  //   },
  //   async (req, res) => {
  //     const env = getEnv();
  //     const secret = crypto.createHmac('sha256', env.secretKey).update(req.body.qr_hash).digest('hex');

  // if (req.body.secret != secret) {
  //   await sleep(1000)
  //   return new createError.NotFound('Invalid secret');
  // }

  // const qr_claim = await getQrClaim(req.body.qr_hash);
  // if (!qr_claim) {
  //   await sleep(1000)
  //   return new createError.NotFound('Qr Claim not found');
  // }

  // if (qr_claim.claimed) {
  //   return new createError.BadRequest('Qr is already Claimed');
  // }

  // let claim_qr_claim = await claimQrClaim(req.body.qr_hash);
  // if (!claim_qr_claim) {
  //   return new createError.InternalServerError('There was a problem updating claim boolean');
  // }
  // qr_claim.claimed = true

  // const event = await getEvent(qr_claim.event_id);
  // if (!event) {
  //   return new createError.InternalServerError('Qr Claim does not have any event');
  // }
  // qr_claim.event = event

  // const parsed_address = await checkAddress(req.body.address);
  // if (!parsed_address) {
  //   return new createError.BadRequest('Address is not valid');
  // }

  // const dual_qr_claim = await checkDualQrClaim(qr_claim.event.id, parsed_address);
  // if (!dual_qr_claim) {
  //   return new createError.BadRequest('Address already has this claim');
  // }

  // const has_token = await checkHasToken(qr_claim.event.id, parsed_address);
  // if (has_token) {
  //   await unclaimQrClaim(req.body.qr_hash);
  //   return new createError.BadRequest('Address already has this claim');
  // }

  // const tx_mint = await mintToken(qr_claim.event.id, parsed_address, false);
  // if (!tx_mint || !tx_mint.hash) {
  //   await unclaimQrClaim(req.body.qr_hash);
  //   return new createError.InternalServerError('There was a problem in token mint');
  // }

  //     return // qr_claim
  //   }
  // );
}