import { FastifyInstance } from 'fastify';
import createError from 'http-errors';

import {
  resolveName,
  lookupAddress,
} from './poap-helper';
import { verifyReceipt } from './verify_receipt';
import { ClaimReceipt } from './types';

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

  fastify.addSchema({
    $id: 'claim',
    type: 'object',
    required: ['eventAddress', 'userAddress', 'claimSignature'],
    properties: {
      eventAddress: 'address#',
      userAddress: 'address#',
      claimSignature: 'signature#',
    }
  });

  fastify.addSchema({
    $id: 'receipt',
    type: 'object',
    required: ['claim', 'receiptSignature'],
    properties: {
      claim: 'claim#',
      receiptSignature: 'signature#',
    }
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
          address: 'address#'
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
        body: 'receipt#',
      },
    },
    async (req, res) => {
      const receipt: ClaimReceipt = req.body;
      const isValid = await verifyReceipt(receipt);
      if (isValid) {
        // Store user address in database as database
        res.status(204);
      } else {
        throw new createError.BadRequest('Invalid Receipt');
      }
    }
  );
}