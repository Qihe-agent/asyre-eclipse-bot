import { getGuildConfig, getBotConfig } from "../utils/botConfig";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ButtonInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction,
    ChannelType,
    TextChannel,
} from 'discord.js';
import { nextTicketId } from './ticketCounter';

// ═══════════════════════════════════════════════
//  In-flight lock to prevent race-condition duplicates
// ═══════════════════════════════════════════════
const creatingTicket = new Set<string>(); // tracks "userId:label" currently being created

// ═══════════════════════════════════════════════
//  Category & Sub-category Definitions
// ═══════════════════════════════════════════════

interface SubCategory {
    value: string;
    label: string;
    emoji: string;
}

interface Category {
    id: string;
    label: string;
    emoji: string;
    description: string;
    subcategories: SubCategory[];
}

const CATEGORIES: Category[] = [
    {
        id: 'academic',
        label: '学术类',
        emoji: '📚',
        description: '从作业到毕业，学术路上的一切我们都能帮。\n论文、编程、选课、申请文书、学术档案优化，一站搞定。',
        subcategories: [
            { value: 'assignment', label: '完成作业 / 论文', emoji: '📝' },
            { value: 'code', label: '编程作业 / 项目', emoji: '💻' },
            { value: 'course', label: '选课咨询', emoji: '📋' },
            { value: 'application', label: '留学申请 / 文书', emoji: '🎓' },
            { value: 'exam_prep', label: '考前辅导 / 复习', emoji: '📖' },
            { value: 'academic_other', label: '其他学术问题', emoji: '💬' },
        ],
    },
    {
        id: 'work',
        label: '工作类',
        emoji: '💼',
        description: '求职、商务、翻译，职场需要的文字我们包了。\n简历打磨、商务文案、多语翻译、职业档案优化。\n\n🤖 **NEW: AI 工作外包** — 我们有 AI 能力的团队，帮你外包重复性工作，省时省力。',
        subcategories: [
            { value: 'resume', label: '简历 / CV / 求职信', emoji: '📄' },
            { value: 'copywriting', label: '商务文案 / 内容创作', emoji: '✍️' },
            { value: 'translation', label: '翻译（中英日韩等）', emoji: '🌐' },
            { value: 'linkedin', label: 'LinkedIn / 职业档案优化', emoji: '👔' },
            { value: 'outsource', label: 'AI 工作外包', emoji: '🤖' },
            { value: 'work_other', label: '其他工作需求', emoji: '💬' },
        ],
    },
    {
        id: 'info',
        label: '信息获取',
        emoji: '🔍',
        description: '需要调研、数据、或者任何信息整理？交给我们。\n文献检索、数据分析、市场调研、信息汇总。',
        subcategories: [
            { value: 'research', label: '资料调研 / 文献检索', emoji: '🔬' },
            { value: 'data', label: '数据分析', emoji: '📊' },
            { value: 'market', label: '市场调研 / 行业报告', emoji: '📈' },
            { value: 'info_other', label: '其他', emoji: '💬' },
        ],
    },
    {
        id: 'life',
        label: '海外生活',
        emoji: '🌏',
        description: '留学生活大小事，我们帮你搞定。\n签证租房、搬家维修、道路救援、吃喝玩乐，统统能办。\n\n📍 **目前支持悉尼 & 墨尔本本地团队上门服务**\n🌐 其他城市？联系我们，我们帮你对接当地资源。',
        subcategories: [
            { value: 'visa', label: '签证 / 移民咨询', emoji: '🛂' },
            { value: 'housing', label: '租房 / 找室友', emoji: '🏠' },
            { value: 'moving', label: '搬家 / 搬运服务', emoji: '📦' },
            { value: 'repair', label: '维修（水管、电工、网络）', emoji: '🔧' },
            { value: 'pest', label: '除虫 / 清洁服务', emoji: '🐛' },
            { value: 'roadside', label: '道路救援 / 车辆问题', emoji: '🚗' },
            { value: 'travel', label: '玩乐推荐 / 旅行攻略', emoji: '🎯' },
            { value: 'legal', label: '法律 / 保险咨询', emoji: '⚖️' },
            { value: 'life_other', label: '其他生活需求', emoji: '💬' },
        ],
    },
];

