/**
 * Custom server — Next.js + WebSocket
 * Run: npx tsx server.ts
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app = next({ dev })
const handle = app.getRequestHandler()

// WebSocket clients
interface WSClient {
  ws: import('ws').WebSocket
  subscriptions: Set<string>
  lastPing: number
}
const clients = new Map<import('ws').WebSocket, WSClient>()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    const client: WSClient = { ws, subscriptions: new Set(), lastPing: Date.now() }
    clients.set(ws, client)
    console.log(`[WS] Client connected (${clients.size} total)`)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        handleWSMessage(client, msg)
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[WS] Client disconnected (${clients.size} remaining)`)
    })

    ws.on('pong', () => { client.lastPing = Date.now() })
    ws.send(JSON.stringify({ type: 'connected', message: 'StockView WebSocket ready' }))
  })

  // Heartbeat
  setInterval(() => {
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

  // Market push every 5s
  setInterval(() => {
    for (const [, client] of clients) {
      if (client.subscriptions.size > 0 && client.ws.readyState === 1) {
        const updates: any[] = []
        for (const code of client.subscriptions) {
          const priceChange = (Math.random() - 0.5) * 0.4
          updates.push({ code, price: +(100 + Math.random() * 500 + priceChange).toFixed(2), change: +priceChange.toFixed(2), timestamp: Date.now() })
        }
        client.ws.send(JSON.stringify({ type: 'market_update', data: updates }))
      }
    }
  }, 5000)

  server.listen(port, () => {
    console.log(`[StockView] http://localhost:${port}`)
    console.log(`[StockView] WebSocket: ws://localhost:${port}/ws`)
  })
})

function handleWSMessage(client: WSClient, msg: any) {
  switch (msg.type) {
    case 'subscribe':
      if (msg.codes?.length) {
        msg.codes.forEach((code: string) => client.subscriptions.add(code))
        client.ws.send(JSON.stringify({ type: 'subscribed', codes: Array.from(client.subscriptions) }))
      }
      break
    case 'unsubscribe':
      if (msg.codes?.length) msg.codes.forEach((code: string) => client.subscriptions.delete(code))
      break
    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }))
      break
    default:
      client.ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }))
  }
}
