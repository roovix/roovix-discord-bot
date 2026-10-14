
require('dotenv').config();
const {
    Client,
    Events,
    GatewayIntentBits
} = require('discord.js');

const config = require('./config.json');
const token = process.env.token;
const { generateReply } = require('./ai');
const { setupWelcome } = require('./welcome');
const { setupBanLog } = require('./ban-log');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Roovix is online as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check whether Roovix was mentioned
    const wasMentioned = message.mentions.has(client.user);

    // Or check whether the user replied directly to Roovix
    let repliedToRoovix = false;

    if (message.reference?.messageId) {
        try {
            const referencedMessage =
                await message.channel.messages.fetch(
                    message.reference.messageId
                );

            repliedToRoovix =
                referencedMessage.author.id === client.user.id;
        } catch {
            // Referenced message may no longer be accessible
        }
    }

    // Ignore ordinary conversations between members
    if (!wasMentioned && !repliedToRoovix) return;

    // Remove Roovix's mention from the prompt
    const prompt = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

    try {
        await message.channel.sendTyping();

        const reply = await generateReply(  
            message.author.id,
            message.channel.id,
            message.member?.displayName || message.author.globalName || message.author.username,
            prompt || 'Say a brief, friendly greeting.'
        );

        await message.reply({
            content: reply.slice(0, 1900),
            allowedMentions: {
                repliedUser: false
            }
        });
    } catch (error) {
        console.error('Roovix error:', error.message);

        await message.reply({
            content: 'I’m having trouble responding right now. Try again in a moment.',
            allowedMentions: {
                repliedUser: false
            }
        }).catch(() => {});
    }
});

setupWelcome(client, config);
setupBanLog(client, config);
client.login(token);
