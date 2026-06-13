/**
 * Database access layer — mysql2/promise.
 *
 * Schema auto-initialized on first call.
 * Maintains backward-compatible exports for existing route handlers
 * while adding new user_id-based methods.
 *
 * Domain export:
 *   db.users.*        — user accounts, settings, auth tokens
 *   db.watchlist.*    — watchlist CRUD (username-based for backward compat)
 *   db.stocks.*       — stock reference queries
 *   db.kline.*        — K-line cache access
 *   db.daily.*        — daily basic indicators
 *   db.moneyflow.*    — capital flow & HSGT
 *   db.sectors.*      — sector definitions & ranks
 *   db.lhb.*          — LHB & limit-up
 *   db.screener.*     — strategy definitions & results
 *   db.chat.*         — AI chat sessions & messages
 */

import pool from './connection'
import { initDatabase } from './init'

// ── Types ──

export interface StoredUser {
  id: string        // string(BIGINT) — backward compat
  username: string
  password: string
  name?: string
  avatar?: string
  createdAt: number  // epoch ms
  updatedAt: number
}

export interface StoredWatchlistItem {
  id: number
  tsCode: string
  sortOrder: number
  note: string
  createdAt: string
}

export interface StoredSession {
  id: number
  title: string
  messageCount: number
  model: string
  createdAt: string
  updatedAt: string
}

// ── Helpers ──

