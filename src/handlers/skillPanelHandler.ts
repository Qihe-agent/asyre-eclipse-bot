/**
 * Skill Panel Handler — config-driven panel system.
 * All bot IDs, team members, guild-specific logic come from bot-config.json.
 * No hardcoded Discord IDs.
 */

import {
    ButtonInteraction, StringSelectMenuInteraction,
    ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    EmbedBuilder, TextChannel, ChannelType
} from "discord.js";
import panelConfig from "../skill-panels.json";
import { nextThreadId } from "../utils/threadCounter";
import { getBotConfig, getTeamForGuild, getGuildConfig } from "../utils/botConfig";

const BOT_ID = getBotConfig().id;

interface PanelType { value: string; emoji: string; label: string; description: string; }
interface PanelConfig {
    channelId: string; guildId: string; title: string; description: string;
    color: number; footer: string; skillName: string;
    archivePrompt: string; historyPrompt: string; threadPrefix: string;
    types: PanelType[]; buttonLabels?: Record<string, string>;
    managerMode?: boolean; managerButtons?: any[];
    upgradePrompt?: string;
}

/** Parse customId -> { skillKey, action } */
export function parseSkillPanelId(customId: string): { skillKey: string; action: string } | null {
    if (!customId.startsWith("sp_")) return null;
    const parts = customId.split("_");
    if (parts.length < 3) return null;
    const suffix = customId.slice(3);

    const compoundActions = ["type_select"];
    for (const ca of compoundActions) {
        if (suffix.endsWith(`_${ca}`)) {
            return { skillKey: suffix.slice(0, -(ca.length + 1)), action: ca };
        }
    }

    const actions = ["open", "archive", "history", "deploy", "list", "refresh", "select", "clean", "upgrade"];
    for (let i = parts.length - 1; i >= 2; i--) {
        if (actions.includes(parts[i])) {
            return { skillKey: parts.slice(1, i).join("_"), action: parts[i] };
        }
    }
    return null;
}

export function getPanel(skillKey: string): PanelConfig | null {
    return (panelConfig.panels as Record<string, PanelConfig>)[skillKey] || null;
}

/** Handle "open" button */
export async function handleOpen(interaction: ButtonInteraction, skillKey: string): Promise<void> {
    const panel = getPanel(skillKey);
    if (!panel) { await interaction.reply({ content: "Panel not found.", ephemeral: true }); return; }

    if (!panel.types || panel.types.length === 0) {
        await handleAutoOpen(interaction, skillKey, panel);
        return;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`sp_${skillKey}_type_select`)
        .setPlaceholder("Select type...");

    for (const t of panel.types) {
        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(`${t.emoji} ${t.label}`)
                .setDescription(t.description)
                .setValue(t.value)
                .setEmoji(t.emoji)
        );
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    await interaction.reply({ content: "Select type:", components: [row], ephemeral: true });
}

async function handleAutoOpen(interaction: ButtonInteraction, skillKey: string, panel: PanelConfig): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel as TextChannel;
    const now = new Date();
    const dateStr = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
        const tag = nextThreadId(skillKey.replace(/_/g, "").slice(0, 4).toUpperCase());
        const thread = await channel.threads.create({
            name: `${tag} [${panel.title}] ${dateStr}`,
            autoArchiveDuration: 4320,
            reason: `Skill panel: ${panel.title}`
        });

        const { mention, silent } = getTeamForGuild(interaction.guild!.id, interaction.user.id);
        const mentionStr = mention.map(id => `<@${id}>`).join(" ");
        const allMembers = [...new Set([...mention, ...silent])];

        const embed = new EmbedBuilder()
            .setColor(panel.color)
            .setTitle(`${panel.title} — ${dateStr}`)
            .setDescription(`**Participants**: ${mentionStr}\n\nDescribe your request. <@${BOT_ID}> will assist.`)
            .setFooter({ text: panel.footer })
            .setTimestamp();

        for (const id of [BOT_ID, ...allMembers]) {
            try { await thread.members.add(id); } catch {}
        }

        await thread.send({ content: mentionStr, embeds: [embed] });
        await thread.send({
            content: `<@${BOT_ID}> Task context:\n- Panel: ${panel.title}\n- Skill: \`${panel.skillName}\`\n- Scene: ${panel.description}\n\nWait for user input, then execute the appropriate skill.`
        });

        await interaction.editReply({ content: `Task created: <#${thread.id}>` });
    } catch (err) {
        console.error("[skill-panel] Auto-open error:", err);
        await interaction.editReply({ content: "Failed to create task." });
    }
}

