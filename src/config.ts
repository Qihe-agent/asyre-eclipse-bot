import { getBotConfig } from "./utils/botConfig";

const botConfig = getBotConfig();

export default {
    developers: botConfig.developers,
    ownerId: botConfig.ownerId
};
