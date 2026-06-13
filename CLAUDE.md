# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockView — A股中短线看盘工作台。

- **前端**：Next.js 16 App Router + TypeScript + shadcn/ui + Tailwind CSS v4 + ECharts
- **后端**：Next.js Route Handlers (API) + WebSocket (自定义 server.ts)
- **数据源**：Mock（当前）→ 东方财富 API → TSDP Tushare API（计划）
- **存储**：LocalStorage（当前）→ SQLite/better-sqlite3（计划）

## Structure

```
stock-view/
├── fontend/                   # 旧版 Vanilla JS SPA（保留参考）
│   ├── index.html             # 主应用（7模块 + AI引擎 + ECharts）
│   └── login.html             # 登录/注册页
├── nextjs-app/                # 新版 Next.js 全栈应用（当前开发目录）
│   ├── server.ts              # 自定义服务器（Next.js + WebSocket）
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     # 根布局（深色主题 + Inter/JetBrains Mono）
│   │   │   ├── page.tsx       # / → 重定向 /login
│   │   │   ├── login/         # 登录/注册页（shadcn/ui）
│   │   │   ├── dashboard/     # 仪表盘路由组（侧边栏+顶栏布局）
│   │   │   │   ├── page.tsx         # 自选股
│   │   │   │   ├── kline/page.tsx   # K线分析
│   │   │   │   ├── heatmap/page.tsx # 板块热力图
│   │   │   │   ├── flow/page.tsx    # 资金流向
│   │   │   │   ├── lhb/page.tsx     # 龙虎榜
│   │   │   │   ├── screener/page.tsx# 选股器
│   │   │   │   └── aichat/page.tsx  # AI问答
│   │   │   └── api/               # Route Handlers
│   │   │       ├── health/route.ts
│   │   │       ├── market/route.ts # indices/kline/sectors/flow/lhb/search
│   │   │       └── auth/route.ts   # login/register
│   │   ├── components/
│   │   │   ├── dashboard/       # 7个面板组件 + sidebar/topbar
│   │   │   └── ui/              # shadcn/ui 组件
│   │   └── lib/
│   │       ├── utils.ts         # cn(), fmtNum(), formatAiText()
│   │       ├── mock-data.ts     # Mock 数据（15只股票/30板块...）
│   │       ├── indicators.ts    # MA/MACD/KDJ/RSI/BOLL
│   │       ├── ai-engine.ts     # 规则驱动 AI 引擎
│   │       ├── api.ts           # API 层（mock）
│   │       ├── cache/           # 内存 LRU 缓存
│   │       ├── db/              # 数据库层（stub）
│   │       ├── services/        # 数据服务（eastmoney.ts）
│   │       ├── ws/              # WebSocket 处理
│   │       └── jobs/            # 定时任务
│   └── package.json
├── 产品文档/CODE_WIKI.md        # 产品开发文档
└── 技术文档/后端技术方案选型报告.md   # 架构设计文档
```

## Key Data Structures

见 `src/types/index.ts` — Stock, Index, KLineDataPoint, Sector, CapitalFlow, LHBRecord, ChatSession, ScreenerFilters 等。

## Commands

```bash
# 新版 Next.js 项目
cd nextjs-app

# 开发模式（标准 Next.js）
npm run dev              # → http://localhost:3000

# 开发模式（+ WebSocket 实时推送）
npm run dev:server       # → http://localhost:3000 + ws://localhost:3000/ws

# 构建
npm run build

# 生产运行
npm run start:server

# API 端点
curl http://localhost:3000/api/health
curl http://localhost:3000/api/market?type=indices
curl http://localhost:3000/api/auth -X POST -d '{"action":"login","phone":"13800138000","password":"123456"}'

# 旧版 SPA（保留参考）
cd stock-view
python -m http.server 8000     # → localhost:8000/fontend/login.html
```

## Demo Account

| Field | Value |
|-------|-------|
| Phone | 13800138000 |
| Password | 123456 |
| Verification Code | 8888 |

## Color System

A股红涨绿跌（与国际市场相反）：`--rise: #ef4444` 红色涨 / `--fall: #22c55e` 绿色跌。CSS variables 在 `globals.css` 的 `:root` 中定义。

## Development Notes

- 使用 `'use client'`  directive 标记客户端组件（所有 panel 组件）
- API routes 默认返回 mock 数据，后续替换为真实数据源
- ECharts 通过 `echarts-for-react` 集成
- shadcn/ui 组件的暗色主题在 `globals.css` 的 `:root` 中自定义
- WebSocket 仅在使用 `npm run dev:server` 时启动，标准 `npm run dev` 不包含 WS
- `better-sqlite3` 需要 Visual Studio C++ 构建工具，暂未安装
