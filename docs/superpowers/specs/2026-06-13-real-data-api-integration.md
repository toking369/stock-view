# StockView 真实数据 API 对接方案

## 概述

将 StockView 从当前 100% mock 数据模式切换到东方财富（East Money）真实数据源，前端通过 Next.js API Route 服务端中转获取数据。

## 架构

```
前端 Panel → lib/api.ts (fetch) → app/api/* (Next.js Server) → EastMoneyService → push2.eastmoney.com
                                                                                 datacenter-web.eastmoney.com
                                                                                 searchadapter.eastmoney.com
                                         ↓
                                  MemoryCache (LRU)
```

所有请求经服务端中转，避免 CORS，保护请求特征，统一做数据清洗和缓存。

## 东方财富 API 映射

| 模块 | 东方财富端点 | 参数 | 缓存 |
|------|-------------|------|------|
| 大盘指数 | `push2.eastmoney.com/api/qt/ulist.np/get` | secids=1.000001,0.399001,0.399006,1.000688 | 10s |
| 自选股行情 | 同上 | secids 按 codes 拼接 | 10s |
| K线 | `push2his.eastmoney.com/api/qt/stock/kline/get` | secid, klt(周期), fqt=1(前复权), lmt | 60s |
| 板块列表 | `push2.eastmoney.com/api/qt/clist/get` | fs=m:90+t:2(行业)/t:3(概念) | 30s |
| 资金流向(个股) | `push2his.eastmoney.com/api/qt/stock/fflow/daykline/get` | secid | 30s |
| 资金流向(排行) | `push2.eastmoney.com/api/qt/clist/get` | fs=m:90+t:2, fid=f62(主力净流入排序) | 30s |
| 龙虎榜 | `datacenter-web.eastmoney.com/api/data/v1/get` | reportName=RPT_BILLBOARD_STATISTICS | 60s |
| 涨停板 | 同上 | reportName=RPT_BILLBOARD_STATISTICS + 条件过滤 | 60s |
| 股票搜索 | `searchadapter.eastmoney.com/api/suggest/get` | keyword | 无缓存 |
| 选股池 | `push2.eastmoney.com/api/qt/clist/get` | 全A股 + 技术指标字段 | 60s |

## API 路由

### Auth（简单 token 验证）

| Method | Route | 功能 |
|--------|-------|------|
| POST | `/api/auth/login` | 登录，返回 token + user |
| POST | `/api/auth/register` | 注册 |
| GET | `/api/auth/me` | token 验证，返回用户信息 |

### Market（东方财富真实数据）

| Method | Route | 参数 | 返回 |
|--------|-------|------|------|
| GET | `/api/market/indices` | — | `Index[]` |
| GET | `/api/market/quotes` | `codes=600519,300750` | `Stock[]` |
| GET | `/api/market/kline` | `code, days, period` | `KLineDataPoint[]` |
| GET | `/api/market/sectors` | `type=industry|concept, count` | `Sector[]` |
| GET | `/api/market/flow` | `code` (个股) | `CapitalFlow[]` |
| GET | `/api/market/flow-list` | `count` (排行) | `CapitalFlow[]` |
| GET | `/api/market/lhb` | — | `{ records, institutions, limitUp }` |
| GET | `/api/market/search` | `q` | `Stock[]` |

### Screener

| Method | Route | 参数 | 返回 |
|--------|-------|------|------|
| GET | `/api/screener/pool` | 可选 filters | `ScreenerStock[]` |
| GET | `/api/screener/strategies` | — | `PresetStrategy[]` |

## 字段映射

东方财富返回的 fields 数字编码映射：

| 字段码 | 含义 | 映射到 Stock 属性 |
|--------|------|------------------|
| f2 | 最新价 | price |
| f3 | 涨跌幅(%) | change |
| f4 | 涨跌额 | changeAmount |
| f5 | 成交量(手) | vol |
| f6 | 成交额(万) | amount |
| f7 | 换手率(%) | turnover |
| f8 | 市盈率(动态) | pe |
| f10 | 量比 | volumeRatio |
| f12 | 股票代码 | code |
| f14 | 股票名称 | name |
| f15 | 最高价 | high |
| f16 | 最低价 | low |
| f17 | 开盘价 | open |
| f18 | 昨收价 | prevClose |
| f20 | 总市值 | —(用于cap) |
| f37 | 振幅(%) | amplitude |
| f38 | 流通市值 | — |
| f39 | 外盘 | outerVol |
| f40 | 内盘 | innerVol |

K线 fields2 映射：

