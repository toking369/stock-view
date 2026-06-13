# StockView - A股中短线看盘工作台

## 项目概述

StockView 是一款专为A股投资者设计的中短线看盘工作台，提供实时行情监控、技术分析，资金流向追踪、智能选股等一站式交易决策工具。

**项目定位**：面向A股中短线投资者的专业级看盘工具，支持实时行情追踪、技术指标分析、AI辅助决策。

---

## 目录结构

```
stock-view/
├── index.html          # 主应用页面（核心功能模块）
├── login.html          # 用户登录/注册页面
└── .canvas-meta.json   # Canvas平台配置文件
```

**架构特点**：
- **单页应用(SPA)**：所有功能模块集成在一个HTML文件中
- **纯前端实现**：无需后端服务，数据来自东方财富公开API
- **模块化设计**：7个独立功能模块，通过Tab切换

---

## 系统架构

### 模块划分

| 模块名称 | 功能说明 | 核心文件 |
|---------|---------|---------|
| **登录模块** | 用户注册、登录、本地认证 | login.html |
| **自选股看板** | 自选股列表、详情展示、分时图 | index.html (Watchlist) |
| **K线分析** | K线图表、技术指标(MACD/KDJ/RSI/BOLL) | index.html (K-line) |
| **板块热力图** | 行业/概念板块涨跌分布 | index.html (Heatmap) |
| **资金流向** | 主力资金净流入统计与排行 | index.html (Flow) |
| **龙虎榜** | 涨停分析、机构席位追踪 | index.html (LHB) |
| **选股器** | 策略筛选、条件过滤 | index.html (Screener) |
| **AI问答** | 智能分析，自然语言交互 | index.html (AI Chat) |

---

## 核心功能模块详解

### 1. 用户认证模块 (login.html)

#### 功能概述
- 用户注册与登录
- 基于 LocalStorage 的轻量级认证系统
- 支持验证码获取（演示模式）

#### 核心数据结构

```javascript
const SV_KEYS = {
  users: 'sv_users',           // 用户列表
  loggedIn: 'sv_logged_in',    // 登录状态
  currentUser: 'sv_current_user', // 当前用户信息
  remember: 'sv_remember'      // 记住我状态
};
```

#### 关键函数

| 函数名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| handleLogin(e) | 处理登录请求 | e: 表单事件 | 无 |
| handleRegister(e) | 处理注册请求 | e: 表单事件 | 无 |
| validatePhone(val) | 手机号验证 | val: 手机号字符串 | boolean |
| showToast(msg, type) | 显示提示消息 | msg: 消息内容, type: success/error | 无 |
| togglePassword(inputId, btn) | 切换密码可见性 | inputId: 输入框ID, btn: 按钮元素 | 无 |

---

### 2. 自选股看板模块

#### 功能概述
- 自选股列表展示与排序
- 实时行情数据展示
- 个股详情与分时走势图

#### 数据结构

```javascript
// 股票数据模型
{
  code: '600519',        // 股票代码
  name: '贵州茅台',        // 股票名称
  price: 1682.50,        // 当前价格
  change: 2.35,          // 涨跌幅(%)
  vol: 32400,            // 成交量(股)
  amount: 54.38,         // 成交额(亿)
  turnover: 0.26,        // 换手率(%)
  pe: 28.42,             // 市盈率
  amp: 2.71,             // 振幅(%)
  open: 1658.00,         // 开盘价
  high: 1695.80,         // 最高价
  low: 1651.20,          // 最低价
  prevClose: 1643.88,    // 昨收盘价
  vratio: 1.32,          // 量比
  outerVol: 20100,       // 外盘
  innerVol: 12300        // 内盘
}
```

#### 关键函数

| 函数名 | 功能说明 |
|--------|---------|
| renderWatchlist() | 渲染自选股列表表格 |
| selectStock(idx) | 选择股票，更新详情面板 |
| sortTable(col) | 按指定列排序 |
| filterWatchlist(query) | 搜索过滤股票 |
| initMiniChart(stock) | 初始化分时走势图 |

---

### 3. K线技术分析模块

