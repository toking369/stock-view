-- =============================================================================
-- StockView — MySQL 数据库 Schema
-- 引擎: MySQL 8.0+ / MariaDB 10.5+
-- 字符集: utf8mb4 · 排序: utf8mb4_unicode_ci
-- 遵循 mysql-patterns 设计规范
-- =============================================================================

-- =============================================================================
-- Domain 1: 用户系统 (User System)
-- =============================================================================

-- 1.1 用户主表
CREATE TABLE users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username        VARCHAR(32)     NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL COMMENT 'bcrypt 哈希',
    phone           VARCHAR(16)     DEFAULT NULL COMMENT '手机号（唯一）',
    email           VARCHAR(128)    DEFAULT NULL COMMENT '邮箱',
    nickname        VARCHAR(64)     DEFAULT '' COMMENT '昵称',
    avatar          VARCHAR(512)    DEFAULT '' COMMENT '头像 URL',
    role            VARCHAR(16)     NOT NULL DEFAULT 'user' COMMENT 'user|admin',
    status          VARCHAR(16)     NOT NULL DEFAULT 'active' COMMENT 'active|disabled|locked',
    last_login_at   DATETIME        DEFAULT NULL COMMENT '最后登录时间',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME        DEFAULT NULL COMMENT '软删除时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username, deleted_at) COMMENT '同名 + 未删除唯一',
    UNIQUE KEY uk_users_phone (phone),
    UNIQUE KEY uk_users_email (email),
    KEY idx_users_status (status, deleted_at) COMMENT '活跃用户筛选'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='用户主表 — 支持软删除、角色、状态';

