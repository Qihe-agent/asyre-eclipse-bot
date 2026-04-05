# Eclipse Bot — Use Case Templates

预设模板系统，让 AI 能快速帮客户部署定制化的 Discord 工作台。

## 可用模板

| 模板 | 面板数 | 适用场景 |
|------|--------|---------|
| [content-creator.json](content-creator.json) | 4 | 自媒体、KOL、写作者 |
| [service-agency.json](service-agency.json) | 6 | 设计/咨询/外包公司 |
| [creative-studio.json](creative-studio.json) | 7 | 艺术团队、文创、兴趣社群 |
| [full-business.json](full-business.json) | 31 | 中小企业全面数字化（6 大部门） |
| [knowledge-hub.json](knowledge-hub.json) | 5 | 研究团队、培训、企业内训 |
| [lifestyle-community.json](lifestyle-community.json) | 8 | 兴趣/情感/生活方式社群 |

## 快速开始

```bash
# 预览（不实际执行）
node deploy-template.cjs content-creator.json \
  --guild <服务器ID> \
  --bot <AI Bot ID> \
  --brand "品牌名" \
  --dry-run

# 正式部署
node deploy-template.cjs content-creator.json \
  --guild <服务器ID> \
  --bot <AI Bot ID> \
  --brand "品牌名"
```

## 模板结构

每个模板 JSON 包含：

```
meta          — 模板元信息（名称、描述、面板数）
variables     — 部署时需要填的参数（guild_id, bot_id, brand...）
roles         — 建议创建的角色
channels      — 要创建的频道列表
panels        — 面板配置（title, description, types, archivePrompt...）
```

## 自定义

- **排除面板**: `--exclude key1,key2`
- **混合模板**: 对同一服务器运行多次 deploy-template.cjs
- **修改面板**: 复制模板 → 编辑 JSON → 部署自定义版本
- **新建模板**: 参考 `_schema.json` 格式，创建新的 JSON 文件

## 变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `__GUILD_ID__` | Discord 服务器 ID | (必填) |
| `__BOT_ID__` | AI Bot User ID | (必填) |
| `__BRAND__` | 品牌名 | My Studio |
| `__COLOR__` | 主题色 (decimal) | 15105570 |
| `__WORKSPACE__` | 工作区路径 | ~/workspace |
| `__CATEGORY_ID__` | 频道分类 ID | (自动创建) |