/** Handle "archive" button */
export async function handleArchive(interaction: ButtonInteraction, skillKey: string): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const panel = getPanel(skillKey);
    if (!panel) { await interaction.editReply({ content: "Panel not found." }); return; }

    const channel = interaction.channel as TextChannel;
    const activeThreads = await interaction.guild!.channels.fetchActiveThreads();
    const matching = activeThreads.threads
        .filter(t => t.parentId === channel.id && !t.locked && !t.archived && !t.name.startsWith("\u2705"))
        .sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0));

    if (matching.size === 0) {
        await interaction.editReply({ content: "No active threads to archive." }); return;
    }

    const options = matching.map(t => ({
        label: t.name.length > 100 ? t.name.slice(0, 97) + "..." : t.name,
        value: `${skillKey}::${t.id}`,
        description: `${t.messageCount ?? 0} messages`
    })).slice(0, 25);

    const select = new StringSelectMenuBuilder()
        .setCustomId("skill_archive_select")
        .setPlaceholder("Select thread to archive")
        .addOptions(options);

    await interaction.editReply({
        content: `${matching.size} active thread(s). Select one:`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
    });
}

/** Handle "history" button */
export async function handleHistory(interaction: ButtonInteraction, skillKey: string): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const panel = getPanel(skillKey);
    if (!panel) { await interaction.editReply({ content: "Panel not found." }); return; }

    const channel = interaction.channel as TextChannel;
    await channel.send({ content: `<@${BOT_ID}> ${panel.historyPrompt}` });
    await interaction.editReply({ content: "History query sent." });
}

/** Handle type selection -> create thread */
export async function handleTypeSelect(interaction: StringSelectMenuInteraction, skillKey: string): Promise<void> {
    await interaction.deferUpdate();
    const panel = getPanel(skillKey);
    if (!panel) { await interaction.followUp({ content: "Panel not found.", ephemeral: true }); return; }

    const selectedValue = interaction.values[0];
    const typeConfig = panel.types.find(t => t.value === selectedValue);
    if (!typeConfig) { await interaction.followUp({ content: "Unknown type.", ephemeral: true }); return; }

    const channel = interaction.channel as TextChannel;
    const now = new Date();
    const dateStr = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
        const prefix = panel.threadPrefix || "";
        const tag = nextThreadId(skillKey.replace(/_/g, "").slice(0, 4).toUpperCase());
        const threadName = `${tag} ${typeConfig.emoji} [${typeConfig.label}] ${prefix}${dateStr}`;

        const thread = await channel.threads.create({
            name: threadName,
            autoArchiveDuration: 4320,
            reason: `Skill panel: ${panel.skillName} / ${typeConfig.label}`
        });

        const { mention, silent } = getTeamForGuild(interaction.guild!.id, interaction.user.id);
        const mentionStr = mention.map(id => `<@${id}>`).join(" ");
        const allMembers = [...new Set([...mention, ...silent])];

        const embed = new EmbedBuilder()
            .setColor(panel.color)
            .setTitle(`${typeConfig.emoji} ${typeConfig.label} — ${dateStr}`)
            .setDescription(`**Participants**: ${mentionStr}\n\nPost your content here. <@${BOT_ID}> will assist.\nWhen done, click "Archive" in the main channel.`)
            .setFooter({ text: panel.footer })
            .setTimestamp();

        for (const id of [BOT_ID, ...allMembers]) {
            try { await thread.members.add(id); } catch {}
        }

        await thread.send({ content: mentionStr, embeds: [embed] });
        await thread.send({
            content: `<@${BOT_ID}> Task context:\n- Skill: \`${panel.skillName}\`\n- Type: ${typeConfig.emoji} ${typeConfig.label}\n- Description: ${typeConfig.description || "N/A"}\n\nRead the skill docs and prepare for **${typeConfig.label}** work.`
        });

        await interaction.followUp({ content: `Thread created: <#${thread.id}>`, ephemeral: true });
    } catch (err) {
        console.error("[skill-panel] Thread creation error:", err);
        await interaction.followUp({ content: "Failed to create thread.", ephemeral: true });
    }
}