// ═══════════════════════════════════════════════
//  Modal Form Definitions (per sub-category)
// ═══════════════════════════════════════════════

interface ModalField {
    id: string;
    label: string;
    placeholder: string;
    style: 'short' | 'paragraph';
    required: boolean;
}

interface ModalConfig {
    title: string;
    threadEmoji: string;
    threadLabel: string;
    fields: ModalField[];
}

const MODAL_CONFIGS: Record<string, ModalConfig> = {
    // ── Academic ──
    assignment: {
        title: '📝 完成作业 / 论文',
        threadEmoji: '📝',
        threadLabel: '作业',
        fields: [
            { id: 'subject', label: '学科', placeholder: '如：Economics, Psychology, Computer Science...', style: 'short', required: true },
            { id: 'type', label: '作业类型', placeholder: 'Essay / Report / Research / Lab / Case Study / Dissertation', style: 'short', required: true },
            { id: 'wordcount', label: '字数要求', placeholder: '如：2000 words', style: 'short', required: true },
            { id: 'deadline', label: '截止日期', placeholder: '如：2026-02-20 23:59 AEST', style: 'short', required: true },
            { id: 'notes', label: '补充说明（引用格式、特殊要求等）', placeholder: '如：APA 7th, 需要10个references, topic是...', style: 'paragraph', required: false },
        ],
    },
    course: {
        title: '📋 选课咨询',
        threadEmoji: '📋',
        threadLabel: '选课',
        fields: [
            { id: 'school', label: '学校', placeholder: '如：University of Melbourne', style: 'short', required: true },
            { id: 'major', label: '专业 / 方向', placeholder: '如：Computer Science, Finance...', style: 'short', required: true },
            { id: 'semester', label: '学期', placeholder: '如：2026 Semester 1', style: 'short', required: true },
            { id: 'notes', label: '具体需求', placeholder: '想选什么方向、避开哪些课、GPA目标等', style: 'paragraph', required: true },
        ],
    },
    application: {
        title: '🎓 留学申请 / 文书',
        threadEmoji: '🎓',
        threadLabel: '申请',
        fields: [
            { id: 'app_type', label: '申请类型', placeholder: '本科 / 硕士 / 博士 / 交换', style: 'short', required: true },
            { id: 'target', label: '目标院校 / 国家', placeholder: '如：英国 G5、澳洲八大、美国 Top 50', style: 'short', required: true },
            { id: 'documents', label: '需要的文书', placeholder: 'Personal Statement / CV / SOP / 推荐信 / 其他', style: 'short', required: true },
            { id: 'deadline', label: '截止日期', placeholder: '如：2026-03-01', style: 'short', required: true },
            { id: 'notes', label: '补充说明', placeholder: '你的背景、GPA、工作经历等', style: 'paragraph', required: false },
        ],
    },
    code: {
        title: '💻 编程作业 / 项目',
        threadEmoji: '💻',
        threadLabel: '编程',
        fields: [
            { id: 'language', label: '编程语言 / 框架', placeholder: '如：Python, Java, React, MATLAB, R...', style: 'short', required: true },
            { id: 'type', label: '作业类型', placeholder: '如：Lab / Project / Algorithm / Web App / 数据库', style: 'short', required: true },
            { id: 'deadline', label: '截止日期', placeholder: '如：2026-02-20 23:59 AEST', style: 'short', required: true },
            { id: 'notes', label: '具体要求', placeholder: '功能描述、技术要求、评分标准等，文件可在工单内上传', style: 'paragraph', required: true },
        ],
    },

    // ── Work ──
    resume: {
        title: '📄 简历 / CV',
        threadEmoji: '📄',
        threadLabel: '简历',
        fields: [
            { id: 'industry', label: '目标行业 / 岗位', placeholder: '如：Tech PM / Consulting / Investment Banking', style: 'short', required: true },
            { id: 'experience', label: '工作经验', placeholder: '如：应届 / 3年 / 转行', style: 'short', required: true },
            { id: 'language', label: '语言', placeholder: 'English / 中文 / 双语', style: 'short', required: true },
            { id: 'deadline', label: '期望完成时间', placeholder: '如：1周内', style: 'short', required: false },
            { id: 'notes', label: '其他要求', placeholder: '现有简历可在工单内上传', style: 'paragraph', required: false },
        ],
    },
    copywriting: {
        title: '✍️ 商务文案 / 内容创作',
        threadEmoji: '✍️',
        threadLabel: '文案',
        fields: [
            { id: 'purpose', label: '用途', placeholder: '如：公众号、官网、产品介绍、营销文案...', style: 'short', required: true },
            { id: 'language', label: '语言', placeholder: 'English / 中文 / 双语', style: 'short', required: true },
            { id: 'wordcount', label: '字数', placeholder: '如：1000字', style: 'short', required: true },
            { id: 'deadline', label: '截止日期', placeholder: '如：2026-02-20', style: 'short', required: true },
            { id: 'notes', label: '详细描述', placeholder: '风格要求、参考案例、品牌调性等', style: 'paragraph', required: false },
        ],
    },
    translation: {
        title: '🌐 翻译',
        threadEmoji: '🌐',
        threadLabel: '翻译',
        fields: [
            { id: 'direction', label: '翻译方向', placeholder: '如：中→英 / 英→中 / 日→中', style: 'short', required: true },
            { id: 'wordcount', label: '字数 / 页数', placeholder: '如：5000字 / 10页', style: 'short', required: true },
            { id: 'field', label: '领域', placeholder: '如：学术 / 法律 / 商务 / 技术', style: 'short', required: true },
            { id: 'deadline', label: '截止日期', placeholder: '如：2026-02-20', style: 'short', required: true },
            { id: 'notes', label: '补充说明', placeholder: '术语要求、格式要求等，文件可在工单内上传', style: 'paragraph', required: false },
        ],
    },

    // ── Info ──
    research: {
        title: '🔬 资料调研 / 文献检索',
        threadEmoji: '🔬',
        threadLabel: '调研',
        fields: [
            { id: 'topic', label: '调研主题', placeholder: '如：XX行业市场分析 / XX领域文献综述', style: 'short', required: true },
            { id: 'scope', label: '范围 / 深度', placeholder: '如：5篇核心文献 / 行业全景报告', style: 'short', required: true },
            { id: 'deadline', label: '期望时间', placeholder: '如：1周内', style: 'short', required: true },
            { id: 'notes', label: '详细描述', placeholder: '具体需要什么信息、输出格式等', style: 'paragraph', required: true },
        ],
    },
    data: {
        title: '📊 数据分析',
        threadEmoji: '📊',
        threadLabel: '数据分析',
        fields: [
            { id: 'tool', label: '工具 / 语言', placeholder: '如：SPSS / Excel / Python / R / Stata', style: 'short', required: true },
            { id: 'scope', label: '数据规模', placeholder: '如：问卷200份 / 5年财报数据', style: 'short', required: true },
            { id: 'deadline', label: '截止日期', placeholder: '如：2026-02-20', style: 'short', required: true },
            { id: 'notes', label: '详细描述', placeholder: '分析目标、数据来源、输出要求等', style: 'paragraph', required: true },
        ],
    },

    // ── Academic extras ──
    exam_prep: {
        title: '📖 考前辅导 / 复习',
        threadEmoji: '📖',
        threadLabel: '考前辅导',
        fields: [
            { id: 'subject', label: '科目', placeholder: '如：Calculus, Accounting, Statistics...', style: 'short', required: true },
            { id: 'exam_date', label: '考试日期', placeholder: '如：2026-02-25', style: 'short', required: true },
            { id: 'format', label: '考试形式', placeholder: '如：闭卷 / 开卷 / Online / 口试', style: 'short', required: true },
            { id: 'notes', label: '需要辅导的内容', placeholder: '薄弱章节、往年题、重点知识等', style: 'paragraph', required: true },
        ],
    },

    // ── Work extras ──
    outsource: {
        title: '🤖 AI 工作外包',
        threadEmoji: '🤖',
        threadLabel: 'AI外包',
        fields: [
            { id: 'task', label: '需要外包的工作内容', placeholder: '如：数据录入、邮件处理、报表生成、社媒运营...', style: 'short', required: true },
            { id: 'frequency', label: '频率 / 周期', placeholder: '如：一次性 / 每周 / 长期', style: 'short', required: true },
            { id: 'budget', label: '预算范围', placeholder: '如：$50/次 / $500/月 / 面议', style: 'short', required: false },
            { id: 'notes', label: '详细描述', placeholder: '工作量、交付标准、工具要求等，越详细越好', style: 'paragraph', required: true },
        ],
    },
    linkedin: {
        title: '👔 LinkedIn / 职业档案优化',
        threadEmoji: '👔',
        threadLabel: 'LinkedIn',
        fields: [
            { id: 'industry', label: '目标行业', placeholder: '如：Tech / Finance / Consulting', style: 'short', required: true },
            { id: 'language', label: '语言', placeholder: 'English / 中文 / 双语', style: 'short', required: true },
            { id: 'notes', label: '具体需求', placeholder: '优化 Summary / Experience / 全面重写等', style: 'paragraph', required: true },
        ],
    },

    // ── Info extras ──
    market: {
        title: '📈 市场调研 / 行业报告',
        threadEmoji: '📈',
        threadLabel: '市场调研',
        fields: [
            { id: 'topic', label: '调研方向', placeholder: '如：澳洲奶茶市场、跨境电商趋势...', style: 'short', required: true },
            { id: 'purpose', label: '用途', placeholder: '如：商业计划书 / 课程作业 / 投资参考', style: 'short', required: true },
            { id: 'deadline', label: '期望时间', placeholder: '如：1周内', style: 'short', required: true },
            { id: 'notes', label: '详细描述', placeholder: '具体需要什么数据、输出格式等', style: 'paragraph', required: false },
        ],
    },

    // ── Life ──
    visa: {
        title: '🛂 签证 / 移民咨询',
        threadEmoji: '🛂',
        threadLabel: '签证',
        fields: [
            { id: 'visa_type', label: '签证类型', placeholder: '如：学生签 / 工签 / PR / 旅游签 / 配偶签', style: 'short', required: true },
            { id: 'city', label: '所在城市', placeholder: '如：Sydney / Melbourne', style: 'short', required: true },
            { id: 'situation', label: '当前情况', placeholder: '如：在读 / 毕业 / 在职 / 签证即将到期', style: 'short', required: true },
            { id: 'notes', label: '详细描述', placeholder: '时间线、特殊情况、需要什么帮助等', style: 'paragraph', required: true },
        ],
    },
    housing: {
        title: '🏠 租房 / 找室友',
        threadEmoji: '🏠',
        threadLabel: '租房',
        fields: [
            { id: 'city', label: '城市 / 区域', placeholder: '如：Sydney CBD / Melbourne南区 / Burwood', style: 'short', required: true },
            { id: 'budget', label: '预算', placeholder: '如：$300/week', style: 'short', required: true },
            { id: 'timeline', label: '入住时间', placeholder: '如：2026年3月', style: 'short', required: true },
            { id: 'notes', label: '详细需求', placeholder: '室友要求、几人间、宠物、交通偏好等', style: 'paragraph', required: true },
        ],
    },
    moving: {
        title: '📦 搬家 / 搬运服务',
        threadEmoji: '📦',
        threadLabel: '搬家',
        fields: [
            { id: 'city', label: '城市', placeholder: 'Sydney / Melbourne', style: 'short', required: true },
            { id: 'route', label: '搬运路线', placeholder: '如：Burwood → CBD，约5km', style: 'short', required: true },
            { id: 'date', label: '希望日期', placeholder: '如：2026-02-20', style: 'short', required: true },
            { id: 'notes', label: '物品说明', placeholder: '大件家具数量、楼层、是否需要打包等', style: 'paragraph', required: true },
        ],
    },
    repair: {
        title: '🔧 维修服务（水管、电工、网络）',
        threadEmoji: '🔧',
        threadLabel: '维修',
        fields: [
            { id: 'type', label: '维修类型', placeholder: '如：水管漏水 / 电路问题 / WiFi故障 / 空调维修', style: 'short', required: true },
            { id: 'city', label: '城市 / 区域', placeholder: '如：Sydney Burwood / Melbourne CBD', style: 'short', required: true },
            { id: 'urgency', label: '紧急程度', placeholder: '紧急（今天）/ 这周 / 不急', style: 'short', required: true },
            { id: 'notes', label: '问题描述', placeholder: '具体什么情况、拍照可在工单内发', style: 'paragraph', required: true },
        ],
    },
    pest: {
        title: '🐛 除虫 / 清洁服务',
        threadEmoji: '🐛',
        threadLabel: '除虫清洁',
        fields: [
            { id: 'type', label: '服务类型', placeholder: '如：蟑螂 / 蚂蚁 / 蜘蛛 / 老鼠 / 深度清洁', style: 'short', required: true },
            { id: 'city', label: '城市 / 区域', placeholder: '如：Sydney / Melbourne + 具体区', style: 'short', required: true },
            { id: 'urgency', label: '紧急程度', placeholder: '紧急 / 这周 / 预约', style: 'short', required: true },
            { id: 'notes', label: '补充说明', placeholder: '房屋大小、虫子情况、有无宠物等', style: 'paragraph', required: false },
        ],
    },
    roadside: {
        title: '🚗 道路救援 / 车辆问题',
        threadEmoji: '🚗',
        threadLabel: '道路救援',
        fields: [
            { id: 'issue', label: '问题类型', placeholder: '如：爆胎 / 电瓶没电 / 抛锚 / 被锁车外 / 拖车', style: 'short', required: true },
            { id: 'location', label: '当前位置', placeholder: '如：Sydney Olympic Park停车场 / M1高速', style: 'short', required: true },
            { id: 'urgency', label: '是否紧急', placeholder: '现在就需要 / 可以等几小时', style: 'short', required: true },
            { id: 'notes', label: '补充说明', placeholder: '车型、保险情况等', style: 'paragraph', required: false },
        ],
    },
    travel: {
        title: '🎯 玩乐推荐 / 旅行攻略',
        threadEmoji: '🎯',
        threadLabel: '玩乐推荐',
        fields: [
            { id: 'city', label: '城市', placeholder: 'Sydney / Melbourne / 其他', style: 'short', required: true },
            { id: 'type', label: '想玩什么', placeholder: '如：美食 / 周末一日游 / 网红打卡 / 自驾 / 露营', style: 'short', required: true },
            { id: 'people', label: '人数 / 谁一起', placeholder: '如：2人 / 朋友聚会 / 约会', style: 'short', required: false },
            { id: 'notes', label: '补充说明', placeholder: '预算、偏好、有没有车等', style: 'paragraph', required: false },
        ],
    },
    legal: {
        title: '⚖️ 法律 / 保险咨询',
        threadEmoji: '⚖️',
        threadLabel: '法律咨询',
        fields: [
            { id: 'type', label: '咨询类型', placeholder: '如：交通事故 / 租房纠纷 / 保险理赔 / 劳动纠纷', style: 'short', required: true },
            { id: 'city', label: '所在城市', placeholder: 'Sydney / Melbourne', style: 'short', required: true },
            { id: 'notes', label: '情况描述', placeholder: '尽量详细描述你的情况，我们会帮你对接合适的资源', style: 'paragraph', required: true },
        ],
    },

    // ── Generic "other" modals ──
    academic_other: {
        title: '💬 其他学术问题',
        threadEmoji: '📚',
        threadLabel: '学术咨询',
        fields: [
            { id: 'notes', label: '请描述你的需求', placeholder: '越详细越好，我们会在工单内跟进', style: 'paragraph', required: true },
        ],
    },
    work_other: {
        title: '💬 其他工作需求',
        threadEmoji: '💼',
        threadLabel: '工作需求',
        fields: [
            { id: 'notes', label: '请描述你的需求', placeholder: '越详细越好，我们会在工单内跟进', style: 'paragraph', required: true },
        ],
    },
    info_other: {
        title: '💬 信息获取',
        threadEmoji: '🔍',
        threadLabel: '信息获取',
        fields: [
            { id: 'notes', label: '请描述你的需求', placeholder: '越详细越好，我们会在工单内跟进', style: 'paragraph', required: true },
        ],
    },
    life_other: {
        title: '💬 海外生活',
        threadEmoji: '🌏',
        threadLabel: '海外生活',
        fields: [
            { id: 'notes', label: '请描述你的需求', placeholder: '越详细越好，我们会在工单内跟进', style: 'paragraph', required: true },
        ],
    },
};

