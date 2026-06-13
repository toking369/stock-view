/**
 * Database layer — currently a stub/mock.
 * Phase 2+ will integrate better-sqlite3.
 */

interface StoredUser {
  id: string
  phone: string
  password: string
  name?: string
  createdAt: number
  watchlist: string[]
}

// In-memory store (will be replaced by SQLite)
const users = new Map<string, StoredUser>()

// Init demo user
users.set('13800138000', {
  id: 'demo-001',
  phone: '13800138000',
  password: '123456',
  name: 'Demo User',
  createdAt: Date.now(),
  watchlist: ['600519', '300750', '601318', '600036', '300059'],
})

export const db = {
  findUserByPhone(phone: string): StoredUser | undefined {
    return users.get(phone)
  },

  createUser(phone: string, password: string): StoredUser {
    const user: StoredUser = {
      id: `user-${Date.now()}`,
      phone,
      password,
      createdAt: Date.now(),
      watchlist: [],
    }
    users.set(phone, user)
    return user
  },

  getWatchlist(phone: string): string[] {
    return users.get(phone)?.watchlist || []
  },

  updateWatchlist(phone: string, codes: string[]): void {
    const user = users.get(phone)
    if (user) user.watchlist = codes
  },
}
