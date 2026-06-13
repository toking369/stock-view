/**
 * Database initializer — drops & recreates all tables.
 * Called once on first db access.
 */

import pool from './connection'

let initialized = false

export async function initDatabase() {
  if (initialized) return
  initialized = true

  const dbName = process.env.MYSQL_DATABASE || 'my_stock_view'

  try {
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await pool.query(`USE \`${dbName}\``)

    // ── Drop tables (respect FK order: children first) ──
    await pool.query('SET FOREIGN_KEY_CHECKS = 0')

    await pool.query('DROP TABLE IF EXISTS chat_messages')
    await pool.query('DROP TABLE IF EXISTS chat_sessions')
    await pool.query('DROP TABLE IF EXISTS screener_results')
    await pool.query('DROP TABLE IF EXISTS screener_strategies')
    await pool.query('DROP TABLE IF EXISTS user_stock_notes')
    await pool.query('DROP TABLE IF EXISTS watchlist')
    await pool.query('DROP TABLE IF EXISTS auth_tokens')
    await pool.query('DROP TABLE IF EXISTS user_settings')
    await pool.query('DROP TABLE IF EXISTS users')

    await pool.query('DROP TABLE IF EXISTS sector_rank_cache')
    await pool.query('DROP TABLE IF EXISTS sector_stocks')
    await pool.query('DROP TABLE IF EXISTS sectors')
    await pool.query('DROP TABLE IF EXISTS limit_up_cache')
    await pool.query('DROP TABLE IF EXISTS lhb_cache')
    await pool.query('DROP TABLE IF EXISTS hsgt_cache')
    await pool.query('DROP TABLE IF EXISTS moneyflow_cache')
    await pool.query('DROP TABLE IF EXISTS index_daily_cache')
    await pool.query('DROP TABLE IF EXISTS daily_basic_cache')
    await pool.query('DROP TABLE IF EXISTS adj_factor_cache')
    await pool.query('DROP TABLE IF EXISTS kline_cache')
    await pool.query('DROP TABLE IF EXISTS trade_calendar')
    await pool.query('DROP TABLE IF EXISTS stocks')

    await pool.query('SET FOREIGN_KEY_CHECKS = 1')

    // ── 1. Users ──
    await pool.query(`
      CREATE TABLE users (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        username        VARCHAR(32)     NOT NULL,
        password        VARCHAR(255)    NOT NULL COMMENT 'bcrypt hash',
        phone           VARCHAR(16)     DEFAULT NULL,
        email           VARCHAR(128)    DEFAULT NULL,
        nickname        VARCHAR(64)     DEFAULT '',
        avatar          VARCHAR(512)    DEFAULT '',
        role            VARCHAR(16)     NOT NULL DEFAULT 'user',
        status          VARCHAR(16)     NOT NULL DEFAULT 'active',
        last_login_at   DATETIME        DEFAULT NULL,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at      DATETIME        DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_users_username (username, deleted_at),
        UNIQUE KEY uk_users_phone (phone),
        UNIQUE KEY uk_users_email (email),
        KEY idx_users_status (status, deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 2. User settings ──
    await pool.query(`
      CREATE TABLE user_settings (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id         BIGINT UNSIGNED NOT NULL,
        setting_key     VARCHAR(64)     NOT NULL,
        setting_value   JSON            NOT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_user_settings (user_id, setting_key),
        CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 3. Auth tokens ──
    await pool.query(`
      CREATE TABLE auth_tokens (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id         BIGINT UNSIGNED NOT NULL,
        token           VARCHAR(512)    NOT NULL,
        token_type      VARCHAR(16)     NOT NULL DEFAULT 'session',
        expires_at      DATETIME        NOT NULL,
        revoked_at      DATETIME        DEFAULT NULL,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_auth_tokens_token (token(255)),
        KEY idx_auth_tokens_user (user_id, revoked_at, expires_at),
        CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 4. Stocks ──
    await pool.query(`
      CREATE TABLE stocks (
        ts_code         VARCHAR(16)     NOT NULL,
        symbol          VARCHAR(8)      NOT NULL,
        name            VARCHAR(32)     NOT NULL,
        full_name       VARCHAR(128)    DEFAULT '',
        en_name         VARCHAR(128)    DEFAULT '',
        area            VARCHAR(16)     DEFAULT '',
        industry        VARCHAR(32)     DEFAULT '',
        market          VARCHAR(8)      NOT NULL DEFAULT '',
        list_status     VARCHAR(4)      NOT NULL DEFAULT 'L',
        list_date       DATE            DEFAULT NULL,
        delist_date     DATE            DEFAULT NULL,
        is_hsgt         TINYINT(1)      NOT NULL DEFAULT 0,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ts_code),
        KEY idx_stocks_symbol (symbol),
        KEY idx_stocks_name (name),
        FULLTEXT KEY ft_stocks_name_code (name, symbol),
        KEY idx_stocks_industry (industry, list_status),
        KEY idx_stocks_area (area),
        KEY idx_stocks_list_status (list_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 5. Trade calendar ──
    await pool.query(`
      CREATE TABLE trade_calendar (
        trade_date      DATE            NOT NULL,
        is_open         TINYINT(1)      NOT NULL,
        pretrade_date   DATE            DEFAULT NULL,
        nexttrade_date  DATE            DEFAULT NULL,
        description     VARCHAR(128)    DEFAULT '',
        PRIMARY KEY (trade_date),
        KEY idx_trade_cal_open (is_open, trade_date DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 6. Sectors ──
    await pool.query(`
      CREATE TABLE sectors (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        sector_code     VARCHAR(32)     DEFAULT NULL,
        name            VARCHAR(64)     NOT NULL,
        sector_type     VARCHAR(16)     NOT NULL,
        sort_order      INT             NOT NULL DEFAULT 0,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_sectors_name_type (name, sector_type),
        KEY idx_sectors_type (sector_type, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 7. Sector stocks ──
    await pool.query(`
      CREATE TABLE sector_stocks (
        sector_id       BIGINT UNSIGNED NOT NULL,
        ts_code         VARCHAR(16)     NOT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (sector_id, ts_code),
        KEY idx_sector_stocks_code (ts_code),
        CONSTRAINT fk_sector_id FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 8. K-line cache ──
    await pool.query(`
      CREATE TABLE kline_cache (
        ts_code         VARCHAR(16)     NOT NULL,
        period          VARCHAR(8)      NOT NULL COMMENT 'daily|weekly|monthly',
        trade_date      DATE            NOT NULL,
        open            DECIMAL(12,2)   DEFAULT NULL,
        high            DECIMAL(12,2)   DEFAULT NULL,
        low             DECIMAL(12,2)   DEFAULT NULL,
        close           DECIMAL(12,2)   DEFAULT NULL,
        pre_close       DECIMAL(12,2)   DEFAULT NULL,
        vol             DECIMAL(20,2)   DEFAULT NULL,
        amount          DECIMAL(24,2)   DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ts_code, period, trade_date),
        KEY idx_kline_date (trade_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 9. Adjust factor cache ──
    await pool.query(`
      CREATE TABLE adj_factor_cache (
        ts_code         VARCHAR(16)     NOT NULL,
        trade_date      DATE            NOT NULL,
        adj_factor      DECIMAL(12,6)   NOT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ts_code, trade_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 10. Daily basic cache ──
    await pool.query(`
      CREATE TABLE daily_basic_cache (
        ts_code         VARCHAR(16)     NOT NULL,
        trade_date      DATE            NOT NULL,
        turnover_rate   DECIMAL(10,4)   DEFAULT NULL,
        turnover_rate_f DECIMAL(10,4)   DEFAULT NULL,
        volume_ratio    DECIMAL(10,4)   DEFAULT NULL,
        pe              DECIMAL(12,2)   DEFAULT NULL,
        pe_ttm          DECIMAL(12,2)   DEFAULT NULL,
        pb              DECIMAL(12,2)   DEFAULT NULL,
        ps              DECIMAL(12,2)   DEFAULT NULL,
        pcf             DECIMAL(12,2)   DEFAULT NULL,
        total_mv        DECIMAL(24,2)   DEFAULT NULL,
        circ_mv         DECIMAL(24,2)   DEFAULT NULL,
        limit_status    VARCHAR(4)      DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ts_code, trade_date),
        KEY idx_daily_basic_date (trade_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 11. Index daily cache ──
    await pool.query(`
      CREATE TABLE index_daily_cache (
        ts_code         VARCHAR(16)     NOT NULL,
        trade_date      DATE            NOT NULL,
        open            DECIMAL(12,2)   DEFAULT NULL,
        high            DECIMAL(12,2)   DEFAULT NULL,
        low             DECIMAL(12,2)   DEFAULT NULL,
        close           DECIMAL(12,2)   DEFAULT NULL,
        pre_close       DECIMAL(12,2)   DEFAULT NULL,
        vol             DECIMAL(20,2)   DEFAULT NULL,
        amount          DECIMAL(24,2)   DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ts_code, trade_date),
        KEY idx_index_date (trade_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 12. Moneyflow cache ──
    await pool.query(`
      CREATE TABLE moneyflow_cache (
        ts_code         VARCHAR(16)     NOT NULL,
        trade_date      DATE            NOT NULL,
        buy_sm_vol      DECIMAL(20,2)   DEFAULT NULL,
        buy_sm_amount   DECIMAL(24,2)   DEFAULT NULL,
        sell_sm_vol     DECIMAL(20,2)   DEFAULT NULL,
        sell_sm_amount  DECIMAL(24,2)   DEFAULT NULL,
        buy_md_vol      DECIMAL(20,2)   DEFAULT NULL,
        buy_md_amount   DECIMAL(24,2)   DEFAULT NULL,
        sell_md_vol     DECIMAL(20,2)   DEFAULT NULL,
        sell_md_amount  DECIMAL(24,2)   DEFAULT NULL,
        buy_lg_vol      DECIMAL(20,2)   DEFAULT NULL,
        buy_lg_amount   DECIMAL(24,2)   DEFAULT NULL,
        sell_lg_vol     DECIMAL(20,2)   DEFAULT NULL,
        sell_lg_amount  DECIMAL(24,2)   DEFAULT NULL,
        buy_elg_vol     DECIMAL(20,2)   DEFAULT NULL,
        buy_elg_amount  DECIMAL(24,2)   DEFAULT NULL,
        sell_elg_vol    DECIMAL(20,2)   DEFAULT NULL,
        sell_elg_amount DECIMAL(24,2)   DEFAULT NULL,
        net_mf_amount   DECIMAL(24,2)   DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ts_code, trade_date),
        KEY idx_moneyflow_date (trade_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 13. HSGT cache ──
    await pool.query(`
      CREATE TABLE hsgt_cache (
        trade_date      DATE            NOT NULL PRIMARY KEY,
        hgt_net         DECIMAL(20,2)   DEFAULT NULL,
        sgt_net         DECIMAL(20,2)   DEFAULT NULL,
        north_net       DECIMAL(20,2)   DEFAULT NULL,
        south_hgt_net   DECIMAL(20,2)   DEFAULT NULL,
        south_sgt_net   DECIMAL(20,2)   DEFAULT NULL,
        south_net       DECIMAL(20,2)   DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 14. Sector rank cache ──
    await pool.query(`
      CREATE TABLE sector_rank_cache (
        sector_id       BIGINT UNSIGNED NOT NULL,
        trade_date      DATE            NOT NULL,
        change_pct      DECIMAL(8,2)    DEFAULT NULL,
        rise_count      INT             NOT NULL DEFAULT 0,
        fall_count      INT             NOT NULL DEFAULT 0,
        lead_stock      VARCHAR(16)     DEFAULT NULL,
        total_vol       DECIMAL(24,2)   DEFAULT NULL,
        total_amount    DECIMAL(24,2)   DEFAULT NULL,
        net_mf_amount   DECIMAL(24,2)   DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (sector_id, trade_date),
        KEY idx_sector_rank_date (trade_date, change_pct DESC),
        CONSTRAINT fk_sector_rank FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 15. LHB cache ──
    await pool.query(`
      CREATE TABLE lhb_cache (
        trade_date      DATE            NOT NULL,
        ts_code         VARCHAR(16)     NOT NULL,
        name            VARCHAR(32)     NOT NULL,
        close           DECIMAL(12,2)   DEFAULT NULL,
        change_pct      DECIMAL(8,2)    DEFAULT NULL,
        turnover_rate   DECIMAL(10,4)   DEFAULT NULL,
        buy_amount      DECIMAL(24,2)   DEFAULT NULL,
        sell_amount     DECIMAL(24,2)   DEFAULT NULL,
        net_amount      DECIMAL(24,2)   DEFAULT NULL,
        buy_rate        DECIMAL(6,4)    DEFAULT NULL,
        sell_rate       DECIMAL(6,4)    DEFAULT NULL,
        buy_inst_times  INT             NOT NULL DEFAULT 0,
        buy_inst_amount DECIMAL(24,2)   DEFAULT NULL,
        sell_inst_times INT             NOT NULL DEFAULT 0,
        sell_inst_amount DECIMAL(24,2)  DEFAULT NULL,
        net_inst_amount DECIMAL(24,2)   DEFAULT NULL,
        reason          VARCHAR(255)    DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (trade_date, ts_code),
        KEY idx_lhb_net (trade_date, net_amount DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 16. Limit-up cache ──
    await pool.query(`
      CREATE TABLE limit_up_cache (
        trade_date      DATE            NOT NULL,
        ts_code         VARCHAR(16)     NOT NULL,
        name            VARCHAR(32)     NOT NULL,
        price           DECIMAL(12,2)   DEFAULT NULL,
        change_pct      DECIMAL(8,2)    DEFAULT NULL,
        limit_type      VARCHAR(8)      NOT NULL DEFAULT 'up',
        consecutive_days INT            NOT NULL DEFAULT 1,
        seal_rate       DECIMAL(6,4)    DEFAULT NULL,
        sector_name     VARCHAR(64)     DEFAULT NULL,
        first_limit_time TIME           DEFAULT NULL,
        last_open_time  TIME            DEFAULT NULL,
        order_amt       DECIMAL(24,2)   DEFAULT NULL,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (trade_date, ts_code),
        KEY idx_limit_up_days (trade_date, consecutive_days DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 17. Watchlist ──
    await pool.query(`
      CREATE TABLE watchlist (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id         BIGINT UNSIGNED NOT NULL,
        ts_code         VARCHAR(16)     NOT NULL,
        sort_order      INT             NOT NULL DEFAULT 0,
        note            VARCHAR(255)    DEFAULT '',
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_watchlist_user_stock (user_id, ts_code),
        KEY idx_watchlist_user_order (user_id, sort_order),
        CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 18. User stock notes ──
    await pool.query(`
      CREATE TABLE user_stock_notes (
        user_id         BIGINT UNSIGNED NOT NULL,
        ts_code         VARCHAR(16)     NOT NULL,
        note            VARCHAR(1024)   DEFAULT '',
        tags            JSON            DEFAULT NULL,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, ts_code),
        CONSTRAINT fk_stock_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 19. Screener strategies ──
    await pool.query(`
      CREATE TABLE screener_strategies (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id         BIGINT UNSIGNED DEFAULT NULL,
        name            VARCHAR(64)     NOT NULL,
        description     VARCHAR(255)    DEFAULT '',
        strategy_key    VARCHAR(32)     DEFAULT NULL,
        filters         JSON            NOT NULL,
        tags            JSON            DEFAULT NULL,
        is_preset       TINYINT(1)      NOT NULL DEFAULT 0,
        sort_order      INT             NOT NULL DEFAULT 0,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_screener_user (user_id),
        KEY idx_screener_preset (is_preset, sort_order),
        CONSTRAINT fk_screener_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 20. Screener results ──
    await pool.query(`
      CREATE TABLE screener_results (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        strategy_id     BIGINT UNSIGNED NOT NULL,
        user_id         BIGINT UNSIGNED DEFAULT NULL,
        trade_date      DATE            NOT NULL,
        stock_count     INT             NOT NULL DEFAULT 0,
        execution_ms    INT             NOT NULL DEFAULT 0,
        result_snapshot JSON            DEFAULT NULL,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_screener_results_strategy (strategy_id, trade_date),
        KEY idx_screener_results_user (user_id, created_at DESC),
        CONSTRAINT fk_screener_results_strategy FOREIGN KEY (strategy_id) REFERENCES screener_strategies(id) ON DELETE CASCADE,
        CONSTRAINT fk_screener_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 21. Chat sessions ──
    await pool.query(`
      CREATE TABLE chat_sessions (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id         BIGINT UNSIGNED NOT NULL,
        title           VARCHAR(128)    NOT NULL DEFAULT '新对话',
        model           VARCHAR(32)     NOT NULL DEFAULT 'default',
        context         JSON            DEFAULT NULL,
        message_count   INT             NOT NULL DEFAULT 0,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_chat_sessions_user (user_id, updated_at DESC),
        CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ── 22. Chat messages ──
    await pool.query(`
      CREATE TABLE chat_messages (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        session_id      BIGINT UNSIGNED NOT NULL,
        role            VARCHAR(16)     NOT NULL,
        content         TEXT            NOT NULL,
        images          JSON            DEFAULT NULL,
        metadata        JSON            DEFAULT NULL,
        token_count     INT             DEFAULT NULL,
        created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_chat_messages_session (session_id, created_at),
        CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // ════════════════════════════════════════════════════
    //  Seed data
    // ════════════════════════════════════════════════════

    // -- Preset screener strategies --
    const presetStrategies = [
      ['放量突破',   '成交量 > 1.5倍均量 + 站上所有均线 + 涨幅 > 2%', 'strategy1',
       JSON.stringify({ ma: 'aboveAll', vratioMin: 1.5, changeMin: 2 }), JSON.stringify(['技术面', '短线']), 1],
      ['MACD金叉',   'MACD DIF 上穿 DEA + 温和放量', 'strategy2',
       JSON.stringify({ macd: 'goldenCross', vratioMin: 1.0, vratioMax: 2.5 }), JSON.stringify(['技术面', '中线']), 2],
      ['超跌反弹',   'RSI < 30 + 近5日跌幅 > 5%', 'strategy3',
       JSON.stringify({ rsiMax: 30, changeMax: -5 }), JSON.stringify(['技术面', '短线']), 3],
      ['KDJ超卖',    'KDJ < 20 + 短期超卖', 'strategy4',
       JSON.stringify({ kdj: 'oversold' }), JSON.stringify(['技术面', '短线']), 4],
      ['价值投资',   'PE < 15 + ROE > 15%', 'strategy5',
       JSON.stringify({ peMax: 15, roeMin: 15 }), JSON.stringify(['基本面', '长线']), 5],
      ['业绩增长',   '营收增速 > 10% + 利润增速 > 20%', 'strategy6',
       JSON.stringify({ revGrowthMin: 10, profitGrowthMin: 20 }), JSON.stringify(['基本面', '中线']), 6],
      ['小盘成长',   '流通市值 < 100亿 + 营收增速 > 20%', 'strategy7',
       JSON.stringify({ capMax: 100, revGrowthMin: 20 }), JSON.stringify(['基本面', '短线']), 7],
      ['布林带突破', '价格突破布林带上轨', 'strategy8',
       JSON.stringify({ boll: 'upper' }), JSON.stringify(['技术面', '短线']), 8],
    ]
    for (const [name, desc, key, filters, tags, sort] of presetStrategies) {
      await pool.query(
        `INSERT INTO screener_strategies (user_id, name, description, strategy_key, filters, tags, is_preset, sort_order)
         VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)`,
        [name, desc, key, filters, tags, sort]
      )
    }

    console.log('[DB] Schema initialized with demo data')
  } catch (err) {
    console.error('[DB] Init error:', err)
    initialized = false
  }
}