#### 功能概述
- 日K/周K/月K/分时K线展示
- 多技术指标支持（MACD、KDJ、RSI、BOLL）
- 成交量柱状图

#### 技术指标计算函数

| 函数名 | 功能 | 输入 | 输出 |
|--------|------|------|------|
| calcMA(data, period) | 计算移动平均线 | data: K线数据, period: 周期 | number[] |
| calcMACD(data) | 计算MACD指标 | data: K线数据 | {dif, dea, hist} |
| calcKDJ(data) | 计算KDJ指标 | data: K线数据 | {k, d, j} |
| calcRSI(data, period) | 计算RSI指标 | data: K线数据, period: 周期 | number[] |
| calcBOLL(data, period) | 计算布林带 | data: K线数据, period: 周期 | {upper, mid, lower} |

---

### 4. 板块热力图模块

#### 功能概述
- 行业/概念/地域板块分类展示
- 树形热力图可视化
- 涨幅排行TOP10/跌幅TOP10

#### 数据结构

```javascript
{
  name: '白酒',           // 板块名称
  change: 2.87,          // 涨跌幅(%)
  volume: 245            // 成交额(亿)
}
```

#### 关键函数

| 函数名 | 功能 |
|--------|------|
| initHeatmap() | 初始化热力图与排行榜 |
| switchHeatmapTab(el) | 切换板块类型（行业/概念/地域） |

---

### 5. 资金流向模块

#### 功能概述
- 主力资金净流入统计
- 超大单/大单资金分析
- 个股资金流向排行

#### 数据结构

```javascript
{
  code: '300750',        // 股票代码
  name: '宁德时代',        // 股票名称
  price: 218.65,         // 当前价格
  change: 3.82,          // 涨跌幅
  inflow: 8.45,          // 流入资金(亿)
  outflow: 3.21,          // 流出资金(亿)
  net: 5.24,             // 净流入(亿)
  ratio: 12.8            // 净流入占比(%)
}
```

---

### 6. 龙虎榜模块

#### 功能概述
- 涨停板统计与连板梯队
- 龙虎榜上榜股票追踪
- 机构席位买卖详情

#### 数据结构

```javascript
// 龙虎榜数据
{
  code: '601012',
  name: '隆基绿能',
  price: 22.18,
  change: 5.12,
  buy: 18450,            // 买入金额(万)
  sell: 8920,            // 卖出金额(万)
  net: 9530              // 净买入(万)
}

// 机构席位数据
{
  code: '601012',
  name: '隆基绿能',
  buyCount: 4,           // 买入机构数
  buyAmount: 12560,      // 机构买入(万)
  sellCount: 1,          // 卖出机构数
  sellAmount: 3420,      // 机构卖出(万)
  netAmount: 9140,       // 机构净买(万)
  reason: '涨幅偏离'      // 上榜原因
}

// 连板数据
{
  name: '中芯集成',
  code: '688469',
  days: 5,               // 连板天数
  sealRate: '85%',       // 封板成功率
  sector: '半导体'        // 所属板块
}
```

---

### 7. 选股器模块

#### 功能概述
- 预设策略一键筛选
- 技术面/基本面/行情特征多维度筛选
- 自定义条件组合

#### 预设策略

| 策略ID | 策略名称 | 筛选条件 |
|--------|---------|---------|
| vol_breakout | 放量突破 | 成交量>2倍均量 + 站上所有均线 + 涨幅>2% |
| macd_golden | MACD金叉 | MACD金叉 + 温和放量 |
| ma_bullish | 均线多头 | 均线多头排列 + RSI适中 |
| kdj_oversold | KDJ超卖 | KDJ超卖 + RSI超卖 |
| low_pe_value | 低估值蓝筹 | PE<20 + ROE>15% + 大盘股 |
| high_roe_growth | 高ROE成长 | ROE>20% + 利润增速>50% |
| limit_next_day | 涨停次日 | 连涨>=3日 + 换手>5% + 振幅>5% |
| accumulation | 主力吸筹 | 缩量 + 布林缩口 + 窄幅震荡 |

#### 筛选维度

