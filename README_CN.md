<div align="center">

# Asyre Eclipse Bot

> *"AI 变笨不是因为它蠢，是因为你给了它 500 条消息的上下文，然后指望它记住第 3 条。"*

![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)
![Templates](https://img.shields.io/badge/模板-6套-orange)
![Panels](https://img.shields.io/badge/面板-61个-red)

<br>

**你的 AI 在第 1 条消息时给出完美答案。第 50 条呢？**

**你开了新对话来修复。那之前的设计讨论去哪了？**

**你的团队用 5 个不同的 AI 工具。它们之间互不相通。**

<br>

### 配置驱动的 Discord AI 工作台。<br>隔离 Thread。注入技能上下文。人工控制生命周期。

<br>

[**为什么做这个**](#为什么做这个) · [**怎么运作**](#它到底怎么运作) · [**6 套模板**](#6-套模板) · [**快速开始**](#快速开始) · [**配置参考**](#配置参考)

</div>

<br>

---

## 为什么做这个

如果你用 AI Agent 做过任何正经事，你一定经历过退化问题。一开始 AI 很锐利，完美执行指令。然后你在同一个对话里又让它做另一件事，再一件事。到第 30 条消息，它开始混乱。到第 50 条，它开始产生幻觉——提到你从未说过的内容，把不同任务搅在一起，忘记你 20 条消息前设定的约束。

这不是 bug，这是大语言模型的工作原理。它们有一个上下文窗口——一段固定长度的文本是它们能"看到"的。你每发一条消息，就把更早的消息往后推。AI 不真正"记住"任何东西——它每次都重新阅读可见的对话。当对话足够长，关键指令就滑出视野，AI 开始用听起来合理的虚构内容填补空白。

大多数团队的应对办法是手动开新对话。但这制造了另一个问题：上下文散落。设计讨论在一个对话里，跟进在另一个里，最终版本在第三个里，没人能找到任何东西。没有结构，没有生命周期。

Eclipse Bot 同时解决这两个问题。

### 核心洞察：上下文隔离 + 技能注入

**每个 AI 任务都有自己的隔离 thread，每个 thread 在创建时就自动注入了正确的技能上下文。**

用户点击写作面板上的"开始"，Eclipse Bot 创建 thread 后立即发送结构化上下文消息，告诉 AI 这是什么技能、用户选了什么类型、该怎么做、有什么约束。AI 带着清晰全新的指令进入对话，不需要猜，不携带之前对话的包袱。

任务完成后用户点击"归档"，AI 处理产出，thread 关闭。干净的开始，干净的结束。

我们在 4 个 Discord 社群中运行这个系统，80+ 个活跃面板。在有注入上下文的隔离 thread 里，AI 的产出质量与无结构聊天相比，差距是巨大的。

### 为什么选 Discord？

**1. 团队已经在那里。** 零迁移成本。

**2. Thread 是完美的 AI 任务容器。** 天然隔离、可归档、可搜索、支持富媒体。

**3. Bot 生态成熟。** 一条命令部署整个 AI 工作空间。

---

## 它到底怎么运作

### 技能面板系统

每个频道一个面板（嵌入消息 + 按钮），专注一种工作类型。

| 按钮 | 功能 |
|------|------|
| **开启** | 创建新 thread，注入技能上下文，AI 带着干净指令加入 |
| **归档** | AI 处理产出（总结、保存、发布），标记完成 |
| **往期** | 查询过去完成的任务 |
| **清空** | 清理频道非面板消息 |

### 一频道一技能

```
不要这样：
  #ai-聊天 (500 条消息，AI 混乱，没人知道什么做完了)

而是这样：
  #深度写作   -> ASYR-001 AI Agent 文章 (已归档)
              -> ASYR-002 周刊 (进行中)
  #设计工作台 -> DSGN-001 落地页 (已归档)
  #客户报价   -> QUOT-001 制造业客户 (进行中)
```

### 生命周期

开启/归档循环防止 AI 上下文退化。每个任务有明确的开始和结束。归档步骤强制 AI 产出最终交付物。

---

## 6 套模板

> 从 4 个 Discord 社群的真实生产部署中提取，不是纸上谈兵。

### 1. 内容创作者 — 4 面板
深度写作（7 类型）、社媒排版（5 类型）、AI 配图（7 类型）、认知归档（4 类型）

**适合**：写作者、KOL、内容团队

### 2. 服务型公司 — 6 面板
客户报价（8 行业）、客户跟进（6 种异议策略）、展示方案（10 类型）、设计工作台、公众号、内容铸卡

**适合**：设计公司、咨询公司、外包团队

### 3. 创意工作室 — 7 面板
公告、画院、文渊阁、乐坊、影像司、戏台、经筵

**适合**：艺术团队、文创社群

### 4. 全业务企业 — 31 面板（auto 模式）
战略（3）、营销（6）、销售（4）、运营（5）、财务（6）、行政（7）

**适合**：中小企业全面数字化

### 5. 知识管理 — 5 面板
知识入库（5 来源）、知识锻造（5 输入）、思维工具（8 框架）、工作区整理、管控台

**适合**：研究团队、培训机构

### 6. 生活社群 — 8 面板
养生堂、药房、情书阁、月光亭、许愿池、音乐花园、棋室、私密空间

**适合**：兴趣社群、生活方式品牌

### 混合使用

```bash
# 先部署内容创作，再追加知识管理
node templates/deploy-template.cjs templates/content-creator.json \
  --guild 123 --bot 456 --brand "工作室"
node templates/deploy-template.cjs templates/knowledge-hub.json \
  --guild 123 --bot 456 --brand "工作室"

# 排除不需要的面板
--exclude wechat_pub,visual_card
```

---

## 与你的 AI 如何连接

Eclipse Bot 是 **UI 层**，不包含 AI 逻辑。它创建 thread、注入上下文、@你的 AI bot。你的 AI bot 读取上下文并执行。

支持任何 AI：OpenAI、Claude、LangChain、自定义 bot。Eclipse Bot 不关心背后技术。

---

## 快速开始

```bash
git clone https://github.com/yzha0302/asyre-asyre-eclipse-bot.git
cd asyre-eclipse-bot
npm install
cp .env.example .env
cp src/bot-config.example.json src/bot-config.json
# 编辑 .env 和 bot-config.json，填入你的 ID
npm run setup && npm run build && npm start
```

生产环境：`pm2 start dist/index.js --name eclipse-bot`

部署面板：
```bash
node templates/deploy-template.cjs templates/content-creator.json \
  --guild 你的服务器ID --bot 你的BOT_ID --brand "品牌名"
```

---

## 配置参考

### bot-config.json

| 键 | 说明 |
|----|------|
| `bot.id` | Bot Client ID |
| `bot.ownerId` | 你的用户 ID |
| `guilds.{id}.brand` | 品牌名 |
| `guilds.{id}.welcome` | 欢迎消息配置 |
| `guilds.{id}.levelup` | 等级系统配置 |
| `guilds.{id}.team.mention` | 技能 thread 中 @提及的用户 |
| `guilds.{id}.ticket` | 工单系统配置 |

---

## 内置社群功能

| 功能 | 详情 |
|------|------|
| **等级** | Mee6 公式、等级卡、角色奖励、排行榜 |
| **经济** | 金币(1:1 USD) + 银币(聊天/签到)，跨服钱包 |
| **工单** | 多分类、私密 thread、团队通知 |
| **欢迎** | 按服务器配置、变量替换、自动角色 |

---

## 来源

从 4 个 Discord 社群、80+ 面板的生产系统中提取。6 套模板是真实的生产配置，经过数千次 AI 任务执行的打磨。开源是因为太多团队在 AI 上下文管理上挣扎——解决方案不是更强的 AI，而是更好的结构。

---

<div align="center">

**[快速开始](#快速开始)** · **[6 套模板](#6-套模板)** · **[配置参考](#配置参考)**

MIT License

</div>
