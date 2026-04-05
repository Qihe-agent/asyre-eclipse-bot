/**
 * Message Create — leveling system + silver coin rewards.
 * Guild-specific config (noLeveling, banner, footer) from bot-config.json.
 */

import { TextChannel, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { GatewayEventListener } from "../../class/Builders";
import { ExtendedClient } from "../../class/ExtendedClient";
import { getGuildConfig } from "../../utils/botConfig";
import path from "path";

const SILVER_PER_MESSAGE = 0.5;

const levelingConfig = {
    xpPerMessage: (min: number, max: number) => Math.random() * (max - min) + min,
    xpRate: 1.0
};

const antispam = new Map<string, number>();

export default new GatewayEventListener({
    event: "messageCreate",
    callback: async (client, message) => {
        if (!message.guild || message.author.bot) return;

        // Check if leveling is disabled for this guild
        const gc = getGuildConfig(message.guild.id);
        if (gc.levelup.noLeveling) return;

        const checkspam = antispam.get(message.author.id);
        if (checkspam && checkspam > Date.now()) return;
        if (message.content.length < 3) return;

        antispam.delete(message.author.id);
        antispam.set(message.author.id, Date.now() + 500);

        const guild = await client.prisma.guild.findFirst({
            where: { guildId: message.guild.id }
        });

        if (guild?.noXpChannels?.split(",")?.includes(message.channel.id)) return;
        if (guild?.noXpRoles?.split(",")?.some((role) => message.member?.roles.cache.has(role))) return;

        const data = await client.prisma.user.findFirst({
            where: { guildId: message.guild.id, userId: message.author.id }
        });

        if (data?.noXp === true) return;

        if (!data) {
            const count = await client.prisma.user.count({ where: { guildId: message.guild.id } });
            await client.prisma.user.create({
                data: {
                    guildId: message.guild.id, userId: message.author.id,
                    messageCount: 1, level: 0, rank: count + 1,
                    levelXp: 0, xp: 0, totalXp: 0, noXp: false
                }
            });
            setTimeout(() => antispam.delete(message.author.id), 2000);
            return;
        }

        const calculated = await calculateUserLevel(data.level, data.xp);
        const xpPerMessage = levelingConfig.xpPerMessage(15, 25) * (guild?.xpRate ? guild.xpRate : levelingConfig.xpRate);
        const xpToAssign = xpPerMessage + data.xp;

        if (calculated.lvl > data.level) {
            const levelupchannel = message.guild.channels.cache.get(guild?.levelUpChannel ?? "") as TextChannel;

            const bannerPath = path.join(__dirname, `../../../assets/${gc.levelup.banner}`);
            let files: any[] = [];
            try {
                const attachment = new AttachmentBuilder(bannerPath, { name: "levelup_banner.png" });
                files = [attachment];
            } catch {}

            const levelUpEmbed = new EmbedBuilder()
                .setColor(gc.levelup.color)
                .setTitle("\u26a1 Level Up!")
                .setDescription(
                    guild?.levelUpMessage
                        ? guild.levelUpMessage
                            .replace(/{user}/g, message.author.toString())
                            .replace(/{userId}/g, message.author.id)
                            .replace(/{username}/g, message.author.username)
                            .replace(/{level}/g, calculated.lvl.toString())
                        : `\ud83c\udf89 ${message.author.toString()} reached **Level ${calculated.lvl}**!`
                )
                .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
                .setFooter({ text: gc.footer })
                .setTimestamp();

            if (files.length) levelUpEmbed.setImage("attachment://levelup_banner.png");

            await (levelupchannel ? levelupchannel : message.channel).send({
                embeds: [levelUpEmbed], files
            }).catch(() => {});

            await client.prisma.user.updateMany({
                where: { id: data.id, guildId: message.guild.id, userId: message.author.id },
                data: { level: calculated.lvl, messageCount: data.messageCount + 1, xp: 1, levelXp: calculated.requiredXp }
            });

            await checkRoleRewards(client, message.guild.id, message.author.id, calculated.lvl, guild?.stackingRoles ? true : false);

            const levelUpBonus = Math.min(calculated.lvl * 2, 30);
            await awardLevelUpSilver(client, message.author.id, message.author.username, message.guild.id, calculated.lvl, levelUpBonus);
            return;
        }

        await client.prisma.user.updateMany({
            where: { id: data.id, guildId: message.guild.id, userId: message.author.id },
            data: { level: calculated.lvl, messageCount: data.messageCount + 1, xp: xpToAssign, totalXp: data.totalXp + xpPerMessage, levelXp: calculated.requiredXp }
        });

        await awardSilver(client, message.author.id, message.author.username, message.guild.id);
    }
});

const calculateUserLevel = async (lvl: number, xp: number) => {
    const requiredXP = 5 * (lvl ** 2) + 50 * lvl + 100;
    return xp >= requiredXP ? { lvl: lvl + 1, requiredXp: requiredXP } : { lvl, requiredXp: requiredXP };
};

const awardSilver = async (client: ExtendedClient, userId: string, username: string, guildId: string) => {
    try {
        let wallet = await client.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) wallet = await client.prisma.wallet.create({ data: { userId, gold: 0, silver: 0, username } });
        await client.prisma.wallet.update({ where: { userId }, data: { silver: wallet.silver + SILVER_PER_MESSAGE, username } });
    } catch (err) { console.error("Silver award error:", err); }
};

const awardLevelUpSilver = async (client: ExtendedClient, userId: string, username: string, guildId: string, level: number, bonus: number) => {
    try {
        let wallet = await client.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) wallet = await client.prisma.wallet.create({ data: { userId, gold: 0, silver: 0, username } });
        await client.prisma.wallet.update({ where: { userId }, data: { silver: wallet.silver + bonus, username } });
        await client.prisma.transaction.create({
            data: { fromUserId: "SYSTEM", toUserId: userId, currency: "silver", amount: bonus, type: "earn_chat", note: `Level ${level} bonus`, guildId }
        });
    } catch (err) { console.error("Level-up silver error:", err); }
};

const checkRoleRewards = async (client: ExtendedClient, guildId: string, userId: string, newLevel: number, stacking?: boolean) => {
    const roleRewards = await client.prisma.role.findMany({ where: { guildId } });
    const data = await client.prisma.user.findFirst({ where: { guildId, userId } });
    if (!roleRewards || roleRewards.length <= 0 || !data) return;
    const guild = client.guilds.cache.get(guildId);
    const member = guild?.members.cache.get(userId);
    if (!member || !guild) return;
    const reward = roleRewards.filter((r) => r.guildId === guildId && r.level === newLevel)[0];
    if (reward) {
        const oldRole = guild.roles.cache.get(data?.lastRoleIdGiven ?? "");
        if (oldRole && !stacking) await member.roles.remove(oldRole.id).catch(() => {});
        await member.roles.add(reward.roleId).catch(() => {});
        await client.prisma.user.updateMany({ where: { guildId, userId }, data: { lastRoleIdGiven: reward.roleId } });
    }
};