| 分类 | 筛选项 |
|------|--------|
| **技术指标** | MACD状态、KDJ区间、均线形态、RSI区间、成交量变化、布林带位置 |
| **基本面** | 市盈率(PE)、市净率(PB)、总市值、营收增速、ROE、净利润增速 |
| **行情特征** | 涨跌幅、换手率、振幅、连涨天数、量比 |

---

### 8. AI智能问答模块

#### 功能概述
- 自然语言股票分析
- K线截图分析
- 智能选股推荐
- 多轮对话支持

#### AI引擎架构

```
AI Engine
├── 1. Intent Detection (意图识别)
│   - analyze(分析) | signal(买卖信号) | compare(对比)
│   - recommend(推荐) | risk(风险) | summary(总结)
├── 2. Topic Detection (主题识别)
│   - technical(技术面) | capital_flow(资金流)
│   - sector(板块) | lhb(龙虎榜) | market(大盘)
├── 3. Stock Detection (股票识别)
│   - 从消息文本中提取股票名称/代码
│   - 支持股票别名匹配（如"茅台"→"贵州茅台"）
└── 4. Response Generation (响应生成)
    - 单股票分析 | 多股票对比 | 大盘综述
    - 板块资金流向 | 龙虎榜分析 | 智能推荐
```

#### 核心函数

| 函数名 | 功能 |
|--------|------|
| aiEngine.parseIntent(text, hasImage, session) | 解析用户意图和主题 |
| aiEngine.generate(text, hasImage, session) | 生成AI响应 |
| aiEngine.generateStockAnalysis(stock, intents, topics) | 生成股票分析报告 |
| aiEngine.generateComparison(stocks) | 生成股票对比分析 |
| aiEngine.generateMarketSummary() | 生成大盘综述 |
| aiEngine.generateSectorFlow() | 生成板块资金流向分析 |
| aiEngine.generateRecommendation() | 生成选股推荐 |

#### 会话管理

```javascript
// 会话数据结构
{
  id: 'session_1234567890',
  title: '新会话',
  messages: [
    {
      id: 'msg_xxx',
      role: 'user|ai',
      text: '消息内容',
      images: ['base64...'],
      timestamp: 1234567890
    }
  ],
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

---

## 数据层设计

### 数据源

#### 东方财富公开API

| API类型 | 接口地址 | 功能 |
|---------|---------|------|
| 指数行情 | push2.eastmoney.com/api/qt/ulist.np/get | 获取大盘指数实时数据 |
| 股票行情 | push2.eastmoney.com/api/qt/ulist.np/get | 获取自选股实时行情 |
| K线历史 | push2his.eastmoney.com/api/qt/stock/kline/get | 获取K线历史数据 |
| 板块排行 | push2.eastmoney.com/api/qt/clist/get | 获取行业板块数据 |
| 资金流向 | push2.eastmoney.com/api/qt/clist/get | 获取主力资金排行 |

#### API封装函数

| 函数名 | 功能 | 参数 |
|--------|------|------|
| fetchIndices() | 获取指数行情 | 无 |
| fetchQuotes(codes) | 获取股票行情 | codes: 股票代码数组 |
| fetchKline(secid, days) | 获取K线数据 | secid: 市场ID, days: 天数 |
| fetchSectors(count) | 获取板块数据 | count: 返回数量 |
| fetchCapitalFlow(count) | 获取资金流向 | count: 返回数量 |

#### 数据加载策略

```javascript
async function loadLiveData() {
  // 并行请求所有数据
  const [indices, quotes, sectors, flow] = await Promise.allSettled([
    fetchIndices(),
    fetchQuotes(codes),
    fetchSectors(40),
    fetchCapitalFlow(10)
  ]);
  // 逐个处理成功的响应
  // ...
}
```

### Mock数据机制

项目提供完善的Mock数据，确保在无法访问外部API时仍可正常运行：

```javascript
let _dataSource = 'mock'; // 'live' or 'mock'

