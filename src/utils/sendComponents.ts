/**
 * 发送交互组件（select menu / buttons）到指定频道
 * 
 * CLI Usage:
 *   node dist/utils/sendComponents.js --channel <id> --type select \
 *     --prompt "选择..." --id <customId> \
 *     --options '[{"label":"A","value":"a","description":"desc"},...]'
 * 
 *   node dist/utils/sendComponents.js --channel <id> --type buttons \
 *     --prompt "确认？" --id <customId> \
 *     --options '[{"label":"确认","value":"yes","style":"success"},{"label":"取消","value":"no","style":"danger"}]'
 * 
 * When user interacts, Eclipse posts result as: [COMPONENT_RESULT:<customId>] <selected_value>
 */

import { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, TextChannel, EmbedBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Option {
    label: string;
    value: string;
    description?: string;
    emoji?: string;
    style?: 'primary' | 'secondary' | 'success' | 'danger';
}

function parseArgs(): { channel: string; type: string; prompt: string; id: string; options: Option[]; embed?: { title: string; description: string; color?: number } } {
    const args = process.argv.slice(2);
    const result: any = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const val = args[i + 1];
        result[key] = val;
    }

    return {
        channel: result.channel,
        type: result.type || 'select',
        prompt: result.prompt || '请选择：',
        id: result.id || 'sp_dynamic',
        options: JSON.parse(result.options || '[]'),
        embed: result.embed ? JSON.parse(result.embed) : undefined
    };
}

async function main() {
    const args = parseArgs();
    
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    
    await new Promise<void>((resolve) => {
        client.once('ready', () => resolve());
        client.login(process.env.CLIENT_TOKEN!.trim());
    });

    const channel = await client.channels.fetch(args.channel) as TextChannel;
    
    let row: ActionRowBuilder<any>;
    
    if (args.type === 'select') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(args.id)
            .setPlaceholder(args.prompt);
        
        for (const opt of args.options) {
            const menuOpt = new StringSelectMenuOptionBuilder()
                .setLabel(opt.label)
                .setValue(opt.value);
            if (opt.description) menuOpt.setDescription(opt.description);
            if (opt.emoji) menuOpt.setEmoji(opt.emoji);
            selectMenu.addOptions(menuOpt);
        }
        
        row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    } else {
        // buttons
        const styleMap: Record<string, ButtonStyle> = {
            primary: ButtonStyle.Primary,
            secondary: ButtonStyle.Secondary,
            success: ButtonStyle.Success,
            danger: ButtonStyle.Danger,
        };
        
        const buttons = args.options.map(opt => 
            new ButtonBuilder()
                .setCustomId(`${args.id}_${opt.value}`)
                .setLabel(opt.label)
                .setStyle(styleMap[opt.style || 'primary'] || ButtonStyle.Primary)
        );
        
        row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
    }

    const msgPayload: any = { components: [row] };
    
    if (args.embed) {
        msgPayload.embeds = [new EmbedBuilder()
            .setTitle(args.embed.title)
            .setDescription(args.embed.description)
            .setColor(args.embed.color || 0x586F72)
        ];
    } else {
        msgPayload.content = args.prompt;
    }

    await channel.send(msgPayload);
    console.log('✅ Components sent to', args.channel);
    
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
