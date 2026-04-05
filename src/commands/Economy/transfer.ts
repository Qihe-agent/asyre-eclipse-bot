import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'transfer',
        description: '转账给其他用户',
        options: [
            {
                name: 'user',
                description: '转账目标用户',
                type: 6, // USER
                required: true
            },
            {
                name: 'amount',
                description: '转账金额',
                type: ApplicationCommandOptionType.Number,
                required: true,
                min_value: 0.1
            },
            {
                name: 'currency',
                description: '货币类型',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: '🪙 金币 (Gold)', value: 'gold' },
                    { name: '🥈 银币 (Silver)', value: 'silver' }
                ]
            },
            {
                name: 'note',
                description: '备注',
                type: ApplicationCommandOptionType.String,
                required: false
            }
        ],
        dm_permission: false
    },
    options: {},
    callback: async (client, interaction) => {
        if (!interaction.guild) return;

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user', true);
        const amount = interaction.options.getNumber('amount', true);
        const currency = interaction.options.getString('currency', true) as 'gold' | 'silver';
        const note = interaction.options.getString('note');

        // Validation
        if (targetUser.id === interaction.user.id) {
            await interaction.followUp({ content: '❌ 不能给自己转账哦！' });
            return;
        }

        if (targetUser.bot) {
            await interaction.followUp({ content: '❌ 不能给 Bot 转账！' });
            return;
        }

        // Get sender wallet
        let senderWallet = await client.prisma.wallet.findUnique({
            where: { userId: interaction.user.id }
        });

        if (!senderWallet) {
            senderWallet = await client.prisma.wallet.create({
                data: {
                    userId: interaction.user.id,
                    gold: 0,
                    silver: 0,
                    username: interaction.user.username
                }
            });
        }

        // Check balance
        const balance = currency === 'gold' ? senderWallet.gold : senderWallet.silver;
        if (balance < amount) {
            const currencyName = currency === 'gold' ? '金币' : '银币';
            await interaction.followUp({
                content: `❌ 余额不足！你只有 **${balance.toFixed(currency === 'gold' ? 2 : 1)}** ${currencyName}`
            });
            return;
        }

        // Get/create receiver wallet
        let receiverWallet = await client.prisma.wallet.findUnique({
            where: { userId: targetUser.id }
        });

        if (!receiverWallet) {
            receiverWallet = await client.prisma.wallet.create({
                data: {
                    userId: targetUser.id,
                    gold: 0,
                    silver: 0,
                    username: targetUser.username
                }
            });
        }

        // Execute transfer
        const updateField = currency === 'gold' ? { gold: senderWallet.gold - amount } : { silver: senderWallet.silver - amount };
        const updateFieldReceiver = currency === 'gold' ? { gold: receiverWallet.gold + amount } : { silver: receiverWallet.silver + amount };

        await client.prisma.wallet.update({
            where: { userId: interaction.user.id },
            data: { ...updateField, username: interaction.user.username }
        });

        await client.prisma.wallet.update({
            where: { userId: targetUser.id },
            data: { ...updateFieldReceiver, username: targetUser.username }
        });

        // Record transaction
        await client.prisma.transaction.create({
            data: {
                fromUserId: interaction.user.id,
                toUserId: targetUser.id,
                currency,
                amount,
                type: 'transfer',
                note: note || null,
                guildId: interaction.guild.id
            }
        });

        const currencyEmoji = currency === 'gold' ? '🪙' : '🥈';
        const currencyName = currency === 'gold' ? '金币' : '银币';

        const embed = new EmbedBuilder()
            .setColor(0x00D26A)
            .setTitle(`${currencyEmoji} 转账成功`)
            .setDescription(
                `${interaction.user.toString()} → ${targetUser.toString()}\n\n` +
                `**${amount.toFixed(currency === 'gold' ? 2 : 1)} ${currencyName}**` +
                (note ? `\n📝 备注：${note}` : '')
            )
            .addFields(
                {
                    name: `你的余额`,
                    value: `${currencyEmoji} ${(balance - amount).toFixed(currency === 'gold' ? 2 : 1)}`,
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.followUp({ embeds: [embed] });
    }
});
