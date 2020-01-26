import { Address } from './types'
import { isParticipant, userHasEventRole, ROLE } from '@wearekickback/shared'

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

export const getAdminsQuery = `
  query getParty($eventAddress: String!){
    party(address: $eventAddress) {
      roles {
        role
        user {
          id
          address
        }
      }
    }
  }
`
export const getParticipantsQuery = `
  query getParty($eventAddress: String!){
    party(address: $eventAddress) {
      participants {
        user {
          address
      }
    }
  }
}
`
export async function getParty(eventAddress: Address) {
  const endpoint = `https://kovan.api.kickback.events/graphql`

  const client = new GraphQLClient(endpoint, {
    headers: {
      Authorization: ``
    }
  })
  const { party } = await client.request(getPartyQuery, { eventAddress })
  return party
}

export async function isAdmin(eventAddress: Address, userAddress: Address) {
  const endpoint = `https://kovan.api.kickback.events/graphql`

  const client = new GraphQLClient(endpoint, {
    headers: {
      Authorization: ``
    }
  })
  const { party } = await client.request(getAdminsQuery, { eventAddress })

  return userHasEventRole(userAddress, party, ROLE.EVENT_ADMIN)
}

export async function isRegistered(eventAddress: Address, userAddress: Address) {
  const endpoint = `https://kovan.api.kickback.events/graphql`

  const client = new GraphQLClient(endpoint, {
    headers: {
      Authorization: ``
    }
  })
  const { party } = await client.request(getParticipantsQuery, { eventAddress })

  return isParticipant(party.participants, userAddress)
}