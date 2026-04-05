/**
 * Bot Configuration Loader
 * Reads bot-config.json for all guild-specific and global settings.
 * No hardcoded Discord IDs anywhere — everything comes from config.
 */

import configData from "../bot-config.json";

interface WelcomeConfig {
  enabled: boolean;
  channelId: string;
  autoRoleId: string;
  title: string;
  description: string;
  thumbnailFromUser: boolean;
  color: number;
}

interface LevelupConfig {
  enabled: boolean;
  banner: string;
  color: number;
  noLeveling: boolean;
  noXpChannels: string[];
}

interface TeamConfig {
  mention: string[];
  silent: string[];
  familyRoleId: string;
}

interface TicketConfig {
  enabled: boolean;
  title: string;
  categories: any[];
  notifyUsers: string[];
}

interface GuildConfig {
  brand: string;
  footer: string;
  color: number;
  welcome: WelcomeConfig;
  levelup: LevelupConfig;
  team: TeamConfig;
  ticket: TicketConfig;
}

interface BotConfig {
  bot: {
    id: string;
    ownerId: string;
    developers: string[];
  };
  defaults: {
    color: number;
    brand: string;
    footer: string;
  };
  guilds: Record<string, Partial<GuildConfig>>;
}

const config = configData as BotConfig;

const DEFAULT_WELCOME: WelcomeConfig = {
  enabled: false, channelId: "", autoRoleId: "",
  title: "Welcome!", description: "Welcome to the server!",
  thumbnailFromUser: true, color: 5793266
};

const DEFAULT_LEVELUP: LevelupConfig = {
  enabled: true, banner: "levelup_banner.png",
  color: 16766720, noLeveling: false, noXpChannels: []
};

const DEFAULT_TEAM: TeamConfig = {
  mention: [], silent: [], familyRoleId: ""
};

const DEFAULT_TICKET: TicketConfig = {
  enabled: false, title: "Support Center",
  categories: [], notifyUsers: []
};

/** Get bot-level config */
export function getBotConfig() {
  return config.bot;
}

/** Get defaults */
export function getDefaults() {
  return config.defaults;
}

/** Get full guild config with defaults applied */
export function getGuildConfig(guildId: string): GuildConfig {
  const g = config.guilds[guildId] || {};
  return {
    brand: g.brand || config.defaults.brand,
    footer: g.footer || config.defaults.footer,
    color: g.color || config.defaults.color,
    welcome: { ...DEFAULT_WELCOME, ...g.welcome },
    levelup: { ...DEFAULT_LEVELUP, ...g.levelup },
    team: { ...DEFAULT_TEAM, ...g.team },
    ticket: { ...DEFAULT_TICKET, ...g.ticket },
  };
}

/** Get team members for a guild (who to @ and who to silently add to threads) */
export function getTeamForGuild(guildId: string, triggeredBy: string): { mention: string[]; silent: string[] } {
  const gc = getGuildConfig(guildId);
  const mention = gc.team.mention.length > 0 ? gc.team.mention : [triggeredBy];
  const silent = gc.team.silent.filter(id => !mention.includes(id));
  return { mention, silent };
}

export default config;
