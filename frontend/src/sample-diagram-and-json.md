# Sample Diagram Explanation and Equivalent JSON

## Practical Example: Slack Real-Time Text Communication

### Components Involved
1. Clients (A, C, E)
2. Connection Balancer
3. WebSocket Server (Server 1, Server 2)
4. Redis Pub/Sub
5. Database
6. API Server
7. Membership Service

### Scenario
- Users **A**, **C**, and **E** are all members of channel **c3**.
- **A** and **C** are connected to **WebSocket Server 1**.
- **E** is connected to **WebSocket Server 2**.

### Step-by-Step Data Flow

1. **Message Initiation**
   - **A** wants to send a message ("Hi all") to channel **c3**.

2. **Message Persistence**
   - **A** sends the message to the **API Server** (typically via HTTP REST API).
   - The **API Server** saves (persists) the message in the **Database** for durability and history.

3. **Real-Time Message Delivery Initiation**
   - The **API Server** publishes the message to **Redis Pub/Sub** on the topic for channel **c3**.

4. **Channel Membership Lookup**
   - Each **WebSocket Server** that receives messages from **Redis Pub/Sub** may call the **Membership Service** to determine which of its locally connected clients are members of channel **c3**.

5. **Local Delivery on WebSocket Server 1**
   - **WebSocket Server 1** receives the message from **Redis Pub/Sub**.
   - **WebSocket Server 1** delivers the message in real-time to **C** (but not to the sender, **A**).

6. **Remote Delivery on WebSocket Server 2**
   - **WebSocket Server 2** receives the message from **Redis Pub/Sub**.
   - **WebSocket Server 2** delivers the message in real-time to **E** (connected to WebSocket Server 2).

### Summary Table

| Step | Action | Component(s) Involved | Notes |
|------|--------|-----------------------|-------|
| 1 | A sends message | Client A → API Server | REST API call |
| 2 | Persist message | API Server → Database | Save message |
| 3 | Publish to Redis | API Server → Redis Pub/Sub | Message broadcast |
| 4 | Membership check | WebSocket Servers → Membership Service | To confirm connected clients in channel |
| 5 | Local delivery | WebSocket Server 1 → Client C | Real-time (not to sender) |
| 6 | Remote delivery | Redis Pub/Sub → WebSocket Server 2 → Client E | Real-time |

### Key Points
- **Persistence** and **real-time delivery** are decoupled: The API server ensures the message is saved before triggering real-time delivery.
- **Redis Pub/Sub** enables cross-server message delivery, so all users in the channel get the message, regardless of which WebSocket server they're connected to.
- **Membership Service** helps WebSocket servers confirm which local clients are members of a given channel.
- **Connection Balancer** is primarily used during WebSocket connection setup for load balancing, not for per-message routing.

### Equivalent JSON (Slack Real-Time Communication Example)

> **Note:** The `sequenceNo` property is optional for each edge. It can be used to indicate the order of steps in the flow.

```json
{
  "actions": [
    { "type": "add_node", "label": "Client A", "componentType": "Client", "description": "User A, member of channel c3" },
    { "type": "add_node", "label": "Client C", "componentType": "Client", "description": "User C, member of channel c3" },
    { "type": "add_node", "label": "Client E", "componentType": "Client", "description": "User E, member of channel c3" },
    { "type": "add_node", "label": "Connection Balancer", "componentType": "Service", "description": "Directs clients to the correct WebSocket server (used during connection setup)" },
    { "type": "add_node", "label": "WebSocket Server 1", "componentType": "Service", "description": "Handles real-time connections for A and C" },
    { "type": "add_node", "label": "WebSocket Server 2", "componentType": "Service", "description": "Handles real-time connections for E" },
    { "type": "add_node", "label": "Redis Pub/Sub", "componentType": "Service", "description": "Cross-server message delivery" },
    { "type": "add_node", "label": "Database", "componentType": "Database", "description": "Persists messages" },
    { "type": "add_node", "label": "API Server", "componentType": "REST API", "description": "Handles message persistence and acks" },
    { "type": "add_node", "label": "Membership Service", "componentType": "Service", "description": "Tracks which users are connected to which WebSocket servers" },

    { "type": "add_edge", "source": "Client A", "target": "API Server", "label": "Send message (REST)", "sequenceNo": 1, "requestModel": { "name": "SendMessageRequest", "json": { "channelId": "c3", "message": "Hi all" } } },
    { "type": "add_edge", "source": "API Server", "target": "Database", "label": "Persist message", "sequenceNo": 2 },
    { "type": "add_edge", "source": "API Server", "target": "Redis Pub/Sub", "label": "Publish message (c3)", "sequenceNo": 3, "requestModel": { "name": "ChannelMessage", "json": { "channelId": "c3", "message": "Hi all" } } },
    { "type": "add_edge", "source": "WebSocket Server 1", "target": "Membership Service", "label": "Membership check (local)", "sequenceNo": 4, "requestModel": { "name": "GetChannelMembersRequest", "json": { "channelId": "c3" } }, "responseModel": { "name": "GetChannelMembersResponse", "json": { "members": ["A", "C"] } } },
    { "type": "add_edge", "source": "WebSocket Server 1", "target": "Client C", "label": "Deliver message (local)", "sequenceNo": 5, "requestModel": { "name": "ChannelMessage", "json": { "channelId": "c3", "message": "Hi all" } } },
    { "type": "add_edge", "source": "Redis Pub/Sub", "target": "WebSocket Server 2", "label": "Deliver message to WS2", "sequenceNo": 6, "requestModel": { "name": "ChannelMessage", "json": { "channelId": "c3", "message": "Hi all" } } },
    { "type": "add_edge", "source": "WebSocket Server 2", "target": "Membership Service", "label": "Membership check (remote)", "sequenceNo": 7, "requestModel": { "name": "GetChannelMembersRequest", "json": { "channelId": "c3" } }, "responseModel": { "name": "GetChannelMembersResponse", "json": { "members": ["E"] } } },
    { "type": "add_edge", "source": "WebSocket Server 2", "target": "Client E", "label": "Deliver message (remote)", "sequenceNo": 8, "requestModel": { "name": "ChannelMessage", "json": { "channelId": "c3", "message": "Hi all" } } }
  ]
}
```
