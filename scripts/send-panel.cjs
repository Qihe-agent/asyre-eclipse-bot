#!/usr/bin/env node
/**
 * 发送 Skill Panel 常驻面板到指定频道
 *
 * Usage: node send-panel.cjs <skillKey> [--all]
 *
 * Examples:
 *   node send-panel.cjs cognitive_archive     # 单个面板
 *   node send-panel.cjs --all                 # 所有非 manager 面板
 *
 * 自动清理该频道内 Eclipse Bot 的旧面板消息后重发。
 */

const path = require("path");
const { createRequire } = require("module");

// Resolve NetLevel-Bot dir (works from any cwd)
const botDir = path.resolve(__dirname, "..");

// Use createRequire to resolve packages from NetLevel-Bot's node_modules
const botRequire = createRequire(path.join(botDir, "package.json"));

botRequire("dotenv").config({ path: path.join(botDir, ".env") });
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } =
  botRequire("discord.js");

const panelConfig = require(path.join(botDir, "src/skill-panels.json"));

async function sendPanel(client, skillKey) {
  const panel = panelConfig.panels[skillKey];
  if (!panel) {
    console.error(`❌ Panel "${skillKey}" not found.`);
    return false;
  }

  try {
    const channel = await client.channels.fetch(panel.channelId);

    // Clear old bot messages
    const msgs = await channel.messages.fetch({ limit: 10 });
    for (const msg of msgs.values()) {
      if (msg.author.id === client.user.id) await msg.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(panel.color)
      .setTitle(panel.title)
      .setDescription(panel.description)
      .setFooter({ text: panel.footer });

    const labels = panel.buttonLabels || {};
    let row;

    if (panel.managerMode && panel.managerButtons) {
      const buttons = panel.managerButtons.map((btn) =>
        new ButtonBuilder()
          .setCustomId(`sp_${skillKey}_${btn.action}`)
          .setLabel(btn.label)
          .setStyle(ButtonStyle[btn.style] || ButtonStyle.Primary),
      );
      row = new ActionRowBuilder().addComponents(...buttons);
    } else {
      // Standard: open / archive / history / clean (+ optional upgrade)
      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sp_${skillKey}_open`)
          .setLabel(labels.open || "📝 开记录")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`sp_${skillKey}_archive`)
          .setLabel(labels.archive || "📦 归档")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`sp_${skillKey}_history`)
          .setLabel(labels.history || "📜 往期")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`sp_${skillKey}_clean`)
          .setLabel(labels.clean || "🗑️ 清空")
          .setStyle(ButtonStyle.Danger),
      );
    }

    const components = [row];

    // Add upgrade button as second row if configured
    if (labels.upgrade) {
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sp_${skillKey}_upgrade`)
          .setLabel(labels.upgrade)
          .setStyle(ButtonStyle.Secondary),
      );
      components.push(row2);
    }

    await channel.send({ embeds: [embed], components });
    console.log(`✅ "${skillKey}" → ${panel.channelId}`);
    return true;
  } catch (err) {
    console.error(`❌ "${skillKey}":`, err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sendAll = args.includes("--all");
  const skillKey = args.find((a) => !a.startsWith("--"));

  if (!sendAll && !skillKey) {
    console.error("Usage: node send-panel.cjs <skillKey> [--all]");
    console.error("Available:", Object.keys(panelConfig.panels).join(", "));
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await new Promise((resolve) => {
    client.once("ready", resolve);
    client.login(process.env.CLIENT_TOKEN.trim());
  });

  if (sendAll) {
    const keys = Object.entries(panelConfig.panels)
      .filter(([_, v]) => !v.managerMode)
      .map(([k]) => k);
    console.log(`Sending ${keys.length} panels...`);
    for (const key of keys) {
      await sendPanel(client, key);
      await new Promise((r) => setTimeout(r, 1500));
    }
  } else {
    await sendPanel(client, skillKey);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
