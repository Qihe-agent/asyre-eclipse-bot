import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";

export default new NetLevelBotCommand({
    type: 1,
    structure: {
        name: 'admin-panel',
        description: '后台管理面板 — 快捷工具入口',
        options: [],
        dm_permission: false
    },
    options: {
        developersOnly: true
    },
    callback: async (_client, interaction) => {
        if (!interaction.guild) return;

        const SERVER_IP = '13.228.189.206';

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🔧 后台管理面板')
            .setDescription(
                '快捷入口 — 点击按钮直接跳转\n\n' +
                '**📝 编辑器** — Markdown 编辑器 + 文件管理\n' +
                '**📂 文档中心** — 公司文档 / 知识库 / 认知归档\n' +
                '**📊 服务器状态** — PM2 进程 / 系统状态'
            )
            .setFooter({ text: '仅管理员可见' })
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('📝 编辑器')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`http://${SERVER_IP}/xh-edit/`),
                new ButtonBuilder()
                    .setLabel('📂 文档中心')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`http://${SERVER_IP}/qihe-49884c/`),
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
});
