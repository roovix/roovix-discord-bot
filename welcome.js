
const {
    AttachmentBuilder,
    EmbedBuilder
} = require('discord.js');

const Canvas = require('@napi-rs/canvas');

async function createWelcomeCard(member) {
    const canvas = Canvas.createCanvas(1000, 360);
    const ctx = canvas.getContext('2d');

    // Dark Roovix-inspired background
    const gradient = ctx.createLinearGradient(0, 0, 1000, 360);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(0.55, '#161b22');
    gradient.addColorStop(1, '#172554');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 360);

    // Decorative cyan and purple circles
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(920, 40, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(80, 350, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 996, 356);

    // Load member avatar
    const avatarURL = member.user.displayAvatarURL({
        extension: 'png',
        size: 256
    });

    const avatar = await Canvas.loadImage(avatarURL);

    // Avatar border
    ctx.beginPath();
    ctx.arc(190, 180, 87, 0, Math.PI * 2);
    ctx.fillStyle = '#58a6ff';
    ctx.fill();

    // Circular avatar crop
    ctx.save();
    ctx.beginPath();
    ctx.arc(190, 180, 78, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 112, 102, 156, 156);
    ctx.restore();

    // Text helper
    function drawText(text, x, y, size, color, font = '600') {
        ctx.font = `${font} ${size}px Arial`;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    drawText('WELCOME TO', 340, 100, 24, '#8b949e');
    drawText('ROOVIX', 335, 165, 66, '#58a6ff', '800');

    const username = member.user.username;
    ctx.font = '600 30px Arial';

    let displayName = username;
    while (
        ctx.measureText(displayName).width > 570 &&
        displayName.length > 3
    ) {
        displayName = displayName.slice(0, -4) + '...';
    }

    drawText(`Hey, ${displayName}!`, 340, 220, 30, '#ffffff');

    drawText(
        `You're member #${member.guild.memberCount}`,
        340, 270, 21, '#c9d1d9'
    );

    drawText(
        'RESEARCH  •  TECHNOLOGY  •  INNOVATION',
        340, 320, 15, '#8b949e'
    );

    return new AttachmentBuilder(
        await canvas.encode('png'),
        { name: 'roovix-welcome.png' }
    );
}

function setupWelcome(client, config) {
    client.on('guildMemberAdd', async (member) => {
        // Only welcome members in the configured server/channel
        const channel = await client.channels.fetch(
            config.welcomeChannelId
        ).catch(() => null);

        if (!channel || !channel.isTextBased()) {
            console.error('Roovix welcome channel is unavailable.');
            return;
        }

        try {
            const card = await createWelcomeCard(member);

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#58a6ff')
                .setTitle('Welcome to Roovix!')
                .setDescription(
                    `Hey ${member}, welcome to **${member.guild.name}**! ` +
                    'Make yourself at home and enjoy the community.'
                )
                .setImage('attachment://roovix-welcome.png')
                .setThumbnail(
                    member.user.displayAvatarURL({ size: 128 })
                )
                .setFooter({
                    text: `Member #${member.guild.memberCount} • Roovix`
                })
                .setTimestamp();

            const embeds = [welcomeEmbed];

            // Optional animated GIF banner
            if (config.welcomeGifUrl) {
                embeds.push(
                    new EmbedBuilder()
                        .setColor('#58a6ff')
                        .setImage(config.welcomeGifUrl)
                );
            }

            await channel.send({
                content: `Welcome ${member}! 🎉`,
                embeds,
                files: [card],
                allowedMentions: {
                    users: [member.id]
                }
            });

            console.log(`Welcomed ${member.user.tag}`);
        } catch (error) {
            console.error('Welcome system error:', error);
        }
    });
}

module.exports = { setupWelcome };
