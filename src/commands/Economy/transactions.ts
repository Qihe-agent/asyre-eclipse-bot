import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

const typeLabels: Record<string, string> = {
    'transfer': '💸 转账',
    'earn_chat': '💬 聊天',
    'earn_checkin': '📅 签到',
    'admin_give': '🔑 管理员充值',
    'admin_take': '🔑 管理员扣除'
};

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'transactions',
        description: '查看交易记录',
        options: [
            {
                name: 'limit',
                description: '显示条数 (默认10)',
                type: ApplicationCommandOptionType.Integer,
                required: false,
                min_value: 1,
                max_value: 25
            }
        ],
        dm_permission: false
    },
    options: {},
    callback: async (client, interaction) => {
        if (!interaction.guild) return;

        await interaction.deferReply({ ephemeral: true });

        const limit = interaction.options.getInteger('limit') || 10;
        const userId = interaction.user.id;

        const transactions = await client.prisma.transaction.findMany({
            where: {
                OR: [
                    { fromUserId: userId },
                    { toUserId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        if (transactions.length === 0) {
            await interaction.followUp({ content: '📭 还没有交易记录', ephemeral: true });
            return;
        }

        const lines = transactions.map((tx) => {
            const isIncoming = tx.toUserId === userId;
            const sign = isIncoming ? '+' : '-';
            const emoji = tx.currency === 'gold' ? '🪙' : '🥈';
            const typeLabel = typeLabels[tx.type] || tx.type;
            const date = tx.createdAt.toISOString().split('T')[0];

            let desc = `${sign}${tx.amount.toFixed(tx.currency === 'gold' ? 2 : 1)} ${emoji}`;
            desc += ` | ${typeLabel}`;

            if (tx.type === 'transfer') {
                if (isIncoming) {
                    desc += ` (来自 <@${tx.fromUserId}>)`;
                } else {
                    desc += ` (给 <@${tx.toUserId}>)`;
                }
            }

            if (tx.note) desc += ` — ${tx.note}`;
            desc += ` · ${date}`;

            return desc;
        });

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 ${interaction.user.username} 的交易记录`)
            .setDescription(lines.join('\n'))
            .setFooter({ text: `最近 ${transactions.length} 条记录` })
            .setTimestamp();

        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
});
