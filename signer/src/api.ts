import { Address } from './types'

const gqlr = require('graphql-request')
const { GraphQLClient } = gqlr

// const GetPartyQuery = `
//   query getParty($address: String!) {
//     party(address: $address) {
//       id
//       address
//       name
//       ended
//       participants{
//         status
//         index
//         user{
//           username
//           address
//         }
//       }
//     }
//   }
// `

const amAdminQuery = `
  query getParty($eventAddress: String!, $userAddress: String!) {
    party(address: $eventAddress) {
      participants{
        user(address: $userAddress){
          address
        }
      }
    }
  }
`

// async function getParty(address: Address) {
//   const endpoint = `https://kovan.api.kickback.events/graphql`
//   console.log(
//     `
//   Config
//   ------
//   Endpoint:               ${endpoint}
//   Party id:               ${address}
//   `
//   )

//   const client = new GraphQLClient(endpoint, {
//     headers: {
//       Authorization: ``
//     }
//   })
//   const { party } = await client.request(GetPartyQuery, { address })
//   return party
// }

export async function isAdmin(eventAddress: Address, userAddress: Address) {
  const endpoint = `https://kovan.api.kickback.events/graphql`

  const client = new GraphQLClient(endpoint, {
    headers: {
      Authorization: ``
    }
  })
  const { party: { participants } } = await client.request(amAdminQuery, { eventAddress, userAddress })
  console.log(participants)
  return participants.length > 0
}