// ═══════════════════════════════════════════════
//  Panel Builder — 服务中心多按钮面板
// ═══════════════════════════════════════════════

export function buildServicePanel(guildId?: string) {
    const embed = new EmbedBuilder()
        .setTitle(getGuildConfig(guildId || "").ticket.title || "Support Center")
        .setDescription(
            '无论是学术任务、工作需求还是海外生活，我们都能帮你。\n' +
            '选择服务类型，开启专属工单 👇\n\n' +
            '> 📚 **学术类** — 作业、论文、选课、留学申请、编程\n' +
            '> 💼 **工作类** — 简历、文案、翻译\n' +
            '> 🔍 **信息获取** — 调研、数据分析\n' +
            '> 🌏 **海外生活** — 签证、租房、生活指南\n\n' +
            '*你的信息完全私密，只有你和团队可以看到。*'
        )
        .setColor(0x2ECC71)
        .setFooter({ text: 'Eclipse Ink ── 专业、高效、保密' });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...CATEGORIES.map(cat =>
            new ButtonBuilder()
                .setCustomId(`ticket_cat_${cat.id}`)
                .setLabel(cat.label)
                .setEmoji(cat.emoji)
                .setStyle(ButtonStyle.Primary)
        )
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_cat_chat')
            .setLabel('不确定？先聊聊')
            .setEmoji('💬')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2] };
}

