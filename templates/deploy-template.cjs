/**
 * deploy-template.cjs — 从模板部署 Eclipse Bot 面板系统
 *
 * 用法:
 *   node deploy-template.cjs <template.json> --guild <id> --bot <id> --brand "Name" [options]
 *
 * Options:
 *   --guild <id>        Discord 服务器 ID (required)
 *   --bot <id>          AI Bot User ID (required)
 *   --brand <name>      品牌名 (default: "My Studio")
 *   --workspace <path>  服务器工作区路径 (default: "~/workspace")
 *   --category <id>     Discord 频道分类 ID (auto-create if omitted)
 *   --color <int>       主题色 decimal (default: 15105570)
 *   --exclude <keys>    逗号分隔，排除的面板 key
 *   --dry-run           只输出计划，不执行
 *   --skip-channels     跳过频道创建（手动指定 channelId）
 */

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PANELS_PATH = path.join(__dirname, "../src/skill-panels.json");
const SEND_PANEL = path.join(__dirname, "../scripts/send-panel.cjs");

// ── Parse CLI args ──
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
}
const hasFlag = (name) => args.includes(`--${name}`);

const templatePath = args.find((a) => a.endsWith(".json") && !a.startsWith("--"));
if (!templatePath) {
  console.error("Usage: node deploy-template.cjs <template.json> --guild <id> --bot <id> --brand <name>");
  console.error("\nAvailable templates:");
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  files.forEach((f) => {
    try {
      const t = JSON.parse(fs.readFileSync(path.join(__dirname, f), "utf8"));
      console.error(`  ${f.padEnd(30)} ${t.meta.name} (${t.meta.panelCount} panels)`);
    } catch {}
  });
  process.exit(1);
}

const guildId = getArg("guild");
const botId = getArg("bot");
const brand = getArg("brand", "My Studio");
const workspace = getArg("workspace", "~/workspace");
const categoryId = getArg("category", "");
const color = parseInt(getArg("color", "15105570"));
const excludeKeys = (getArg("exclude", "") || "").split(",").filter(Boolean);
const dryRun = hasFlag("dry-run");
const skipChannels = hasFlag("skip-channels");

if (!guildId || !botId) {
  console.error("Error: --guild and --bot are required");
  process.exit(1);
}

// ── Load template ──
const tplFile = fs.existsSync(templatePath) ? templatePath : path.join(__dirname, templatePath);
const template = JSON.parse(fs.readFileSync(tplFile, "utf8"));
console.log(`\n📋 Template: ${template.meta.name} (${template.meta.name_en})`);
console.log(`   ${template.meta.description}`);
console.log(`   Panels: ${template.meta.panelCount} | Excluding: ${excludeKeys.length || "none"}`);

// ── Variable replacement ──
const vars = {
  __GUILD_ID__: guildId,
  __BRAND__: brand,
  __COLOR__: color,
  __BOT_ID__: botId,
  __WORKSPACE__: workspace,
  __CATEGORY_ID__: categoryId,
};

function replaceVars(obj) {
  if (typeof obj === "string") {
    let s = obj;
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(k).join(String(v));
    }
    return s;
  }
  if (Array.isArray(obj)) return obj.map(replaceVars);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = replaceVars(v);
    }
    return out;
  }
  return obj;
}

// ── Filter panels ──
const panelKeys = Object.keys(template.panels).filter((k) => !excludeKeys.includes(k));
console.log(`\n📦 Panels to deploy (${panelKeys.length}):`);
panelKeys.forEach((k) => {
  const p = template.panels[k];
  const typeCount = (p.types || []).length;
  console.log(`   ${k.padEnd(25)} ${p.title} (${typeCount} types, skill: ${p.skillName})`);
});

// ── Channels to create ──
const channels = template.channels.filter((ch) => panelKeys.includes(ch.panelKey));
console.log(`\n📡 Channels to create (${channels.length}):`);
channels.forEach((ch) => {
  const priv = ch.private ? "🔒" : "🌐";
  const dept = ch.department ? ` [${ch.department}]` : "";
  console.log(`   ${priv} ${ch.name}${dept}`);
});

// ── Roles ──
if (template.roles && template.roles.length) {
  console.log(`\n👤 Roles to create (${template.roles.length}):`);
  template.roles.forEach((r) => console.log(`   ${r.name} (${r.color})`));
}

