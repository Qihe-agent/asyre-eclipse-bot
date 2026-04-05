/**
 * Guild Member Add — config-driven welcome messages and auto-roles.
 * All guild-specific settings come from bot-config.json.
 */

import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { ExtendedClient } from "../../class/ExtendedClient";
import { getGuildConfig } from "../../utils/botConfig";

export default {
    event: "guildMemberAdd" as const,
    once: false,

    callback: async (_client: ExtendedClient, member: GuildMember) => {
        try {
            const gc = getGuildConfig(member.guild.id);

            // Auto-assign role
            if (gc.welcome.autoRoleId) {
                await member.roles.add(gc.welcome.autoRoleId).catch((err) =>
                    console.error(`[welcome] Auto-role failed for ${member.user.tag}:`, err)
                );
            }

            if (!gc.welcome.enabled) return;

            // Find welcome channel
            let channel: TextChannel | null = null;
            if (gc.welcome.channelId) {
                channel = member.guild.channels.cache.get(gc.welcome.channelId) as TextChannel || null;
            }
            if (!channel) channel = member.guild.systemChannel;
            if (!channel) return;

            // Build welcome embed with variable substitution
            const desc = gc.welcome.description
                .replace(/{displayName}/g, member.user.displayName)
                .replace(/{username}/g, member.user.username)
                .replace(/{userId}/g, member.id)
                .replace(/{memberCount}/g, String(member.guild.memberCount))
                .replace(/{guildName}/g, member.guild.name);

            const embed = new EmbedBuilder()
                .setColor(gc.welcome.color)
                .setTitle(gc.welcome.title)
                .setDescription(desc)
                .setTimestamp();

            if (gc.welcome.thumbnailFromUser) {
                embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            }

            await channel.send({
                content: `<@${member.id}>`,
                embeds: [embed]
            });

        } catch (error) {
            console.error("[welcome] Error:", error);
        }
    }
};
