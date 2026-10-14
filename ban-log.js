
const {
    AuditLogEvent,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const Canvas = require('@napi-rs/canvas');

async function createBanCard(user, guild, reason) {
    const canvas = Canvas.createCanvas(1000, 360);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 1000, 360);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(0.6, '#161b22');
    gradient.addColorStop(1, '#350d16');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 360);

    // Red accent
    ctx.fillStyle = '#f85149';
    ctx.fillRect(0, 0, 8, 360);

    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 2, 988, 356);

    // Avatar
    const avatar = await Canvas.loadImage(
        user.displayAvatarURL({
            extension: 'png',
            size: 256
        })
    );

    ctx.beginPath();
    ctx.arc(180, 165, 83, 0, Math.PI * 2);
    ctx.fillStyle = '#f85149';
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(180, 165, 75, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 105, 90, 150, 150);
    ctx.restore();

    function text(value, x, y, size, color, weight = '600') {
        ctx.font = `${weight} ${size}px Arial`;
        ctx.fillStyle = color;
        ctx.fillText(value, x, y);
    }

    text('ROOVIX SECURITY', 320, 80, 20, '#8b949e');
    text('MEMBER BANNED', 320, 135, 42, '#f85149', '800');

    let username = user.username;
    ctx.font = '600 29px Arial';

    while (ctx.measureText(username).width > 620) {
        username = username.slice(0, -4) + '...';
    }

    text(username, 320, 190, 29, '#ffffff');
    text(`USER ID: ${user.id}`, 320, 232, 17, '#c9d1d9');

    const shortReason = String(reason || 'No reason provided')
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 75);

    text(`REASON: ${shortReason}`, 320, 275, 17, '#f0f6fc');
    text(new Date().toUTCString(), 320, 320, 14, '#8b949e');

    return new AttachmentBuilder(
        await canvas.encode('png'),
        { name: 'roovix-ban.png' }
    );
}

function setupBanLog(client, config) {
    client.on('guildBanAdd', async (ban) => {
        if (!config.banLogChannelId) return;

        try {
            const channel = await client.channels.fetch(
                config.banLogChannelId
            ).catch(() => null);

            if (!channel || !channel.isTextBased()) {
                console.error('Ban log channel is unavailable.');
                return;
            }

            let moderator = 'Unknown';
            let reason = ban.reason || 'No reason provided';

            // Find the relevant audit-log entry.
            try {
                const audit = await ban.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 6
                });

                const entry = audit.entries.find((item) =>
                    item.target?.id === ban.user.id &&
                    Date.now() - item.createdTimestamp < 15000
                );

                if (entry) {
                    moderator = entry.executor
                        ? entry.executor.tag
                        : 'Unknown';

                    reason = entry.reason || reason;
                }
            } catch (error) {
                console.warn(
                    'Could not read ban audit log:',
                    error.message
                );
            }

            const card = await createBanCard(
                ban.user,
                ban.guild,
                reason
            );

            const embed = new EmbedBuilder()
                .setColor('#f85149')
                .setTitle('Member Banned')
                .setDescription(
                    `A member has been banned from **${ban.guild.name}**.`
                )
                .setThumbnail(
                    ban.user.displayAvatarURL({ size: 128 })
                )
                .addFields(
                    {
                        name: 'Member',
                        value: `${ban.user.tag}\n\`${ban.user.id}\``,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: moderator,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: String(reason).slice(0, 1024),
                        inline: false
                    }
                )
                .setImage('attachment://roovix-ban.png')
                .setFooter({ text: 'Roovix Security Logs' })
                .setTimestamp();

            await channel.send({
                embeds: [embed],
                files: [card]
            });

            console.log(`Ban logged: ${ban.user.tag}`);
        } catch (error) {
            console.error('Ban log error:', error);
        }
    });
}

module.exports = { setupBanLog };