// ═══════════════════════════════════════════════
//  Interaction Handlers
// ═══════════════════════════════════════════════

/**
 * Handle category button click → show sub-category select menu
 */
export async function handleCategoryButton(interaction: ButtonInteraction) {
    const catId = interaction.customId.replace('ticket_cat_', '');

    // "先聊聊" — skip sub-category, directly create ticket
    if (catId === 'chat') {
        await createTicket(interaction, '💬', '咨询', null);
        return;
    }

    const category = CATEGORIES.find(c => c.id === catId);
    if (!category) return;

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket_sub_${catId}`)
        .setPlaceholder('选择具体服务类型...')
        .addOptions(
            category.subcategories.map(sub => ({
                label: sub.label,
                value: sub.value,
                emoji: sub.emoji,
            }))
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const introEmbed = new EmbedBuilder()
        .setTitle(`${category.emoji} ${category.label}`)
        .setDescription(category.description + '\n\n**选择具体类型开始 👇**')
        .setColor(0x2ECC71);

    await interaction.reply({
        embeds: [introEmbed],
        components: [row],
        ephemeral: true,
    });
}

/**
 * Handle sub-category select → show modal form
 */
export async function handleSubcategorySelect(interaction: StringSelectMenuInteraction) {
    const subValue = interaction.values[0];
    const modalConfig = MODAL_CONFIGS[subValue];
    if (!modalConfig) return;

    const modal = new ModalBuilder()
        .setCustomId(`ticket_form_${subValue}`)
        .setTitle(modalConfig.title);

    const rows = modalConfig.fields.map(field => {
        const input = new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setPlaceholder(field.placeholder)
            .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(field.required);

        if (field.style === 'paragraph') {
            input.setMaxLength(1000);
        }

        return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
    });

    modal.addComponents(...rows);
    await interaction.showModal(modal);
}

/**
 * Handle modal form submission → create ticket with collected info
 */
export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    const subValue = interaction.customId.replace('ticket_form_', '');
    const modalConfig = MODAL_CONFIGS[subValue];
    if (!modalConfig) return;

    // Collect field values
    const fieldValues: { label: string; value: string }[] = [];
    for (const field of modalConfig.fields) {
        try {
            const value = interaction.fields.getTextInputValue(field.id);
            if (value && value.trim()) {
                fieldValues.push({ label: field.label, value: value.trim() });
            }
        } catch {
            // field not found, skip
        }
    }

    await createTicket(
        interaction,
        modalConfig.threadEmoji,
        modalConfig.threadLabel,
        { title: modalConfig.title, fields: fieldValues }
    );
}

// ═══════════════════════════════════════════════
//  Ticket Creation (shared by all paths)
// ═══════════════════════════════════════════════

async function createTicket(
    interaction: ButtonInteraction | ModalSubmitInteraction,
    emoji: string,
    label: string,
    formData: { title: string; fields: { label: string; value: string }[] } | null
) {
    const guild = interaction.guild!;
    const user = interaction.user;

    // ── Per-user lock: prevent duplicate tickets from double-clicks / race conditions ──
    const lockKey = `${user.id}:${label}`;
    if (creatingTicket.has(lockKey)) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ content: '⏳ 正在创建中，请稍候...', ephemeral: true });
            }
        } catch { /* ignore */ }
        return;
    }
    creatingTicket.add(lockKey);

    // Defer immediately — if this throws, it's a duplicate event, skip it
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }
    } catch {
        creatingTicket.delete(lockKey);
        return; // duplicate interaction, skip
    }

    // Find source channel
    let sourceChannel: TextChannel | null = null;
    if (interaction.channel && interaction.channel.type === ChannelType.GuildText) {
        sourceChannel = interaction.channel as TextChannel;
    } else if (interaction.channelId) {
        try {
            const ch = await guild.channels.fetch(interaction.channelId);
            if (ch && ch.type === ChannelType.GuildText) {
                sourceChannel = ch as TextChannel;
            }
        } catch { /* ignore */ }
    }

    if (!sourceChannel) {
        await interaction.editReply({ content: '❌ 无法在此频道创建工单，请联系管理员。' });
        return;
    }

    // Check for existing open ticket by this user with the SAME service type
    const activeThreads = await guild.channels.fetchActiveThreads();
    const threadTitleBase = `${emoji}│${user.username}・${label}`;
    const existingThread = activeThreads.threads.find(
        t => t.name.includes(`│${user.username}・${label}`) && t.parentId === sourceChannel!.id
    );

    if (existingThread) {
        await interaction.editReply({
            content: `你已经有一个同类型的进行中工单了：<#${existingThread.id}>\n不同类型的服务可以同时开多个工单哦～`
        });
        return;
    }

    const ticketNum = nextTicketId();
    const threadTitle = `${emoji}│#${ticketNum}・${user.username}・${label}`;

    try {
        const thread = await sourceChannel.threads.create({
            name: threadTitle,
            type: ChannelType.PrivateThread,
            autoArchiveDuration: 10080,
            reason: `Ticket by ${user.tag}: ${label}`,
        });

        await thread.members.add(user.id);

        // Add team members
        const TEAM_MEMBERS = [
            ...getGuildConfig(interaction.guild!.id).ticket.notifyUsers,
        ];
        for (const memberId of TEAM_MEMBERS) {
            try { await thread.members.add(memberId); } catch { /* not in guild */ }
        }

        // Build welcome embed
        const welcomeEmbed = new EmbedBuilder().setColor(0xFFD700).setTimestamp();

        if (formData && formData.fields.length > 0) {
            welcomeEmbed.setTitle(formData.title);
            let desc = `欢迎 ${user}！\n\n**📋 你的需求信息：**\n\n`;
            for (const f of formData.fields) {
                desc += `> **${f.label}**\n> ${f.value}\n\n`;
            }
            desc += '**团队成员会尽快响应。如有补充资料（文件、截图等），可直接在此发送。**';
            welcomeEmbed.setDescription(desc);
        } else {
            welcomeEmbed
                .setTitle('💬 咨询')
                .setDescription(
                    `欢迎 ${user}！\n\n` +
                    '请随意描述你的需求，不确定也没关系。\n' +
                    '团队成员会尽快进来和你聊。\n\n' +
                    '*你的信息完全私密，只有你和团队可以看到。*'
                );
        }

        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('🔒 关闭工单')
                .setStyle(ButtonStyle.Danger)
        );

        await thread.send({
            content: `${user}\n\nNew ticket, please follow up 👆`,
            embeds: [welcomeEmbed],
            components: [closeRow],
        });

        await interaction.editReply({ content: `✅ 工单已创建：<#${thread.id}>` });
    } catch (err) {
        console.error('Ticket creation error:', err);
        try {
            await interaction.editReply({ content: '❌ 创建工单失败，请稍后重试或联系管理员。' });
        } catch { /* ignore */ }
    } finally {
        creatingTicket.delete(lockKey);
    }
}