/** Handle "clean" button */
export async function handleClean(interaction: ButtonInteraction, skillKey: string): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.guild?.members.cache.get(interaction.user.id)
        || await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    if (member && !member.permissions.has("ManageMessages")) {
        await interaction.editReply({ content: "You need Manage Messages permission." }); return;
    }

    const channel = interaction.channel as TextChannel;
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const botId = interaction.client.user!.id;
        const toDelete = messages.filter(msg => !(msg.author.id === botId && msg.embeds.length > 0 && msg.components.length > 0));

        if (toDelete.size === 0) { await interaction.editReply({ content: "Channel is already clean." }); return; }

        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const bulk = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);
        const old = toDelete.filter(m => m.createdTimestamp <= twoWeeksAgo);

        if (bulk.size > 0) await channel.bulkDelete(bulk, true);
        for (const [, msg] of old) {
            await msg.delete().catch(() => {});
            await new Promise(r => setTimeout(r, 1000));
        }

        await interaction.editReply({ content: `Cleaned ${toDelete.size} messages.` });
    } catch (err) {
        console.error("[skill-panel] Clean error:", err);
        await interaction.editReply({ content: "Clean failed." });
    }
}

/** Handle "upgrade" button */
export async function handleUpgrade(interaction: ButtonInteraction, skillKey: string): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const panel = getPanel(skillKey);
    if (!panel?.upgradePrompt) { await interaction.editReply({ content: "No upgrade configured." }); return; }
    const channel = interaction.channel as TextChannel;
    await channel.send({ content: `<@${BOT_ID}> ${panel.upgradePrompt}` });
    await interaction.editReply({ content: "Upgrade request sent." });
}

/** Handle "deploy" (manager) */
export async function handleDeploy(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({ content: "Use `deploy-template.cjs` to deploy new skill panels.\nSee `templates/README.md` for instructions.", ephemeral: true });
}

/** Handle "list" (manager) */
export async function handleList(interaction: ButtonInteraction): Promise<void> {
    const panels = panelConfig.panels as Record<string, any>;
    const entries = Object.entries(panels)
        .filter(([_, p]) => !p.managerMode)
        .map(([key, p]) => `- **${p.title}** (\`${p.skillName}\`) <#${p.channelId}>`)
        .join("\n");
    await interaction.reply({ content: entries || "No panels deployed yet.", ephemeral: true });
}

/** Handle "refresh" (manager) */
export async function handleRefresh(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({ content: "Run `node scripts/send-panel.cjs --all` to refresh all panels.", ephemeral: true });
}

/** Handle dynamic component results */
export async function handleDynamicResult(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
    const customId = interaction.customId;
    let selectedValue: string, label: string;

    if (interaction.isStringSelectMenu()) {
        selectedValue = interaction.values[0];
        label = (interaction.component as any).options?.find((o: any) => o.value === selectedValue)?.label || selectedValue;
    } else {
        const parts = customId.split("_");
        selectedValue = parts[parts.length - 1];
        label = (interaction.component as any).label || selectedValue;
    }

    await interaction.deferUpdate();
    const channel = interaction.channel as TextChannel;
    await channel.send({
        content: `[COMPONENT_RESULT:${customId}] **${label}** (value: \`${selectedValue}\`)\n\n<@${BOT_ID}> User selected **${label}**, please continue.`
    });
}

// ── Router ──

export function isSkillPanelInteraction(customId: string): boolean {
    return customId.startsWith("sp_");
}

export async function routeSkillPanelButton(interaction: ButtonInteraction): Promise<void> {
    const parsed = parseSkillPanelId(interaction.customId);
    if (!parsed) return;

    switch (parsed.action) {
        case "open": return handleOpen(interaction, parsed.skillKey);
        case "archive": return handleArchive(interaction, parsed.skillKey);
        case "history": return handleHistory(interaction, parsed.skillKey);
        case "deploy": return handleDeploy(interaction);
        case "list": return handleList(interaction);
        case "refresh": return handleRefresh(interaction);
        case "clean": return handleClean(interaction, parsed.skillKey);
        case "upgrade": return handleUpgrade(interaction, parsed.skillKey);
        default:
            if (interaction.customId.includes("dynamic")) return handleDynamicResult(interaction);
    }
}

export async function routeSkillPanelSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const parsed = parseSkillPanelId(interaction.customId);
    if (!parsed) return;
    if (parsed.action === "type_select") return handleTypeSelect(interaction, parsed.skillKey);
    if (interaction.customId.includes("dynamic")) return handleDynamicResult(interaction);
}
