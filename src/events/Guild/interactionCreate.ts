import { getBotConfig } from "../../utils/botConfig";
/**
 * Interaction Create — routes all button, select menu, modal, and command interactions.
 * No hardcoded IDs. Skill panel routing is config-driven.
 */

import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { GatewayEventListener } from "../../class/Builders";
import { isSkillPanelInteraction, routeSkillPanelButton, routeSkillPanelSelect } from "../../handlers/skillPanelHandler";
import { getGuildConfig } from "../../utils/botConfig";

const processedInteractions = new Set<string>();
const DEDUP_TTL = 30_000;

export default new GatewayEventListener({
    event: "interactionCreate",
    callback: async (client, interaction) => {
        if (!interaction.guild) return;

        // Dedup
        const iid = interaction.id;
        if (processedInteractions.has(iid)) return;
        processedInteractions.add(iid);
        setTimeout(() => processedInteractions.delete(iid), DEDUP_TTL);

        // ── Button interactions ──
        if (interaction.isButton()) {
            // Skill Panel buttons (sp_*)
            if (isSkillPanelInteraction(interaction.customId)) {
                await routeSkillPanelButton(interaction);
                return;
            }

            // Archive select handler
            if (interaction.customId === "skill_archive_select") {
                // Handled by select menu below
                return;
            }
        }

        // ── Select Menu interactions ──
        if (interaction.isStringSelectMenu()) {
            // Skill Panel selects
            if (isSkillPanelInteraction(interaction.customId)) {
                await routeSkillPanelSelect(interaction);
                return;
            }

            // Archive thread selection
            if (interaction.customId === "skill_archive_select") {
                await interaction.deferUpdate();
                const [skillKey, threadId] = interaction.values[0].split("::");
                const channel = interaction.channel as TextChannel;
                const thread = channel.threads.cache.get(threadId);
                if (!thread) {
                    await interaction.followUp({ content: "Thread not found.", ephemeral: true });
                    return;
                }

                const panelConfig = await import("../../skill-panels.json");
                const panel = (panelConfig.panels as any)[skillKey];
                if (panel?.archivePrompt) {
                    const botId = getBotConfig().id;
                    await thread.send({ content: `<@${botId}> ${panel.archivePrompt}` });
                }

                await interaction.followUp({ content: `Archive started in <#${threadId}>`, ephemeral: true });
                return;
            }
        }

        // ── Slash commands ──
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                // Permission checks
                if (command.options?.developersOnly && !getBotConfig().developers.includes(interaction.user.id)) {
                    await interaction.reply({ content: "Developer only.", ephemeral: true }); return;
                }
                if (command.options?.ownerOnly) {
                    const guild = await client.prisma.guild.findFirst({ where: { guildId: interaction.guild.id } });
                    if (interaction.user.id !== interaction.guild.ownerId && !getBotConfig().developers.includes(interaction.user.id)) {
                        await interaction.reply({ content: "Owner only.", ephemeral: true }); return;
                    }
                }

                await command.callback(client, interaction as any);
            } catch (err) {
                console.error(`[cmd] ${interaction.commandName} error:`, err);
                const reply = interaction.replied || interaction.deferred
                    ? interaction.followUp.bind(interaction)
                    : interaction.reply.bind(interaction);
                await reply({ content: "Command failed.", ephemeral: true }).catch(() => {});
            }
        }

        // ── Autocomplete ──
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try { await command.autocomplete(client, interaction); } catch {}
            }
        }
    }
});
