import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

export default new NetLevelBotCommand({
    type: 1,
    structure: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('查看和管理工单')
        .setDefaultMemberPermissions(8)
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('列出所有工单（活跃 + 归档）')
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('删除指定工单')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('工单线程 ID')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('关闭指定工单')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('工单线程 ID')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('reopen')
                .setDescription('重新打开归档工单（可查看内容）')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('工单线程 ID')
                        .setRequired(true)
                )
        ) as SlashCommandBuilder,
    options: {
        guildOwnerOnly: false,
    },
    callback: async (client, interaction) => {
        if (!interaction.isChatInputCommand()) return;
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild!;

        if (sub === 'list') {
            await interaction.deferReply({ ephemeral: true });
            
            // Fetch active threads
            const active = await guild.channels.fetchActiveThreads();
            const activeTickets = active.threads.filter(
                t => t.name.includes('🎫│') || t.name.includes('🤝│') || t.name.includes('✍️│')
            );

            // Scan all text channels in the guild for archived ticket threads
            let archivedTickets: { name: string; id: string; archived: boolean; locked: boolean }[] = [];

            const textChannels = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText);
            for (const [, ch] of textChannels) {
                try {
                    const textCh = ch as any;
                    const archived = await textCh.threads.fetchArchived({ type: 'private', fetchAll: true });
                    archived.threads.forEach((t: any) => {
                        if (t.name.includes('🎫│') || t.name.includes('🤝│') || t.name.includes('✍️│')) {
                            archivedTickets.push({
                                name: t.name,
                                id: t.id,
                                archived: true,
                                locked: t.locked || false,
                            });
                        }
                    });
                } catch (e) {
                    // ignore channels where we can't fetch threads
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🎫 工单管理面板')
                .setColor(0xFFD700)
                .setTimestamp();

            let activeList = '';
            activeTickets.forEach(t => {
                activeList += `🟢 <#${t.id}> \`${t.id}\`\n`;
            });
            embed.addFields({
                name: `活跃工单 (${activeTickets.size})`,
                value: activeList || '无',
                inline: false
            });

            let archivedList = '';
            archivedTickets.forEach(t => {
                archivedList += `📦 <#${t.id}> \`${t.id}\` ${t.locked ? '🔒' : ''}\n`;
            });
            embed.addFields({
                name: `归档工单 (${archivedTickets.length})`,
                value: archivedList || '无',
                inline: false
            });

            embed.addFields({
                name: '💡 操作',
                value: '`/tickets close <id>` ── 关闭工单\n`/tickets delete <id>` ── 永久删除工单',
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });
        }

        else if (sub === 'delete') {
            const threadId = interaction.options.getString('id', true);
            try {
                const thread = await guild.channels.fetch(threadId);
                if (!thread || !thread.isThread()) {
                    await interaction.reply({ content: '❌ 找不到该工单线程。', ephemeral: true });
                    return;
                }
                const name = thread.name;
                await thread.delete('Deleted by admin');
                await interaction.reply({ content: `✅ 工单 \`${name}\` 已永久删除。`, ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: '❌ 删除失败，请确认 ID 是否正确。', ephemeral: true });
            }
        }

        else if (sub === 'close') {
            const threadId = interaction.options.getString('id', true);
            try {
                const thread = await guild.channels.fetch(threadId);
                if (!thread || !thread.isThread()) {
                    await interaction.reply({ content: '❌ 找不到该工单线程。', ephemeral: true });
                    return;
                }
                await (thread as any).setLocked(true);
                await (thread as any).setArchived(true);
                await interaction.reply({ content: `✅ 工单 \`${thread.name}\` 已关闭并归档。`, ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: '❌ 关闭失败，请确认 ID 是否正确。', ephemeral: true });
            }
        }

        else if (sub === 'reopen') {
            const threadId = interaction.options.getString('id', true);
            try {
                const thread = await guild.channels.fetch(threadId);
                if (!thread || !thread.isThread()) {
                    await interaction.reply({ content: '❌ 找不到该工单线程。', ephemeral: true });
                    return;
                }
                await (thread as any).setArchived(false);
                await (thread as any).setLocked(false);
                await interaction.reply({ content: `✅ 工单已重新打开：<#${thread.id}>\n点击即可查看历史记录。需要时可用 \`/tickets close\` 再次关闭。`, ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: '❌ 重新打开失败，请确认 ID 是否正确。', ephemeral: true });
            }
        }
    }
});