| 字段码 | 含义 | 映射 |
|--------|------|------|
| f51 | 日期 | date |
| f52 | 开盘 | open |
| f53 | 收盘 | close |
| f54 | 最高 | high |
| f55 | 最低 | low |
| f56 | 成交量 | vol |
| f57 | 成交额 | amount |

龙虎榜字段映射：

| 字段码 | 含义 | 映射 |
|--------|------|------|
| SECURITY_CODE | 代码 | code |
| SECURITY_NAME_ABBR | 名称 | name |
| CHANGE_RATE | 涨跌幅 | change |
| NET_BUY_AMT | 净买入 | net |
| BUY_AMT | 买入 | buy |
| SELL_AMT | 卖出 | sell |
| CLOSE_PRICE | 收盘价 | price |

## EastMoneyService 设计

```typescript
class EastMoneyService {
  // 批量行情
  async fetchQuotes(codes: string[]): Promise<EMQuote[]>
  
  // 指数行情
  async fetchIndices(): Promise<EMQuote[]>
  
  // K线
  async fetchKline(secid: string, days: number, period: string): Promise<KLineDataPoint[]>
  
  // 板块
  async fetchSectors(type: 'industry' | 'concept', count: number): Promise<Sector[]>
  
  // 个股资金流向
  async fetchCapitalFlow(secid: string): Promise<CapitalFlow[]>
  
  // 资金流向排行
  async fetchCapitalFlowRanking(count: number): Promise<CapitalFlow[]>
  
  // 龙虎榜
  async fetchLHB(): Promise<LHBResponse>
  
  // 股票搜索
  async searchStocks(query: string): Promise<SimpleStock[]>
  
  // 全市场股票列表（选股器）
  async fetchAllStocks(): Promise<any[]>
}

// 辅助方法
static codeToSecid(code: string): string
// 6xxxxx → 1.xxxxxx, 0xxxxx/3xxxxx → 0.xxxxxx
```

HTTP 请求使用 Node.js 内置 fetch（Next.js 16 可用），JSONP 响应通过正则提取 JSON。

## 前端对接

### `lib/api.ts` 改造

所有函数从返回 mock 数据改为 fetch 调用后端 API：

```typescript
export async function fetchIndices(): Promise<Index[]> {
  const res = await fetch('/api/market/indices', { next: { revalidate: 10 } })
  if (!res.ok) throw new Error('获取指数失败')
  return res.json()
}
```

### 面板组件改造

每个面板增加 loading/error 状态，统一模式：

```tsx
const [data, setData] = useState<T[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetchData()
    .then(setData)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
}, [])
```

### 涉及文件

**新增/替换：**
- `src/lib/services/eastmoney.ts` — 完整重写
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/market/indices/route.ts`
- `src/app/api/market/quotes/route.ts`
- `src/app/api/market/kline/route.ts`
- `src/app/api/market/sectors/route.ts`
- `src/app/api/market/flow/route.ts`
- `src/app/api/market/flow-list/route.ts`
- `src/app/api/market/lhb/route.ts`
- `src/app/api/market/search/route.ts`
- `src/app/api/screener/pool/route.ts`
- `src/app/api/screener/strategies/route.ts`

**修改：**
- `src/lib/api.ts`
- `src/lib/cache/index.ts` — 增加缓存实例
- `src/components/dashboard/watchlist-panel.tsx`
- `src/components/dashboard/kline-panel.tsx`
- `src/components/dashboard/heatmap-panel.tsx`
- `src/components/dashboard/flow-panel.tsx`
- `src/components/dashboard/lhb-panel.tsx`
- `src/components/dashboard/screener-panel.tsx`
- `src/components/dashboard/aichat-panel.tsx`
- `src/components/dashboard/topbar.tsx`
- `src/components/dashboard/sidebar.tsx`
- `src/app/login/page.tsx`

**删除：**
- `src/app/api/market/route.ts`（拆分为独立路由）
- `src/app/api/auth/route.ts`（拆分为独立路由）

## 缓存策略

使用现有的 `MemoryCache`，各路由按不同 TTL 缓存：

| 数据类型 | TTL | 缓存实例 |
|---------|-----|---------|
| 指数 | 10s | marketCache |
| 行情 | 10s | marketCache |
| K线 | 60s | klineCache |
| 板块 | 30s | marketCache |
| 资金流向 | 30s | marketCache |
| 龙虎榜 | 60s | marketCache |
| 选股池 | 60s | marketCache |
| 搜索 | 无缓存 | — |

## 实施顺序

1. EastMoneyService — 完整实现
2. API Routes — 独立路由文件
3. lib/api.ts — 改为 fetch 调用
4. 面板对接 — loading/error 状态
5. Auth 对接
