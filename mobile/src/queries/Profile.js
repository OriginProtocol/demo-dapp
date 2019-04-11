import gql from 'graphql-tag'

export default gql`
  query Profile {
    web3 {
      primaryAccount {
        id
        balance {
          eth
        }
        checksumAddress
      }
      walletType
    }
  }
`
