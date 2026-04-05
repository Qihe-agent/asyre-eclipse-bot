import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";
import panelConfig from "../../skill-panels.json";

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'cognitive-log',
        description: '认知记录面板 — 开子区 / 归档 / 查看往期',
        options: [],
        dm_permission: false
    },
    options: {
        developersOnly: true
    },
    callback: async (_client, interaction) => {
        if (!interaction.guild) return;

        const panel = (panelConfig.panels as any).cognitive_archive;
        if (!panel) {
            await interaction.reply({ content: '❌ 面板配置未找到。', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(panel.color)
            .setTitle(panel.title)
            .setDescription(panel.description)
            .setFooter({ text: panel.footer })
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('sp_cognitive_archive_open')
                    .setLabel('📝 开记录')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('sp_cognitive_archive_archive')
                    .setLabel('📦 归档')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('sp_cognitive_archive_history')
                    .setLabel('📜 往期')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
});
