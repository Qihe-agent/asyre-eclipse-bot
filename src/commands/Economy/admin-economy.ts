import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'economy',
        description: '管理员经济系统操作',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'give',
                description: '给用户充值',
                type: 1,
                options: [
                    { name: 'user', description: '目标用户', type: 6, required: true },
                    { name: 'amount', description: '金额', type: ApplicationCommandOptionType.Number, required: true, min_value: 0.01 },
                    {
                        name: 'currency', description: '货币类型', type: ApplicationCommandOptionType.String, required: true,
                        choices: [
                            { name: '🪙 金币 (Gold)', value: 'gold' },
                            { name: '🥈 银币 (Silver)', value: 'silver' }
                        ]
                    },
                    { name: 'note', description: '备注', type: ApplicationCommandOptionType.String, required: false }
                ]
            },
            {
                name: 'take',
                description: '从用户扣除',
                type: 1,
                options: [
                    { name: 'user', description: '目标用户', type: 6, required: true },
                    { name: 'amount', description: '金额', type: ApplicationCommandOptionType.Number, required: true, min_value: 0.01 },
                    {
                        name: 'currency', description: '货币类型', type: ApplicationCommandOptionType.String, required: true,
                        choices: [
                            { name: '🪙 金币 (Gold)', value: 'gold' },
                            { name: '🥈 银币 (Silver)', value: 'silver' }
                        ]
                    },
                    { name: 'note', description: '备注', type: ApplicationCommandOptionType.String, required: false }
                ]
            },
            {
                name: 'richlist',
                description: '查看富豪榜',
                type: 1,
                options: [
                    {
                        name: 'currency', description: '货币类型', type: ApplicationCommandOptionType.String, required: false,
                        choices: [
                            { name: '🪙 金币 (Gold)', value: 'gold' },
                            { name: '🥈 银币 (Silver)', value: 'silver' }
                        ]
                    }
                ]
            }
        ],
        dm_permission: false
    },
    options: {
        guildOwnerOnly: true
    },
    callback: async (client, interaction) => {
        if (!interaction.guild) return;

        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand() as 'give' | 'take' | 'richlist';

        switch (subcommand) {
            case 'give':
            case 'take': {
                const targetUser = interaction.options.getUser('user', true);
                const amount = interaction.options.getNumber('amount', true);
                const currency = interaction.options.getString('currency', true) as 'gold' | 'silver';
                const note = interaction.options.getString('note');

                let wallet = await client.prisma.wallet.findUnique({
                    where: { userId: targetUser.id }
                });

                if (!wallet) {
                    wallet = await client.prisma.wallet.create({
                        data: { userId: targetUser.id, gold: 0, silver: 0, username: targetUser.username }
                    });
                }

                const currentBalance = currency === 'gold' ? wallet.gold : wallet.silver;
                const newBalance = subcommand === 'give'
                    ? currentBalance + amount
                    : Math.max(0, currentBalance - amount);

                const updateData = currency === 'gold'
                    ? { gold: newBalance }
                    : { silver: newBalance };

                await client.prisma.wallet.update({
                    where: { userId: targetUser.id },
                    data: { ...updateData, username: targetUser.username }
                });

                await client.prisma.transaction.create({
                    data: {
                        fromUserId: subcommand === 'give' ? 'ADMIN' : targetUser.id,
                        toUserId: subcommand === 'give' ? targetUser.id : 'ADMIN',
                        currency,
                        amount,
                        type: subcommand === 'give' ? 'admin_give' : 'admin_take',
                        note: note || `管理员${subcommand === 'give' ? '充值' : '扣除'}`,
                        guildId: interaction.guild!.id
                    }
                });

                const emoji = currency === 'gold' ? '🪙' : '🥈';
                const action = subcommand === 'give' ? '充值' : '扣除';
                const color = subcommand === 'give' ? 0x00D26A : 0xFF6B6B;

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`🔑 管理员${action}`)
                    .setDescription(
                        `${targetUser.toString()} ${subcommand === 'give' ? '+' : '-'}**${amount}** ${emoji}\n` +
                        `当前余额：**${newBalance.toFixed(currency === 'gold' ? 2 : 1)}**` +
                        (note ? `\n📝 ${note}` : '')
                    )
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed] });
                break;
            }

            case 'richlist': {
                const currency = (interaction.options.getString('currency') || 'silver') as 'gold' | 'silver';
                const emoji = currency === 'gold' ? '🪙' : '🥈';
                const name = currency === 'gold' ? '金币' : '银币';

                const wallets = await client.prisma.wallet.findMany({
                    orderBy: currency === 'gold' ? { gold: 'desc' } : { silver: 'desc' },
                    take: 10
                });

                if (wallets.length === 0) {
                    await interaction.followUp({ content: '📭 还没有人有钱包' });
                    return;
                }

                const lines = wallets.map((w, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    const balance = currency === 'gold' ? w.gold : w.silver;
                    return `${medal} <@${w.userId}> — **${balance.toFixed(currency === 'gold' ? 2 : 1)}** ${emoji}`;
                });

                const embed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle(`🏆 ${name}富豪榜`)
                    .setDescription(lines.join('\n'))
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed] });
                break;
            }
        }
    }
});
