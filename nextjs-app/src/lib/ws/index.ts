import { WebSocketServer, WebSocket } from 'ws'

interface WSClient {
  ws: WebSocket
  subscriptions: Set<string>
  lastPing: number
}

const clients = new Map<WebSocket, WSClient>()

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    const client: WSClient = { ws, subscriptions: new Set(), lastPing: Date.now() }
    clients.set(ws, client)
    console.log(`[WS] Client connected (${clients.size} total)`)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        handleMessage(client, msg)
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[WS] Client disconnected (${clients.size} remaining)`)
    })

    ws.on('pong', () => {
      client.lastPing = Date.now()
    })

    // Send welcome
    ws.send(JSON.stringify({ type: 'connected', message: 'StockView WebSocket connected' }))
  })

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    const now = Date.now()
    for (const [ws, client] of clients) {
      if (now - client.lastPing > 60_000) {
        ws.terminate()
        clients.delete(ws)
      } else {
        ws.ping()
      }
    }
  }, 30_000)

  wss.on('close', () => clearInterval(heartbeat))

  // Push market updates every 5s (for subscribed clients)
  const marketPush = setInterval(() => {
    for (const [, client] of clients) {
      if (client.subscriptions.size > 0 && client.ws.readyState === WebSocket.OPEN) {
        const updates = generateMarketUpdates(client.subscriptions)
        client.ws.send(JSON.stringify({ type: 'market_update', data: updates }))
      }
    }
  }, 5000)

  wss.on('close', () => clearInterval(marketPush))
}

function handleMessage(client: WSClient, msg: any) {
  switch (msg.type) {
    case 'subscribe':
      if (msg.codes?.length) {
        msg.codes.forEach((code: string) => client.subscriptions.add(code))
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          codes: Array.from(client.subscriptions),
        }))
      }
      break

    case 'unsubscribe':
      if (msg.codes?.length) {
        msg.codes.forEach((code: string) => client.subscriptions.delete(code))
      }
      break

    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }))
      break

    default:
      client.ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
  }
}

// Generate mock real-time updates for subscribed stocks
function generateMarketUpdates(codes: Set<string>) {
  const updates: any[] = []
  for (const code of codes) {
    const priceChange = (Math.random() - 0.5) * 0.4
    updates.push({
      code,
      price: +(100 + Math.random() * 500 + priceChange).toFixed(2),
      change: +priceChange.toFixed(2),
      timestamp: Date.now(),
    })
  }
  return updates
}