if (dryRun) {
  console.log("\n🏁 Dry run complete. No changes made.");
  console.log("\nTo deploy for real, remove --dry-run flag.");
  process.exit(0);
}

// ── Deploy ──
async function deploy() {
  const rest = new REST({ version: "10" }).setToken(process.env.CLIENT_TOKEN);

  // Step 1: Create category if needed
  let catId = categoryId;
  if (!catId) {
    console.log("\n🔧 Creating channel category...");
    const cat = await rest.post(Routes.guildChannels(guildId), {
      body: {
        name: `🤖 ${brand}`,
        type: 4, // GUILD_CATEGORY
      },
    });
    catId = cat.id;
    console.log(`   Created category: ${cat.name} (${catId})`);
  }

  // Step 2: Create channels
  console.log("\n📡 Creating channels...");
  const channelMap = {}; // panelKey -> channelId

  for (const ch of channels) {
    const overwrites = [];
    if (ch.private) {
      // @everyone deny VIEW, bot + deployer allow
      overwrites.push(
        { id: guildId, type: 0, deny: "1024", allow: "0" },
        { id: botId, type: 1, allow: "68608", deny: "0" }
      );
    }

    const created = await rest.post(Routes.guildChannels(guildId), {
      body: {
        name: ch.name,
        type: 0, // GUILD_TEXT
        parent_id: catId,
        permission_overwrites: overwrites.length ? overwrites : undefined,
      },
    });
    channelMap[ch.panelKey] = created.id;
    const priv = ch.private ? "🔒" : "🌐";
    console.log(`   ${priv} #${created.name} → ${created.id}`);
  }

  // Step 3: Merge into skill-panels.json
  console.log("\n📝 Updating skill-panels.json...");
  const panelsData = JSON.parse(fs.readFileSync(PANELS_PATH, "utf8"));

  for (const key of panelKeys) {
    const panel = replaceVars(template.panels[key]);
    panel.channelId = channelMap[key] || "";
    panel.guildId = guildId;
    // Restore color to number
    if (typeof panel.color === "string" && panel.color !== "__COLOR__") {
      panel.color = parseInt(panel.color) || color;
    } else {
      panel.color = color;
    }

    const fullKey = `${brand.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${key}`;
    panelsData.panels[fullKey] = panel;
    console.log(`   Added: ${fullKey}`);
  }

  fs.writeFileSync(PANELS_PATH, JSON.stringify(panelsData, null, 2), "utf8");
  console.log(`   ✅ skill-panels.json updated (${Object.keys(panelsData.panels).length} total panels)`);

  // Step 4: Compile TypeScript
  console.log("\n🔨 Compiling TypeScript...");
  const { execSync } = require("child_process");
  try {
    execSync("npx tsc", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
    console.log("   ✅ Compiled");
  } catch (e) {
    console.warn("   ⚠️ TSC had warnings (non-fatal)");
  }

  // Step 5: Restart PM2
  console.log("\n🔄 Restarting level-bot...");
  try {
    execSync("pm2 restart level-bot", { stdio: "inherit" });
    console.log("   ✅ Restarted");
  } catch (e) {
    console.warn("   ⚠️ PM2 restart failed — you may need to restart manually");
  }

  // Step 6: Send panels
  console.log("\n📮 Sending panels to channels...");
  for (const key of panelKeys) {
    const fullKey = `${brand.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${key}`;
    try {
      execSync(`node "${SEND_PANEL}" ${fullKey}`, {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
      });
      console.log(`   ✅ ${fullKey}`);
    } catch (e) {
      console.warn(`   ⚠️ Failed to send panel: ${fullKey}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`🎉 Deployment complete!`);
  console.log(`   Template: ${template.meta.name}`);
  console.log(`   Guild: ${guildId}`);
  console.log(`   Brand: ${brand}`);
  console.log(`   Panels: ${panelKeys.length}`);
  console.log(`   Channels: ${Object.keys(channelMap).length}`);
  console.log(`   Category: ${catId}`);
  console.log("=".repeat(50));
}

deploy().catch((err) => {
  console.error("\n❌ Deployment failed:", err.message || err);
  process.exit(1);
});