function parseUser(row: any): StoredUser {
  return {
    id: String(row.id),
    username: row.username,
    password: row.password,
    name: row.nickname || undefined,
    avatar: row.avatar || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.getTime() : Number(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.getTime() : Number(row.updated_at),
  }
}

async function userIdByUsername(username: string): Promise<number | undefined> {
  const [rows] = await pool.query<any[]>(
    'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL', [username]
  )
  return rows.length > 0 ? rows[0].id : undefined
}

let initPromise: Promise<void> | null = null

function ensureInit() {
  if (!initPromise) initPromise = initDatabase()
  return initPromise
}

// ════════════════════════════════════════════════════════════════
//  Exported db object
// ════════════════════════════════════════════════════════════════

export const db = {

  // ──────────────────────────────────────────────────────────────
  //  User account methods (backward-compatible with existing routes)
  // ──────────────────────────────────────────────────────────────

  async findUserByUsername(username: string): Promise<StoredUser | undefined> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [username]
    )
    return rows.length > 0 ? parseUser(rows[0]) : undefined
  },

  async findUserById(id: number): Promise<StoredUser | undefined> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]
    )
    return rows.length > 0 ? parseUser(rows[0]) : undefined
  },

  async createUser(username: string, password: string, name?: string): Promise<StoredUser> {
    await ensureInit()
    const [result] = await pool.query<any>(
      `INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)`,
      [username, password, name || username]
    )
    return {
      id: String(result.insertId),
      username,
      password,
      name: name || username,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  },

  async updatePassword(username: string, newPassword: string): Promise<void> {
    await ensureInit()
    await pool.query(
      'UPDATE users SET password = ? WHERE username = ? AND deleted_at IS NULL',
      [newPassword, username]
    )
  },

  async updateLastLogin(username: string): Promise<void> {
    await ensureInit()
    await pool.query(
      "UPDATE users SET last_login_at = NOW() WHERE username = ?", [username]
    )
  },

  // ──────────────────────────────────────────────────────────────
  //  Auth tokens
  // ──────────────────────────────────────────────────────────────

  async saveToken(token: string, username: string): Promise<void> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return
    // Expire in 7 days
    await pool.query(
      `INSERT INTO auth_tokens (user_id, token, token_type, expires_at)
       VALUES (?, ?, 'session', DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [uid, token]
    )
  },

  async getUsernameByToken(token: string): Promise<string | undefined> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT u.username FROM auth_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token = ? AND t.revoked_at IS NULL AND t.expires_at > NOW()
       LIMIT 1`,
      [token]
    )
    return rows.length > 0 ? rows[0].username : undefined
  },

  async revokeToken(token: string): Promise<void> {
    await ensureInit()
    await pool.query(
      "UPDATE auth_tokens SET revoked_at = NOW() WHERE token = ?", [token]
    )
  },

  async revokeAllUserTokens(username: string): Promise<void> {
    await ensureInit()
    await pool.query(
      `UPDATE auth_tokens t JOIN users u ON u.id = t.user_id
       SET t.revoked_at = NOW()
       WHERE u.username = ? AND t.revoked_at IS NULL`,
      [username]
    )
  },

  // ──────────────────────────────────────────────────────────────
  //  Watchlist (backward-compatible username-based)
  // ──────────────────────────────────────────────────────────────

  async getWatchlist(username: string): Promise<string[]> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return []
    const [rows] = await pool.query<any[]>(
      'SELECT ts_code FROM watchlist WHERE user_id = ? ORDER BY sort_order ASC',
      [uid]
    )
    return rows.map((r: any) => r.ts_code.replace('.SH', '').replace('.SZ', '').replace('.BJ', ''))
  },

  async getWatchlistDetail(username: string): Promise<StoredWatchlistItem[]> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return []
    const [rows] = await pool.query<any[]>(
      'SELECT id, ts_code AS tsCode, sort_order AS sortOrder, note, created_at AS createdAt FROM watchlist WHERE user_id = ? ORDER BY sort_order ASC',
      [uid]
    )
    return rows
  },

  async setWatchlist(username: string, codes: string[]): Promise<void> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return
    await pool.query('DELETE FROM watchlist WHERE user_id = ?', [uid])
    if (codes.length > 0) {
      const values = codes.map((code, i) => [uid, appendSuffix(code), i, ''])
      await pool.query(
        'INSERT INTO watchlist (user_id, ts_code, sort_order, note) VALUES ?',
        [values]
      )
    }
  },

  async addToWatchlist(username: string, code: string): Promise<void> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return
    await pool.query(
      `INSERT INTO watchlist (user_id, ts_code, sort_order)
       SELECT ?, ?, COALESCE(MAX(sort_order), 0) + 1
       FROM watchlist WHERE user_id = ?
       ON DUPLICATE KEY UPDATE sort_order = sort_order`,
      [uid, appendSuffix(code), uid]
    )
  },

  async removeFromWatchlist(username: string, code: string): Promise<void> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return
    await pool.query(
      'DELETE FROM watchlist WHERE user_id = ? AND ts_code = ?',
      [uid, appendSuffix(code)]
    )
  },

  async isInWatchlist(username: string, code: string): Promise<boolean> {
    await ensureInit()
    const uid = await userIdByUsername(username)
    if (!uid) return false
    const [rows] = await pool.query<any[]>(
      'SELECT 1 FROM watchlist WHERE user_id = ? AND ts_code = ? LIMIT 1',
      [uid, appendSuffix(code)]
    )
    return rows.length > 0
  },

  // ── user_id-based watchlist methods ──

  async getWatchlistByUserId(userId: number): Promise<string[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      'SELECT ts_code FROM watchlist WHERE user_id = ? ORDER BY sort_order ASC', [userId]
    )
    return rows.map((r: any) => r.ts_code)
  },

  async addToWatchlistByUserId(userId: number, code: string): Promise<void> {
    await ensureInit()
    await pool.query(
      `INSERT INTO watchlist (user_id, ts_code, sort_order)
       SELECT ?, ?, COALESCE(MAX(sort_order), 0) + 1
       FROM watchlist WHERE user_id = ?
       ON DUPLICATE KEY UPDATE sort_order = sort_order`,
      [userId, appendSuffix(code), userId]
    )
  },

  async removeFromWatchlistByUserId(userId: number, code: string): Promise<void> {
    await ensureInit()
    await pool.query(
      'DELETE FROM watchlist WHERE user_id = ? AND ts_code = ?',
      [userId, appendSuffix(code)]
    )
  },

  async reorderWatchlist(userId: number, codes: string[]): Promise<void> {
    await ensureInit()
    // Full replace: delete all, re-insert in order
    await pool.query('DELETE FROM watchlist WHERE user_id = ?', [userId])
    if (codes.length > 0) {
      const values = codes.map((code, i) => [userId, appendSuffix(code), i, ''])
      await pool.query(
        'INSERT INTO watchlist (user_id, ts_code, sort_order, note) VALUES ?',
        [values]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  Stock reference
  // ──────────────────────────────────────────────────────────────

  async searchStocks(q: string): Promise<any[]> {
    await ensureInit()
    const pattern = `%${q}%`
    const [rows] = await pool.query<any[]>(
      `SELECT ts_code, symbol, name, industry, area
       FROM stocks
       WHERE list_status = 'L' AND (name LIKE ? OR symbol LIKE ? OR ts_code LIKE ?)
       LIMIT 20`,
      [pattern, pattern, pattern]
    )
    return rows.map((r: any) => ({
      code: r.ts_code,
      symbol: r.symbol,
      name: r.name,
      industry: r.industry,
      area: r.area,
    }))
  },

  async getStockByCode(tsCode: string): Promise<any | undefined> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM stocks WHERE ts_code = ?', [tsCode]
    )
    return rows.length > 0 ? rows[0] : undefined
  },

  async batchUpsertStocks(stocks: any[]): Promise<void> {
    await ensureInit()
    for (const s of stocks) {
      await pool.query(
        `INSERT INTO stocks (ts_code, symbol, name, full_name, area, industry, market, list_status, list_date, is_hsgt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           area = VALUES(area),
           industry = VALUES(industry),
           list_status = VALUES(list_status)`,
        [s.ts_code, s.symbol, s.name, s.full_name || '', s.area || '', s.industry || '',
         s.market || '', s.list_status || 'L', s.list_date || null, s.is_hsgt || 0]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  K-line cache
  // ──────────────────────────────────────────────────────────────

  async getKline(tsCode: string, period: string, startDate: string, endDate: string): Promise<any[]> {
    await ensureInit()
    const code = ensureSuffix(tsCode)
    const [rows] = await pool.query<any[]>(
      `SELECT trade_date, open, high, low, close, vol, amount
       FROM kline_cache
       WHERE ts_code = ? AND period = ? AND trade_date BETWEEN ? AND ?
       ORDER BY trade_date ASC`,
      [code, period, startDate, endDate]
    )
    return rows.map((r: any) => ({
      date: r.trade_date instanceof Date ? r.trade_date.toISOString().slice(0, 10) : String(r.trade_date),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      vol: Number(r.vol),
    }))
  },

  async batchUpsertKline(records: any[]): Promise<void> {
    await ensureInit()
    for (const r of records) {
      await pool.query(
        `INSERT INTO kline_cache (ts_code, period, trade_date, open, high, low, close, pre_close, vol, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           open = VALUES(open), high = VALUES(high), low = VALUES(low),
           close = VALUES(close), vol = VALUES(vol), amount = VALUES(amount)`,
        [r.ts_code, r.period, r.trade_date, r.open, r.high, r.low, r.close, r.pre_close, r.vol, r.amount]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  Daily basic cache
  // ──────────────────────────────────────────────────────────────

  async getDailyBasic(tradeDate: string): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM daily_basic_cache
       WHERE trade_date = ?
       ORDER BY total_mv DESC`,
      [tradeDate]
    )
    return rows
  },

  async getDailyBasicByCode(tsCode: string, tradeDate: string): Promise<any | undefined> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM daily_basic_cache WHERE ts_code = ? AND trade_date = ?',
      [ensureSuffix(tsCode), tradeDate]
    )
    return rows.length > 0 ? rows[0] : undefined
  },

  async batchUpsertDailyBasic(records: any[]): Promise<void> {
    await ensureInit()
    for (const r of records) {
      await pool.query(
        `INSERT INTO daily_basic_cache (ts_code, trade_date, turnover_rate, turnover_rate_f, volume_ratio, pe, pe_ttm, pb, total_mv, circ_mv)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           turnover_rate = VALUES(turnover_rate), volume_ratio = VALUES(volume_ratio),
           pe = VALUES(pe), pe_ttm = VALUES(pe_ttm), pb = VALUES(pb),
           total_mv = VALUES(total_mv), circ_mv = VALUES(circ_mv)`,
        [r.ts_code, r.trade_date, r.turnover_rate, r.turnover_rate_f, r.volume_ratio,
         r.pe, r.pe_ttm, r.pb, r.total_mv, r.circ_mv]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  Index daily cache
  // ──────────────────────────────────────────────────────────────

  async getIndexDaily(tsCode: string, days: number): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT trade_date, open, high, low, close, pre_close, vol, amount
       FROM index_daily_cache
       WHERE ts_code = ?
       ORDER BY trade_date DESC
       LIMIT ?`,
      [tsCode, days]
    )
    return rows.reverse()
  },

  async batchUpsertIndexDaily(records: any[]): Promise<void> {
    await ensureInit()
    for (const r of records) {
      await pool.query(
        `INSERT INTO index_daily_cache (ts_code, trade_date, open, high, low, close, pre_close, vol, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           open = VALUES(open), high = VALUES(high), low = VALUES(low),
           close = VALUES(close), vol = VALUES(vol), amount = VALUES(amount)`,
        [r.ts_code, r.trade_date, r.open, r.high, r.low, r.close, r.pre_close, r.vol, r.amount]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  Capital flow
  // ──────────────────────────────────────────────────────────────

  async getMoneyflow(tsCode: string, days: number): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT trade_date, buy_sm_amount, sell_sm_amount,
              buy_md_amount, sell_md_amount,
              buy_lg_amount, sell_lg_amount,
              buy_elg_amount, sell_elg_amount,
              net_mf_amount
       FROM moneyflow_cache
       WHERE ts_code = ?
       ORDER BY trade_date DESC
       LIMIT ?`,
      [ensureSuffix(tsCode), days]
    )
    return rows
  },

  async getMoneyflowRanking(tradeDate: string, limit: number = 10): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT m.ts_code, s.name, m.net_mf_amount
       FROM moneyflow_cache m
       LEFT JOIN stocks s ON s.ts_code = m.ts_code
       WHERE m.trade_date = ?
       ORDER BY ABS(m.net_mf_amount) DESC
       LIMIT ?`,
      [tradeDate, limit]
    )
    return rows
  },

  async batchUpsertMoneyflow(records: any[]): Promise<void> {
    await ensureInit()
    for (const r of records) {
      await pool.query(
        `INSERT INTO moneyflow_cache SET ? ON DUPLICATE KEY UPDATE ?`,
        [r, r]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  HSGT (沪深港通)
  // ──────────────────────────────────────────────────────────────

  async getHsgt(days: number): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM hsgt_cache ORDER BY trade_date DESC LIMIT ?', [days]
    )
    return rows.reverse()
  },

  async upsertHsgt(record: any): Promise<void> {
    await ensureInit()
    await pool.query(
      `INSERT INTO hsgt_cache SET ? ON DUPLICATE KEY UPDATE ?`, [record, record]
    )
  },

  // ──────────────────────────────────────────────────────────────
  //  Sector
  // ──────────────────────────────────────────────────────────────

  async getSectorRankings(tradeDate: string, sectorType: string = 'industry', limit: number = 30): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT s.name, s.sector_type, r.change_pct, r.rise_count, r.fall_count,
              r.lead_stock, r.total_amount, r.net_mf_amount
       FROM sector_rank_cache r
       JOIN sectors s ON s.id = r.sector_id
       WHERE r.trade_date = ? AND s.sector_type = ?
       ORDER BY r.change_pct DESC
       LIMIT ?`,
      [tradeDate, sectorType, limit]
    )
    return rows.map((r: any) => ({
      name: r.name,
      change: Number(r.change_pct),
      volume: Number(r.total_amount),
    }))
  },

  async batchUpsertSectorRank(records: any[]): Promise<void> {
    await ensureInit()
    for (const r of records) {
      await pool.query(
        `INSERT INTO sector_rank_cache SET ? ON DUPLICATE KEY UPDATE ?`, [r, r]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  LHB (龙虎榜)
  // ──────────────────────────────────────────────────────────────

  async getLHB(tradeDate: string): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT l.*, s.industry
       FROM lhb_cache l
       LEFT JOIN stocks s ON s.ts_code = l.ts_code
       WHERE l.trade_date = ?
       ORDER BY ABS(l.net_amount) DESC`,
      [tradeDate]
    )
    return rows.map((r: any) => ({
      code: r.ts_code,
      name: r.name,
      price: Number(r.close),
      change: Number(r.change_pct),
      buy: Number(r.buy_amount),
      sell: Number(r.sell_amount),
      net: Number(r.net_amount),
      reason: r.reason,
    }))
  },

  async batchUpsertLHB(records: any[]): Promise<void> {
    await ensureInit()
    for (const r of records) {
      await pool.query(
        `INSERT INTO lhb_cache SET ? ON DUPLICATE KEY UPDATE ?`, [r, r]
      )
    }
  },

  // ──────────────────────────────────────────────────────────────
  //  Screener strategies
  // ──────────────────────────────────────────────────────────────

  async getPresetStrategies(): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT name, description, strategy_key AS id, filters, tags
       FROM screener_strategies
       WHERE is_preset = 1
       ORDER BY sort_order ASC`
    )
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      desc: r.description,
      filters: typeof r.filters === 'string' ? JSON.parse(r.filters) : r.filters,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    }))
  },

  async getUserStrategies(userId: number): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM screener_strategies
       WHERE user_id = ?
       ORDER BY sort_order ASC`,
      [userId]
    )
    return rows
  },

  async saveUserStrategy(userId: number, name: string, desc: string, filters: any, tags: string[]): Promise<number> {
    await ensureInit()
    const [result] = await pool.query<any>(
      `INSERT INTO screener_strategies (user_id, name, description, filters, tags, is_preset, sort_order)
       VALUES (?, ?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM screener_strategies WHERE user_id = ?))`,
      [userId, name, desc, JSON.stringify(filters), JSON.stringify(tags), userId]
    )
    return result.insertId
  },

  async deleteUserStrategy(strategyId: number, userId: number): Promise<void> {
    await ensureInit()
    await pool.query(
      'DELETE FROM screener_strategies WHERE id = ? AND user_id = ?',
      [strategyId, userId]
    )
  },

  // ──────────────────────────────────────────────────────────────
  //  Chat sessions & messages
  // ──────────────────────────────────────────────────────────────

  async listChatSessions(userId: number): Promise<StoredSession[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT id, title, message_count, model, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId]
    )
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      messageCount: r.message_count,
      model: r.model,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }))
  },

  async createChatSession(userId: number, title: string = '新对话', model: string = 'default'): Promise<number> {
    await ensureInit()
    const [result] = await pool.query<any>(
      'INSERT INTO chat_sessions (user_id, title, model) VALUES (?, ?, ?)',
      [userId, title, model]
    )
    return result.insertId
  },

  async getChatMessages(sessionId: number): Promise<any[]> {
    await ensureInit()
    const [rows] = await pool.query<any[]>(
      `SELECT id, role, content, images, metadata, token_count, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    )
    return rows.map((r: any) => ({
      id: String(r.id),
      role: r.role,
      content: r.content,
      images: r.images ? (typeof r.images === 'string' ? JSON.parse(r.images) : r.images) : undefined,
      timestamp: new Date(r.created_at).getTime(),
    }))
  },

  async addChatMessage(sessionId: number, role: string, content: string, metadata?: any): Promise<number> {
    await ensureInit()
    const [result] = await pool.query<any>(
      `INSERT INTO chat_messages (session_id, role, content, metadata)
       VALUES (?, ?, ?, ?)`,
      [sessionId, role, content, metadata ? JSON.stringify(metadata) : null]
    )
    // Update session message count & title
    await pool.query(
      `UPDATE chat_sessions
       SET message_count = message_count + 1,
           updated_at = NOW()
       WHERE id = ?`,
      [sessionId]
    )
    if (role === 'user') {
      // Auto-title from first user message (truncate to first 40 chars)
      await pool.query(
        `UPDATE chat_sessions
         SET title = LEFT(?, 40)
         WHERE id = ? AND message_count = 1`,
        [content, sessionId]
      )
    }
    return result.insertId
  },

  async deleteChatSession(sessionId: number, userId: number): Promise<void> {
    await ensureInit()
    // CASCADE deletes messages
    await pool.query(
      'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    )
  },
}

// ── Internal helpers ──

/** Normalize stock code to ts_code format (add .SH/.SZ suffix if missing) */
function appendSuffix(code: string): string {
  const trimmed = code.trim().toUpperCase()
  if (trimmed.includes('.')) return trimmed
  // SH: 5xx, 6xx, 9xx; SZ: 0xx, 2xx, 3xx
  if (/^(5|6|9)\d{5}$/.test(trimmed)) return `${trimmed}.SH`
  if (/^(0|2|3|1)\d{5}$/.test(trimmed)) return `${trimmed}.SZ`
  return trimmed
}

function ensureSuffix(code: string): string {
  if (code.includes('.')) return code
  return appendSuffix(code)
}
