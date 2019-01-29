import gql from 'graphql-tag'

export default gql`
  query Conversations {
    messaging(id: "defaultAccount") {
      id
      enabled
      conversations {
        id
        timestamp
        messages {
          status
          address
        }
        lastMessage {
          media {
            url
            contentType
          }
          content
          timestamp
        }
      }
    }
  }
`
