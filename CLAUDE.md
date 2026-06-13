# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockView — A股中短线看盘工作台。

- **前端**：Next.js 16 App Router + TypeScript + shadcn/ui + Tailwind CSS v4 + ECharts
- **后端**：Next.js Route Handlers (API) + WebSocket (自定义 server.ts)
- **数据源**：东方财富公开 API（实时）
- **存储**：MySQL 8.0+（mysql2/promise）

## Structure

```
stock-view/
├── fontend/                   # 旧版 Vanilla JS SPA（保留参考）
│   ├── index.html
│   └── login.html
├── nextjs-app/                # Next.js 全栈应用（当前开发目录）
│   ├── server.ts              # 自定义服务器（Next.js + WebSocket）
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     # 根布局（深色主题）
│   │   │   ├── page.tsx       # / → 重定向 /login
│   │   │   ├── login/         # 登录/注册页
│   │   │   ├── dashboard/     # 仪表盘路由组
│   │   │   │   ├── layout.tsx       # sidebar + topbar 布局
│   │   │   │   ├── page.tsx         # 自选股看板
│   │   │   │   ├── kline/page.tsx   # K线分析
│   │   │   │   ├── heatmap/page.tsx # 板块热力图
│   │   │   │   ├── flow/page.tsx    # 资金流向
│   │   │   │   ├── lhb/page.tsx     # 龙虎榜
│   │   │   │   ├── screener/page.tsx# 选股器
│   │   │   │   ├── aichat/page.tsx  # AI问答
│   │   │   │   └── settings/page.tsx# 用户设置
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   ├── login/route.ts
│   │   │       │   ├── register/route.ts
│   │   │       │   ├── me/route.ts
│   │   │       │   └── change-password/route.ts
│   │   │       ├── market/
│   │   │       │   ├── indices/route.ts
│   │   │       │   ├── quotes/route.ts
│   │   │       │   ├── kline/route.ts
│   │   │       │   ├── sectors/route.ts
│   │   │       │   ├── flow/route.ts
│   │   │       │   ├── lhb/route.ts
│   │   │       │   └── search/route.ts
│   │   │       ├── screener/
│   │   │       │   ├── pool/route.ts
│   │   │       │   └── strategies/route.ts
│   │   │       ├── user/
│   │   │       │   └── watchlist/
│   │   │       │       ├── route.ts           # GET列表 / POST添加
│   │   │       │       └── [code]/route.ts    # 删除
│   │   │       └── health/route.ts
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── sidebar.tsx          # 侧边栏 + 退出登录 + auth guard
│   │   │   │   ├── topbar.tsx           # 顶部指数行情条
│   │   │   │   ├── watchlist-panel.tsx  # 自选股（搜索加自选 + ECharts分时）
│   │   │   │   ├── kline-panel.tsx
│   │   │   │   ├── heatmap-panel.tsx    # ECharts treemap
│   │   │   │   ├── flow-panel.tsx
│   │   │   │   ├── lhb-panel.tsx
│   │   │   │   ├── screener-panel.tsx
│   │   │   │   ├── aichat-panel.tsx
│   │   │   │   └── settings-panel.tsx
│   │   │   └── ui/                     # shadcn/ui 组件
│   │   └── lib/
│   │       ├── utils.ts               # cn(), fmtNum(), seededRandom()
│   │       ├── indicators.ts           # MA/MACD/KDJ/RSI/BOLL 计算
│   │       ├── ai-engine.ts            # 规则驱动 AI 引擎（实时数据）
│   │       ├── api.ts                  # API 客户端（全局 401 拦截）
│   │       ├── validators.ts           # 表单验证
│   │       ├── cache/
│   │       │   └── index.ts            # 内存 LRU 缓存（带 TTL）
│   │       ├── db/
│   │       │   ├── schema.sql          # 完整 DDL（22 张表）
│   │       │   ├── connection.ts       # mysql2/promise 连接池
│   │       │   ├── init.ts             # 自动建表（非破坏性）
│   │       │   └── index.ts            # DAO 层（50+ 方法）
│   │       ├── services/
│   │       │   └── eastmoney.ts        # 东方财富 API 封装
│   │       ├── ws/
│   │       │   └── index.ts            # WebSocket 行情推送
│   │       └── jobs/
│   │           └── refresh.ts          # 数据定时刷新
│   └── package.json
├── 产品文档/CODE_WIKI.md
└── 技术文档/后端技术方案选型报告.md
```

## Database — 22 Tables (MySQL 8.0+)

```
Domain 1: 用户系统       users, user_settings, auth_tokens
Domain 2: 股票参考       stocks, trade_calendar, sectors, sector_stocks
Domain 3: 市场缓存       kline_cache, adj_factor_cache, daily_basic_cache, index_daily_cache
Domain 4: 资金流向       moneyflow_cache, hsgt_cache
Domain 5: 板块行情       sector_rank_cache
Domain 6: 龙虎榜         lhb_cache, limit_up_cache
Domain 7: 用户功能       watchlist, user_stock_notes
Domain 8: 选股器         screener_strategies, screener_results
Domain 9: AI 聊天        chat_sessions, chat_messages
```

详见 `src/lib/db/schema.sql`。

## Data Flow

```
面板组件 → src/lib/api.ts (fetch + 401 auto-logout)
         → Next.js Route Handler (/api/market/*)
         → src/lib/services/eastmoney.ts (东方财富公开 API)
         → 实时数据展示

用户/自选股 → src/lib/api.ts (带 Authorization header)
           → Route Handler (/api/auth/*, /api/user/*)
           → src/lib/db/index.ts (mysql2/promise)
           → MySQL
```

## Key Data Structures

见 `src/types/index.ts` — Stock, Index, KLineDataPoint, Sector, CapitalFlow, LHBRecord, ChatSession, ScreenerFilters 等。

## Commands

```bash
# 启动开发服务器
cd nextjs-app
npm run dev                # → http://localhost:3000

# TypeScript 检查
npx tsc --noEmit

# 构建
npm run build

# API 端点测试
curl http://localhost:3000/api/health
curl http://localhost:3000/api/market/indices
curl http://localhost:3000/api/market/quotes?codes=600519
curl http://localhost:3000/api/market/search?q=茅台
curl http://localhost:3000/api/auth/login -X POST -d '{"username":"demo","password":"Demo@123456"}'
```

## Auth

- Token 存 localStorage（`stockview_token`）
- 未登录 → 仪表盘 `sidebar.tsx` auth guard 跳转 `/login`
- 401 → `api.ts` 全局拦截，清除缓存跳转登录
- 密码目前明文存储，计划迁移 bcrypt

## Color System

A股红涨绿跌（与国际市场相反）：`--rise: #ef4444` 红色涨 / `--fall: #22c55e` 绿色跌。CSS variables 在 `globals.css` 的 `:root` 中定义。

## Development Notes

- 所有 panel 组件使用 `'use client'` directive
- 所有页面数据来自东方财富 API，零 mock 数据（`mock-data.ts` 已删除）
- ECharts 通过 `echarts-for-react` 集成（treemap 注意 formatter 中字段判空）
- AI 引擎为 async，通过 `/api/market/*` 获取实时数据
- WebSocket 仅在使用 `npm run dev:server` 时启动
- 数据库初始化为非破坏性（`CREATE TABLE IF NOT EXISTS`），用户数据重启不丢失
- MySQL 连接池配置在 `connection.ts`，默认 `root:root@localhost:3306/my_stock_view`