-- 1.2 用户设置
CREATE TABLE user_settings (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    setting_key     VARCHAR(64)     NOT NULL COMMENT '设置键名',
    setting_value   JSON            NOT NULL COMMENT '设置值',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_settings (user_id, setting_key),
    CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='用户设置 — kv 结构，JSON 存值';

-- 1.3 登录令牌 (Session Token)
CREATE TABLE auth_tokens (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    token           VARCHAR(512)    NOT NULL COMMENT '令牌值',
    token_type      VARCHAR(16)     NOT NULL DEFAULT 'session' COMMENT 'session|refresh|reset',
    expires_at      DATETIME        NOT NULL COMMENT '过期时间',
    revoked_at      DATETIME        DEFAULT NULL COMMENT '撤销时间',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_auth_tokens_token (token(255)) COMMENT '令牌唯一',
    KEY idx_auth_tokens_user (user_id, revoked_at, expires_at) COMMENT '用户有效令牌查询',
    CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='登录令牌 — 支持 session / refresh / password-reset 三类令牌';

-- =============================================================================
-- Domain 2: 股票参考数据 (Stock Reference)
-- =============================================================================

-- 2.1 股票基本信息（每日更新）
CREATE TABLE stocks (
    ts_code         VARCHAR(16)     NOT NULL COMMENT 'TS 代码 600519.SH',
    symbol          VARCHAR(8)      NOT NULL COMMENT '6位数字代码',
    name            VARCHAR(32)     NOT NULL COMMENT '股票简称',
    full_name       VARCHAR(128)    DEFAULT '' COMMENT '股票全称',
    en_name         VARCHAR(128)    DEFAULT '' COMMENT '英文名',
    area            VARCHAR(16)     DEFAULT '' COMMENT '地域',
    industry        VARCHAR(32)     DEFAULT '' COMMENT '行业',
    market          VARCHAR(8)      NOT NULL DEFAULT '' COMMENT '市场 SH/SZ/BJ',
    list_status     VARCHAR(4)      NOT NULL DEFAULT 'L' COMMENT '上市状态 L上市 D退市 P暂停',
    list_date       DATE            DEFAULT NULL COMMENT '上市日期',
    delist_date     DATE            DEFAULT NULL COMMENT '退市日期',
    is_hsgt         TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否沪深港通标的',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ts_code),
    KEY idx_stocks_symbol (symbol),
    KEY idx_stocks_name (name) COMMENT '股票名称搜索',
    FULLTEXT KEY ft_stocks_name_code (name, symbol) COMMENT '全文搜索',
    KEY idx_stocks_industry (industry, list_status),
    KEY idx_stocks_area (area),
    KEY idx_stocks_list_status (list_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='A股股票基本信息 — 来源 TSDP stock_basic，每日收盘后刷新';

-- 2.2 交易日历
CREATE TABLE trade_calendar (
    trade_date      DATE            NOT NULL COMMENT '日期',
    is_open         TINYINT(1)      NOT NULL COMMENT '1=交易日 0=休市',
    pretrade_date   DATE            DEFAULT NULL COMMENT '前一交易日',
    nexttrade_date  DATE            DEFAULT NULL COMMENT '后一交易日',
    description     VARCHAR(128)    DEFAULT '' COMMENT '节假日备注',
    PRIMARY KEY (trade_date),
    KEY idx_trade_cal_open (is_open, trade_date DESC) COMMENT '查找最近交易日'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='A股交易日历 — 用于计算复权、查询上一个/下一个交易日';

-- 2.3 板块定义
CREATE TABLE sectors (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sector_code     VARCHAR(32)     DEFAULT NULL COMMENT '板块代码（东方财富 BK 代码）',
    name            VARCHAR(64)     NOT NULL COMMENT '板块名称',
    sector_type     VARCHAR(16)     NOT NULL COMMENT 'industry|concept|area',
    sort_order      INT             NOT NULL DEFAULT 0 COMMENT '排序',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_sectors_name_type (name, sector_type),
    KEY idx_sectors_type (sector_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='板块/概念/地域分类定义';

-- 2.4 板块成分股
CREATE TABLE sector_stocks (
    sector_id       BIGINT UNSIGNED NOT NULL,
    ts_code         VARCHAR(16)     NOT NULL,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sector_id, ts_code),
    KEY idx_sector_stocks_code (ts_code),
    CONSTRAINT fk_sector_id FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='板块成分股映射';

-- =============================================================================
-- Domain 3: 市场数据缓存 (Market Cache)
-- =============================================================================

-- 3.1 K线数据缓存
CREATE TABLE kline_cache (
    ts_code         VARCHAR(16)     NOT NULL COMMENT '股票代码',
    period          VARCHAR(8)      NOT NULL COMMENT 'daily|weekly|monthly',
    trade_date      DATE            NOT NULL COMMENT '交易日',
    open            DECIMAL(12,2)   DEFAULT NULL COMMENT '开盘价',
    high            DECIMAL(12,2)   DEFAULT NULL COMMENT '最高价',
    low             DECIMAL(12,2)   DEFAULT NULL COMMENT '最低价',
    close           DECIMAL(12,2)   DEFAULT NULL COMMENT '收盘价',
    pre_close       DECIMAL(12,2)   DEFAULT NULL COMMENT '前收盘价',
    vol             DECIMAL(20,2)   DEFAULT NULL COMMENT '成交量（股）',
    amount          DECIMAL(24,2)   DEFAULT NULL COMMENT '成交额（元）',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ts_code, period, trade_date) COMMENT '覆盖查询：WHERE ts_code + period + range ORDER BY trade_date',
    KEY idx_kline_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='K线数据缓存 — 未复权原始数据，来源 TSDP daily/weekly/monthly';

-- 3.2 复权因子缓存
CREATE TABLE adj_factor_cache (
    ts_code         VARCHAR(16)     NOT NULL,
    trade_date      DATE            NOT NULL,
    adj_factor      DECIMAL(12,6)   NOT NULL COMMENT '复权因子',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ts_code, trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='复权因子 — 来源 TSDP adj_factor';

-- 3.3 每日指标缓存 (PE/PB/换手率等)
CREATE TABLE daily_basic_cache (
    ts_code         VARCHAR(16)     NOT NULL COMMENT '股票代码',
    trade_date      DATE            NOT NULL COMMENT '交易日',
    turnover_rate   DECIMAL(10,4)   DEFAULT NULL COMMENT '换手率 %',
    turnover_rate_f DECIMAL(10,4)   DEFAULT NULL COMMENT '自由流通换手率 %',
    volume_ratio    DECIMAL(10,4)   DEFAULT NULL COMMENT '量比',
    pe              DECIMAL(12,2)   DEFAULT NULL COMMENT '市盈率（静态）',
    pe_ttm          DECIMAL(12,2)   DEFAULT NULL COMMENT '市盈率 TTM',
    pb              DECIMAL(12,2)   DEFAULT NULL COMMENT '市净率',
    ps              DECIMAL(12,2)   DEFAULT NULL COMMENT '市销率',
    pcf             DECIMAL(12,2)   DEFAULT NULL COMMENT '市现率',
    total_mv        DECIMAL(24,2)   DEFAULT NULL COMMENT '总市值（元）',
    circ_mv         DECIMAL(24,2)   DEFAULT NULL COMMENT '流通市值（元）',
    limit_status    VARCHAR(4)       DEFAULT NULL COMMENT 'D涨停 d跌停',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ts_code, trade_date),
    KEY idx_daily_basic_date (trade_date) COMMENT '按日期批量查询'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='每日基本面指标 — 来源 TSDP daily_basic';

-- 3.4 指数日线缓存
CREATE TABLE index_daily_cache (
    ts_code         VARCHAR(16)     NOT NULL COMMENT '指数代码 000001.SH',
    trade_date      DATE            NOT NULL,
    open            DECIMAL(12,2)   DEFAULT NULL,
    high            DECIMAL(12,2)   DEFAULT NULL,
    low             DECIMAL(12,2)   DEFAULT NULL,
    close           DECIMAL(12,2)   DEFAULT NULL,
    pre_close       DECIMAL(12,2)   DEFAULT NULL,
    vol             DECIMAL(20,2)   DEFAULT NULL COMMENT '成交量',
    amount          DECIMAL(24,2)   DEFAULT NULL COMMENT '成交额',
    change          DECIMAL(8,2)    GENERATED ALWAYS AS (ROUND((close - pre_close) / pre_close * 100, 2)) STORED COMMENT '涨跌幅 %',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ts_code, trade_date),
    KEY idx_index_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='指数日线数据 — 来源 TSDP index_daily';

-- =============================================================================
-- Domain 4: 资金流向 (Capital Flow)
-- =============================================================================

-- 4.1 个股资金流向缓存
CREATE TABLE moneyflow_cache (
    ts_code         VARCHAR(16)     NOT NULL COMMENT '股票代码',
    trade_date      DATE            NOT NULL COMMENT '交易日',
    -- 小单 (<=4万)
    buy_sm_vol      DECIMAL(20,2)   DEFAULT NULL COMMENT '小单买入量',
    buy_sm_amount   DECIMAL(24,2)   DEFAULT NULL COMMENT '小单买入额',
    sell_sm_vol     DECIMAL(20,2)   DEFAULT NULL COMMENT '小单卖出量',
    sell_sm_amount  DECIMAL(24,2)   DEFAULT NULL COMMENT '小单卖出额',
    -- 中单 (4~20万)
    buy_md_vol      DECIMAL(20,2)   DEFAULT NULL COMMENT '中单买入量',
    buy_md_amount   DECIMAL(24,2)   DEFAULT NULL COMMENT '中单买入额',
    sell_md_vol     DECIMAL(20,2)   DEFAULT NULL COMMENT '中单卖出量',
    sell_md_amount  DECIMAL(24,2)   DEFAULT NULL COMMENT '中单卖出额',
    -- 大单 (20~100万)
    buy_lg_vol      DECIMAL(20,2)   DEFAULT NULL COMMENT '大单买入量',
    buy_lg_amount   DECIMAL(24,2)   DEFAULT NULL COMMENT '大单买入额',
    sell_lg_vol     DECIMAL(20,2)   DEFAULT NULL COMMENT '大单卖出量',
    sell_lg_amount  DECIMAL(24,2)   DEFAULT NULL COMMENT '大单卖出额',
    -- 特大单 (>100万)
    buy_elg_vol     DECIMAL(20,2)   DEFAULT NULL COMMENT '特大单买入量',
    buy_elg_amount  DECIMAL(24,2)   DEFAULT NULL COMMENT '特大单买入额',
    sell_elg_vol    DECIMAL(20,2)   DEFAULT NULL COMMENT '特大单卖出量',
    sell_elg_amount DECIMAL(24,2)   DEFAULT NULL COMMENT '特大单卖出额',
    -- 汇总
    net_mf_amount   DECIMAL(24,2)   DEFAULT NULL COMMENT '净流入额（主力=大单+特大单）',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ts_code, trade_date),
    KEY idx_moneyflow_date (trade_date) COMMENT '按日查询全市场资金排行'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='个股资金流向缓存 — 来源 TSDP moneyflow';

-- 4.2 沪深港通资金流向缓存
CREATE TABLE hsgt_cache (
    trade_date      DATE            NOT NULL PRIMARY KEY COMMENT '交易日',
    -- 北向
    hgt_net         DECIMAL(20,2)   DEFAULT NULL COMMENT '沪股通净流入（万）',
    sgt_net         DECIMAL(20,2)   DEFAULT NULL COMMENT '深股通净流入（万）',
    north_net       DECIMAL(20,2)   DEFAULT NULL COMMENT '北向合计净流入（万）',
    -- 南向
    south_hgt_net   DECIMAL(20,2)   DEFAULT NULL COMMENT '沪港股通净流入（万）',
    south_sgt_net   DECIMAL(20,2)   DEFAULT NULL COMMENT '深港股通净流入（万）',
    south_net       DECIMAL(20,2)   DEFAULT NULL COMMENT '南向合计净流入（万）',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='沪深港通资金流向 — 来源 TSDP moneyflow_hsgt';

-- =============================================================================
-- Domain 5: 板块行情 (Sector)
-- =============================================================================

-- 5.1 板块排行缓存
CREATE TABLE sector_rank_cache (
    sector_id       BIGINT UNSIGNED NOT NULL,
    trade_date      DATE            NOT NULL,
    change_pct      DECIMAL(8,2)    DEFAULT NULL COMMENT '板块涨幅 %',
    rise_count      INT             NOT NULL DEFAULT 0 COMMENT '上涨家数',
    fall_count      INT             NOT NULL DEFAULT 0 COMMENT '下跌家数',
    lead_stock      VARCHAR(16)     DEFAULT NULL COMMENT '领涨股 ts_code',
    total_vol       DECIMAL(24,2)   DEFAULT NULL COMMENT '总成交量',
    total_amount    DECIMAL(24,2)   DEFAULT NULL COMMENT '总成交额',
    net_mf_amount   DECIMAL(24,2)   DEFAULT NULL COMMENT '主力净流入',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sector_id, trade_date),
    KEY idx_sector_rank_date (trade_date, change_pct DESC) COMMENT '板块排行查询',
    CONSTRAINT fk_sector_rank FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='板块排行缓存 — 盘中每30s刷新';

-- =============================================================================
-- Domain 6: 龙虎榜 & 涨停 (LHB)
-- =============================================================================

-- 6.1 龙虎榜数据缓存
CREATE TABLE lhb_cache (
    trade_date      DATE            NOT NULL COMMENT '上榜日期',
    ts_code         VARCHAR(16)     NOT NULL COMMENT '股票代码',
    name            VARCHAR(32)     NOT NULL COMMENT '股票名称',
    close           DECIMAL(12,2)   DEFAULT NULL COMMENT '收盘价',
    change_pct      DECIMAL(8,2)    DEFAULT NULL COMMENT '涨跌幅 %',
    turnover_rate   DECIMAL(10,4)   DEFAULT NULL COMMENT '换手率 %',
    -- 买卖汇总
    buy_amount      DECIMAL(24,2)   DEFAULT NULL COMMENT '买入总额（元）',
    sell_amount     DECIMAL(24,2)   DEFAULT NULL COMMENT '卖出总额（元）',
    net_amount      DECIMAL(24,2)   DEFAULT NULL COMMENT '净额（元）',
    buy_rate        DECIMAL(6,4)    DEFAULT NULL COMMENT '买入占总成交比',
    sell_rate       DECIMAL(6,4)    DEFAULT NULL COMMENT '卖出占总成交比',
    -- 机构席位
    buy_inst_times  INT             NOT NULL DEFAULT 0 COMMENT '机构买入次数',
    buy_inst_amount DECIMAL(24,2)   DEFAULT NULL COMMENT '机构买入总额（元）',
    sell_inst_times INT             NOT NULL DEFAULT 0 COMMENT '机构卖出次数',
    sell_inst_amount DECIMAL(24,2)  DEFAULT NULL COMMENT '机构卖出总额（元）',
    net_inst_amount DECIMAL(24,2)   DEFAULT NULL COMMENT '机构净额（元）',
    -- 原因
    reason          VARCHAR(255)    DEFAULT NULL COMMENT '上榜原因',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (trade_date, ts_code),
    KEY idx_lhb_net (trade_date, net_amount DESC) COMMENT '龙虎榜净额排行'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='龙虎榜数据 — 来源 TSDP/东方财富，盘后缓存';

-- 6.2 涨停板缓存
CREATE TABLE limit_up_cache (
    trade_date      DATE            NOT NULL,
    ts_code         VARCHAR(16)     NOT NULL,
    name            VARCHAR(32)     NOT NULL COMMENT '股票名称',
    price           DECIMAL(12,2)   DEFAULT NULL COMMENT '涨停/跌停价',
    change_pct      DECIMAL(8,2)    DEFAULT NULL COMMENT '涨跌幅 %',
    limit_type      VARCHAR(8)      NOT NULL DEFAULT 'up' COMMENT 'up涨停 down跌停',
    consecutive_days INT            NOT NULL DEFAULT 1 COMMENT '连板天数',
    seal_rate       DECIMAL(6,4)    DEFAULT NULL COMMENT '封板率',
    sector_name     VARCHAR(64)     DEFAULT NULL COMMENT '所属板块',
    first_limit_time TIME           DEFAULT NULL COMMENT '首次封板时间',
    last_open_time  TIME            DEFAULT NULL COMMENT '最后开板时间',
    order_amt       DECIMAL(24,2)   DEFAULT NULL COMMENT '封单额',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (trade_date, ts_code),
    KEY idx_limit_up_days (trade_date, consecutive_days DESC) COMMENT '连板排行'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='涨停/跌停板缓存 — 盘中实时跟踪';

-- =============================================================================
-- Domain 7: 用户功能 (User Features)
-- =============================================================================

-- 7.1 自选股
CREATE TABLE watchlist (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    ts_code         VARCHAR(16)     NOT NULL COMMENT '股票代码',
    sort_order      INT             NOT NULL DEFAULT 0 COMMENT '排序序号',
    note            VARCHAR(255)    DEFAULT '' COMMENT '备注',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_watchlist_user_stock (user_id, ts_code),
    KEY idx_watchlist_user_order (user_id, sort_order) COMMENT '用户自选股排序查询',
    CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='用户自选股 — 支持排序、备注';

-- 7.2 用户股票笔记
CREATE TABLE user_stock_notes (
    user_id         BIGINT UNSIGNED NOT NULL,
    ts_code         VARCHAR(16)     NOT NULL COMMENT '股票代码',
    note            VARCHAR(1024)   DEFAULT '' COMMENT '笔记内容',
    tags            JSON            DEFAULT NULL COMMENT '标签数组',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, ts_code),
    CONSTRAINT fk_stock_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='用户对个股的笔记 — 扩展自选股功能';

-- =============================================================================
-- Domain 8: 选股器 (Screener)
-- =============================================================================

-- 8.1 选股策略定义
CREATE TABLE screener_strategies (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED DEFAULT NULL COMMENT 'NULL=系统预设，非NULL=用户创建',
    name            VARCHAR(64)     NOT NULL COMMENT '策略名称',
    description     VARCHAR(255)    DEFAULT '' COMMENT '策略描述',
    strategy_key    VARCHAR(32)     DEFAULT NULL COMMENT '预设策略标识（用于系统预设）',
    filters         JSON            NOT NULL COMMENT '筛选条件 JSON',
    tags            JSON            DEFAULT NULL COMMENT '标签数组',
    is_preset       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否系统预设',
    sort_order      INT             NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_screener_user (user_id),
    KEY idx_screener_preset (is_preset, sort_order),
    CONSTRAINT fk_screener_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='选股策略定义 — 系统预设 + 用户自定义';

-- 8.2 选股结果快照
CREATE TABLE screener_results (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    strategy_id     BIGINT UNSIGNED NOT NULL COMMENT '关联策略',
    user_id         BIGINT UNSIGNED DEFAULT NULL COMMENT '执行用户（NULL=系统）',
    trade_date      DATE            NOT NULL COMMENT '执行日期',
    stock_count     INT             NOT NULL DEFAULT 0 COMMENT '结果数量',
    execution_ms    INT             NOT NULL DEFAULT 0 COMMENT '执行耗时(ms)',
    result_snapshot JSON            DEFAULT NULL COMMENT '结果快照 [{ts_code, name, score}]',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_screener_results_strategy (strategy_id, trade_date),
    KEY idx_screener_results_user (user_id, created_at DESC),
    CONSTRAINT fk_screener_results_strategy FOREIGN KEY (strategy_id) REFERENCES screener_strategies(id) ON DELETE CASCADE,
    CONSTRAINT fk_screener_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='选股执行结果快照 — 缓存上次执行结果，避免重复计算';

-- =============================================================================
-- Domain 9: AI 问答系统 (AI Chat)
-- =============================================================================

-- 9.1 聊天会话
CREATE TABLE chat_sessions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(128)    NOT NULL DEFAULT '新对话',
    model           VARCHAR(32)     NOT NULL DEFAULT 'default' COMMENT '使用的模型',
    context         JSON            DEFAULT NULL COMMENT '会话上下文元数据',
    message_count   INT             NOT NULL DEFAULT 0 COMMENT '消息数',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chat_sessions_user (user_id, updated_at DESC) COMMENT '用户会话列表',
    CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI 对话会话';

-- 9.2 聊天消息
CREATE TABLE chat_messages (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id      BIGINT UNSIGNED NOT NULL,
    role            VARCHAR(16)     NOT NULL COMMENT 'user|assistant',
    content         TEXT            NOT NULL COMMENT '消息内容',
    images          JSON            DEFAULT NULL COMMENT '图片 URL 数组',
    metadata        JSON            DEFAULT NULL COMMENT '元数据（意图、关联股票等）',
    token_count     INT             DEFAULT NULL COMMENT 'Token 数',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chat_messages_session (session_id, created_at) COMMENT '会话消息列表',
    CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI 对话消息';

-- =============================================================================
-- 初始化种子数据
-- =============================================================================

-- 演示用户 (password = 'Demo@123456' 的 bcrypt 哈希)
INSERT INTO users (username, password_hash, nickname, role, status) VALUES
('demo',    '$2b$10$PLACEHOLDER_HASH_FOR_DEMO', 'Demo User',  'user', 'active'),
('admin',   '$2b$10$PLACEHOLDER_HASH_FOR_ADMIN', '管理员',     'admin', 'active');

-- 演示用户自选股
-- user_id=1 = demo user
INSERT INTO watchlist (user_id, ts_code, sort_order, note) VALUES
(1, '600519.SH', 0, '贵州茅台 — 白酒龙头'),
(1, '300750.SZ', 1, '宁德时代 — 新能源'),
(1, '601318.SH', 2, '中国平安 — 保险'),
(1, '600036.SH', 3, '招商银行 — 银行'),
(1, '300059.SZ', 4, '东方财富 — 券商'),
(1, '000858.SZ', 5, '五粮液 — 白酒'),
(1, '002594.SZ', 6, '比亚迪 — 新能源车'),
(1, '000333.SZ', 7, '美的集团 — 家电'),
(1, '603259.SH', 8, '药明康德 — CRO'),
(1, '600030.SH', 9, '中信证券 — 券商');

-- 系统预设策略
INSERT INTO screener_strategies (user_id, name, description, strategy_key, filters, tags, is_preset, sort_order) VALUES
(NULL, '放量突破',   '成交量 > 1.5倍均量 + 站上所有均线 + 涨幅 > 2%', 'strategy1',
 '{"ma":"aboveAll","vratioMin":1.5,"changeMin":2}'::JSON, '["技术面","短线"]'::JSON, 1, 1),
(NULL, 'MACD金叉',   'MACD DIF 上穿 DEA + 温和放量', 'strategy2',
 '{"macd":"goldenCross","vratioMin":1.0,"vratioMax":2.5}'::JSON, '["技术面","中线"]'::JSON, 1, 2),
(NULL, '超跌反弹',   'RSI < 30 + 近5日跌幅 > 5%', 'strategy3',
 '{"rsiMax":30,"changeMax":-5}'::JSON, '["技术面","短线"]'::JSON, 1, 3),
(NULL, 'KDJ超卖',    'KDJ < 20 + 短期超卖', 'strategy4',
 '{"kdj":"oversold"}'::JSON, '["技术面","短线"]'::JSON, 1, 4),
(NULL, '价值投资',   'PE < 15 + ROE > 15%', 'strategy5',
 '{"peMax":15,"roeMin":15}'::JSON, '["基本面","长线"]'::JSON, 1, 5),
(NULL, '业绩增长',   '营收增速 > 10% + 利润增速 > 20%', 'strategy6',
 '{"revGrowthMin":10,"profitGrowthMin":20}'::JSON, '["基本面","中线"]'::JSON, 1, 6),
(NULL, '小盘成长',   '流通市值 < 100亿 + 营收增速 > 20%', 'strategy7',
 '{"capMax":100,"revGrowthMin":20}'::JSON, '["基本面","短线"]'::JSON, 1, 7),
(NULL, '布林带突破', '价格突破布林带上轨', 'strategy8',
 '{"boll":"upper"}'::JSON, '["技术面","短线"]'::JSON, 1, 8);
