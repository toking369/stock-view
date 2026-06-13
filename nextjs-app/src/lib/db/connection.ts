/**
 * MySQL 连接池 — mysql2/promise
 *
 * 配置遵循 mysql-patterns 规范：
 * - pool_recycle: pool_recycle < server wait_timeout 避免过期连接
 * - pool_pre_ping: enableKeepAlive 自动检测网络断开
 * - connectionLimit: 10 适用于 stock-view 中低并发场景
 */

import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST || 'localhost',
  port:     Number(process.env.MYSQL_PORT) || 3306,
  user:     process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'my_stock_view',

  // — 连接池 —
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // — 保活 —
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000, // 30s 首次心跳

  // — 超时 —
  connectTimeout: 10000,        // 连接超时 10s
})

export default pool