// 数据加载成功后切换为live模式
if (successCount > 0) {
  _dataSource = 'live';
}
```

---

## 可视化层

### ECharts图表集成

项目使用ECharts进行数据可视化：

| 图表类型 | 用途 | 模块 |
|---------|------|------|
| Line Chart | 分时走势图 | 自选股详情 |
| Candlestick | K线图 | K线分析 |
| Bar Chart | 成交量、资金流向 | K线分析，资金流向 |
| Treemap | 板块热力图 | 板块热力图 |

### 图表管理

```javascript
let charts = {};  // 存储所有图表实例

function initMiniChart() {
  if (charts.mini) charts.mini.dispose();  // 先销毁旧实例
  charts.mini = echarts.init(el, null, { renderer: 'canvas' });
  charts.mini.setOption(options);
}

// 响应式调整
function handleResize() {
  Object.values(charts).forEach(c => c && c.resize && c.resize());
}
```

---

## 样式与设计系统

### 设计规范

**主题色（Dark Financial Terminal）**

| 颜色变量 | 值 | 用途 |
|---------|-----|------|
| --seed-bg | #0a0e17 | 主背景色 |
| --seed-fg | #e5e7eb | 主文字色 |
| --seed-primary | #3b82f6 | 主色调（蓝色） |
| --rise | #ef4444 | 上涨色（红色） |
| --fall | #22c55e | 下跌色（绿色） |

**注意**：A股采用"红涨绿跌"的颜色规范，与国际市场相反。

---

## 安全与性能

### 安全措施

1. **LocalStorage数据保护**
   - 用户密码明文存储（仅演示用途，生产环境需加密）
   - 登录状态使用独立key存储

2. **XSS防护**
   ```javascript
   function escapeHtml(str) {
     const div = document.createElement('div');
     div.textContent = str;
     return div.innerHTML;
   }
   ```

3. **输入验证**
   - 手机号格式验证
   - 密码长度验证
   - 表单字段必填验证

### 性能优化

1. **JSONP跨域请求**
   ```javascript
   function jsonp(url, timeout) {
     return new Promise((resolve, reject) => {
       const cbName = '__em_cb_' + Date.now();
       const timer = setTimeout(() => reject(new Error('timeout')), timeout || 8000);
       // ...
     });
   }
   ```

2. **懒加载**
   - 图片使用loading="lazy"属性
   - 图表按需初始化（切换到对应模块时才创建）

---

## 启动与运行

### 开发环境

**方式一：直接打开**
直接在浏览器中打开 index.html
注意：需要先通过 login.html 登录（演示账号：13800138000 / 123456）

**方式二：本地服务器**
```bash
# 使用Python启动简单HTTP服务器
python -m http.server 8000

# 访问 http://localhost:8000/login.html
```

### 演示账号

| 字段 | 值 |
|------|-----|
| 手机号 | 13800138000 |
| 密码 | 123456 |
| 验证码（注册） | 8888 |

### 功能测试清单

| 模块 | 测试要点 |
|------|---------|
| 登录 | 演示账号登录、注册新用户、密码重置提示 |
| 自选股 | 表格排序、搜索过滤、股票详情切换、分时图 |
| K线分析 | 指标切换(MACD/KDJ/RSI/BOLL)、周期切换 |
| 热力图 | 板块类型切换、涨幅排行 |
| 资金流向 | 柱状图、详情表格 |
| 龙虎榜 | 涨停统计、连板梯队、机构席位 |
| 选股器 | 预设策略、自定义筛选、结果展示 |
| AI问答 | 自然语言提问、截图上传、会话管理 |

---

## 总结

StockView 是一款功能完整的A股看盘工作台，具备以下特点：

**架构优势**：
- 纯前端实现，无需后端部署
- 模块化设计，功能清晰
- 支持实时数据与Mock数据自动切换

**核心功能**：
- 7大功能模块覆盖中短线交易需求
- AI智能分析引擎支持自然语言交互
- ECharts可视化图表专业美观

**技术亮点**：
- JSONP跨域数据获取
- 响应式布局适配多端
- 完整的用户认证系统
- 丰富的技术指标计算

**使用场景**：
- A股投资者日常看盘
- 技术分析学习与研究
- 量化策略回测参考

> **免责声明**：本工具仅供学习交流，不构成投资建议。投资有风险，入市需谨慎。
