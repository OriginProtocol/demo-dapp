module.exports = `
  extend type Query {
    messaging(id: String!): Messaging
  }

  extend type Mutation {
    enableMessaging: Boolean
    sendMessage(to: String!, content: String, media: [MediaInput]): Conversation
    markConversationRead(id: String!): Boolean
  }

  type Messaging {
    id: ID!
    enabled: Boolean
    syncProgress: String
    synced: Boolean
    pubKey: String
    pubSig: String
    conversations(before: Int, after: Int): [Conversation]
    conversation(id: String!, before: Int, after: Int): Conversation
    canConverseWith(id: String!): Boolean
    forwardTo(id: String!): String
    totalUnread: Int
  }

  type Conversation {
    id: ID!
    timestamp: Int
    messages: [Message]
    lastMessage: Message
    totalUnread: Int
  }

  type Message {
    id: ID!
    address: String
    hash: String
    index: Int
    content: String
    media: [Media]
    timestamp: Int
    status: String
  }

`
