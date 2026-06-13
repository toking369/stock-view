# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockView — A股中短线看盘工作台。当前为纯前端 SPA，计划引入 Next.js App Router 后端。

- **前端**：Vanilla JS SPA（单 HTML 文件 + ECharts）
- **计划后端**：Next.js App Router + TypeScript + better-sqlite3
- **数据源**：东方财富公开 API（JSONP）、计划接入山西证券 TSDP Tushare API
- **存储**：LocalStorage（当前）→ SQLite（计划）

## Key Files

| 文件 | 说明 |
|------|------|
| `fontend/index.html` | 主应用，7 个功能模块 + AI 引擎 + ECharts 可视化 |
| `fontend/login.html` | 登录/注册页，LocalStorage 认证 |
| `产品文档/CODE_WIKI.md` | 项目完整开发文档 |
| `技术文档/后端技术方案选型报告.md` | 后端架构设计（Next.js App Router） |

## Architecture (Current)

```
fontend/index.html (SPA)
├── CSS: Dark Financial Terminal (CSS Custom Properties)
├── JS Modules:
│   ├── Watchlist      (#mod-watchlist)
│   ├── K-line Analysis (#mod-kline)      — ECharts Candlestick
│   ├── Sector Heatmap  (#mod-heatmap)    — ECharts Treemap
│   ├── Capital Flow    (#mod-flow)       — ECharts Bar
│   ├── Dragon Tiger    (#mod-lhb)        — Limit-up statistics
│   ├── Stock Screener  (#mod-screener)   — Strategy-based filtering
│   └── AI Chat         (#mod-aichat)     — Intent engine (rule-based)
├── Data Layer:
│   ├── JSONP wrapper   (jsonp function)
│   ├── EM API calls    (fetchIndices/fetchQuotes/fetchKline/...)
│   ├── Mock data       (watchlistData/sectorData/capitalFlowData)
│   └── Technical indicators (calcMA/calcMACD/calcKDJ/calcRSI/calcBOLL)
└── ECharts 5.5         (CDN via jsdelivr)
```

### Module Switching

All 7 modules are `<section>` elements with class `module-panel`. `switchModule(mod)` toggles `.active` class and calls the corresponding `init*Chart()` function for lazy chart initialization.

### Key Data Structures

- **watchlistData** — Array of stock objects (code/name/price/change/vol/…). Source of truth for user's portfolio.
- **sectorData** — Array `{name, change, volume}`. Used by heatmap Treemap + rank list.
- **capitalFlowData** — Array `{code, name, price, change, inflow, outflow, net, ratio}`. Used by flow bars + table.
- **klineData** — Array `{date, open, close, high, low, vol}`. Generated or fetched, consumed by ECharts candlestick.

### Data Fetching

`loadLiveData()` parallel-fetches indices/quotes/sectors/flow via `Promise.allSettled`. Switches to `_dataSource = 'live'` on first success; falls back to mock. K-line is loaded separately via `loadKlineLive()`.

### AI Engine

`aiEngine` object with three phases:
1. **parseIntent** — Regex-based intent/topic/stock detection from user text
2. **generate** — Routes to specialized generators (stock analysis, comparison, market summary, sector flow, LHB, recommendation)
3. **generateStockAnalysis** — Simulates technical indicators from stock data (no real API call)

## Architecture (Planned — Next.js Backend)

```
stock-view-server/
├── server.ts               # Custom HTTP server (Next.js + WebSocket)
├── src/app/api/*/route.ts  # Route Handlers (文件即路由)
├── src/middleware.ts        # CORS + rate limiting
├── src/lib/services/        # Data services (tushare.ts, eastmoney.ts, screener.ts, indicator.ts)
├── src/lib/db/              # SQLite (better-sqlite3)
├── src/lib/cache/           # In-memory caching (LRU + TTL)
├── src/ws/                  # WebSocket (real-time market push)
└── src/jobs/                # cron tasks (data refresh)
```

See [技术文档/后端技术方案选型报告.md](技术文档/后端技术方案选型报告.md) for full architecture detail.

## Commands

```bash
# Current — run SPA locally via HTTP server
python -m http.server 8000     # then visit localhost:8000/fontend/login.html

# Future — Next.js backend development
npm run dev                     # tsx watch server.ts
npm run build                   # next build
npm run start                   # NODE_ENV=production tsx server.ts
npm test                        # vitest
```

## Demo Account

| Field | Value |
|-------|-------|
| Phone | 13800138000 |
| Password | 123456 |
| Verification Code | 8888 |

## Color System

A股红涨绿跌（与国际市场相反）：`--rise: #ef4444` 红色涨 / `--fall: #22c55e` 绿色跌。CSS variables 在 `:root` 中定义。

## Data Source Migration Plan

1. Current: JSONP → 东方财富公开 API → Mock fallback
2. Phase 1: Route Handler proxy → 东方财富 API（替代 JSONP 直连）
3. Phase 2: Route Handler proxy → TSDP Tushare API（主数据源）
4. Phase 3: WebSocket 推送替代轮询

TSDP 接口需山西证券开户 + PTrade token，配置于服务端 `.env`。
