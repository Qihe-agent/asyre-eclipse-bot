import { EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'daily',
        description: '每日签到领取银币',
        options: [],
        dm_permission: false
    },
    options: {},
    callback: async (client, interaction) => {
        if (!interaction.guild) return;

        await interaction.deferReply();

        const userId = interaction.user.id;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if already checked in today
        const existing = await client.prisma.checkIn.findUnique({
            where: {
                userId_guildId_date: { userId, guildId: interaction.guild!.id, date: today }
            }
        });

        if (existing) {
            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('❌ 今天已经签过了！')
                .setDescription(`你今天已经签到过了，明天再来吧～\n当前连续签到：**${existing.streak} 天**`)
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
            return;
        }

        // Calculate streak - find yesterday's check-in
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const yesterdayCheckIn = await client.prisma.checkIn.findUnique({
            where: {
                userId_guildId_date: { userId, guildId: interaction.guild!.id, date: yesterday }
            }
        });

        const streak = yesterdayCheckIn ? yesterdayCheckIn.streak + 1 : 1;

        // Calculate bonus: +5 for every 7-day streak
        const baseReward = 5;
        const streakBonus = streak % 7 === 0 ? 5 : 0;
        const totalReward = baseReward + streakBonus;

        // Ensure wallet exists
        let wallet = await client.prisma.wallet.findUnique({
            where: { userId }
        });

        if (!wallet) {
            wallet = await client.prisma.wallet.create({
                data: {
                    userId,
                    gold: 0,
                    silver: 0,
                    username: interaction.user.username
                }
            });
        }

        // Update wallet
        await client.prisma.wallet.update({
            where: { userId },
            data: {
                silver: wallet.silver + totalReward,
                username: interaction.user.username
            }
        });

        // Record check-in
        await client.prisma.checkIn.create({
            data: {
                userId,
                guildId: interaction.guild!.id,
                date: today,
                streak,
                bonus: streakBonus
            }
        });

        // Record transaction
        await client.prisma.transaction.create({
            data: {
                fromUserId: 'SYSTEM',
                toUserId: userId,
                currency: 'silver',
                amount: totalReward,
                type: 'earn_checkin',
                note: `每日签到 (连续${streak}天)`,
                guildId: interaction.guild!.id
            }
        });

        const embed = new EmbedBuilder()
            .setColor(0x00D26A)
            .setTitle('✅ 签到成功！')
            .setDescription(
                `**+${baseReward} 银币**` +
                (streakBonus > 0 ? ` + **${streakBonus} 连签奖励** 🎉` : '') +
                `\n\n🔥 连续签到：**${streak} 天**` +
                (streak % 7 !== 0 ? `\n💡 再签 **${7 - (streak % 7)} 天** 可获得额外奖励` : '') +
                `\n\n💰 当前银币：**${(wallet.silver + totalReward).toFixed(1)}**`
            )
            .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
            .setTimestamp();

        await interaction.followUp({ embeds: [embed] });
    }
});
