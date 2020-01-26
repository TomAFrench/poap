import { Address } from './types'

const gqlr = require('graphql-request')
const { GraphQLClient } = gqlr

export const getPartyQuery = `
  query getParty($eventAddress: String!){
    party(address: $eventAddress) {
      id
      address
      name
      description
      timezone
      start
      end
      arriveBy
      location
      headerImg
      balance
      deposit
      tokenAddress
      coolingPeriod
      participantLimit
      ended
      cancelled
      status
      roles {
        role
        user {
          id
          address
          username
          realName
          roles
          social {
            type
            value
          }
          legal {
            id
            type
            accepted
          }
          email {
            verified
            pending
          }
        }
      }
      participants {
        user {
          id
          address
          username
          realName
          roles
          social {
            type
            value
          }
          legal {
            id
            type
            accepted
          }
          email {
            verified
            pending
          }
        }
        status
        index
      }
    }
  }
`

export async function getParty(endpoint: string, eventAddress: Address) {
  const client = new GraphQLClient(endpoint, {
    headers: {
      Authorization: ``
    }
  })
  const { party } = await client.request(getPartyQuery, { eventAddress })
  return party
}