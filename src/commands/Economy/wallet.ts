import { EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'wallet',
        description: '查看你的钱包余额 (跨服通用)',
        options: [
            {
                name: 'user',
                description: '查看其他用户的钱包',
                type: 6, // USER
                required: false
            }
        ],
        dm_permission: false
    },
    options: {},
    callback: async (client, interaction) => {
        if (!interaction.guild) return;

        const targetUser = interaction.options.getUser('user') || interaction.user;

        let wallet = await client.prisma.wallet.findUnique({
            where: { userId: targetUser.id }
        });

        if (!wallet) {
            wallet = await client.prisma.wallet.create({
                data: {
                    userId: targetUser.id,
                    gold: 0,
                    silver: 0,
                    username: targetUser.username
                }
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`💰 ${targetUser.username} 的钱包`)
            .addFields(
                { name: '🪙 金币 (Gold)', value: `${wallet.gold.toFixed(2)}`, inline: true },
                { name: '🥈 银币 (Silver)', value: `${wallet.silver.toFixed(1)}`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
            .setFooter({ text: '💡 金币 1:1 USDT/USD | 银币通过聊天和签到获取' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
});
