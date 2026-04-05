import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { NetLevelBotCommand } from "../../class/Builders";
import { buildServicePanel } from "../../handlers/ticketSystem";

// Legacy single-button templates (kept for bug/payment/ai panels)
const PANEL_TEMPLATES: Record<string, { title: string; description: string; buttonLabel: string; footer: string }> = {
    bug: {
        title: '🐛 Bug 反馈 · 排障中心',
        description:
            '**遇到问题？点击下方按钮，提交 Bug 反馈。**\n\n' +
            '我们会在私密工单内与你一对一排查。\n' +
            '所有反馈都会认真处理。\n\n' +
            '> 📝 请准备好以下信息：\n' +
            '> 1️⃣ 问题描述（发生了什么？）\n' +
            '> 2️⃣ 复现步骤（怎么触发的？）\n' +
            '> 3️⃣ 涉及的功能/Bot\n' +
            '> 4️⃣ 截图或错误信息（如有）',
        buttonLabel: '🐛 提交 Bug',
        footer: '反馈让我们变得更好 ⚡',
    },
    ai: {
        title: '🤖 AI 学术咨询',
        description:
            '**点击下方按钮，向我们的 AI 助手提问。**\n\n' +
            '我们会在私密工单内为你解答学术问题。\n' +
            '无论是论文思路、选题方向、还是格式疑问，都可以问。\n\n' +
            '> 📝 提问时请说明：\n' +
            '> 1️⃣ 你的问题 / 困惑\n' +
            '> 2️⃣ 相关学科\n' +
            '> 3️⃣ 学历层次',
        buttonLabel: '🤖 开启咨询',
        footer: 'Eclipse Ink ── 有问题就问',
    },
    payment: {
        title: '💳 充值 · 提交支付凭证',
        description:
            '**点击下方按钮，开启充值工单。**\n\n' +
            '我们会在私密频道内与你一对一确认支付。\n' +
            '所有支付信息完全保密。\n\n' +
            '> 📝 请准备好以下信息：\n' +
            '> 1️⃣ 订单编号（如有）\n' +
            '> 2️⃣ 支付方式\n' +
            '> 3️⃣ 支付金额\n' +
            '> 4️⃣ 支付凭证截图',
        buttonLabel: '💳 提交充值',
        footer: 'Eclipse Ink ── 安全支付',
    },
};

export default new NetLevelBotCommand({
    type: 1,
    structure: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('部署工单面板到当前频道')
        .setDefaultMemberPermissions(8) // Admin only
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('工单类型')
                .setRequired(false)
                .addChoices(
                    { name: '服务中心（默认 · 多按钮）', value: 'service' },
                    { name: 'AI 学术咨询', value: 'ai' },
                    { name: '充值支付', value: 'payment' },
                    { name: 'Bug 反馈', value: 'bug' },
                )
        ) as SlashCommandBuilder,
    options: {
        guildOwnerOnly: false,
    },
    callback: async (client, interaction) => {
        const type = (interaction as any).options?.getString?.('type') || 'service';

        // New multi-button service center panel
        if (type === 'service') {
            const panel = buildServicePanel();
            await (interaction.channel as any)?.send(panel);
            await interaction.reply({
                content: '✅ 服务中心面板已部署。',
                ephemeral: true
            });
            return;
        }

        // Legacy single-button panels
        const template = PANEL_TEMPLATES[type];
        if (!template) {
            await interaction.reply({ content: '❌ 未知面板类型。', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(template.title)
            .setDescription(template.description)
            .setColor(0xFFD700)
            .setFooter({ text: template.footer });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_open')
                    .setLabel(template.buttonLabel)
                    .setStyle(ButtonStyle.Success)
            );

        await (interaction.channel as any)?.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: `✅ 工单面板（${template.title}）已部署。`,
            ephemeral: true
        });
    }
});
