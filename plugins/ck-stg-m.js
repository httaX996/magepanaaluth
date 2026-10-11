const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

// Custom Quoted Context (ck object)
const ck = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "〴ᴄʜᴇᴛʜᴍɪɴᴀ ×͜×",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
        }
    }
};

// Interactive Message එකෙන් Button/Row ID එක ලබා ගැනීමේ ශ්‍රිතය
function extractButtonId(msg) {
    if (!msg) {
        return null;
    }
    if (msg.templateButtonReplyMessage?.selectedId) {
        return msg.templateButtonReplyMessage.selectedId;
    }
    if (msg.buttonsResponseMessage?.selectedButtonId) {
        return msg.buttonsResponseMessage.selectedButtonId;
    }
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
    }
    if (msg.interactiveResponseMessage) {
        const nf = msg.interactiveResponseMessage.nativeFlowResponseMessage;
        if (nf?.paramsJson) {
            try {
                const p = JSON.parse(nf.paramsJson);
                if (p.id) {
                    return p.id;
                }
            } catch (e) {}
        }
        if (msg.interactiveResponseMessage.buttonId) {
            return msg.interactiveResponseMessage.buttonId;
        }
    }
    return null;
}

// Poster එකෙන් Thumbnail සාදා ගැනීමේ ශ්‍රිතය
async function createThumbnail(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return await sharp(response.data)
            .resize(300, 300)
            .jpeg({ quality: 80 })
            .toBuffer();
    } catch (e) {
        console.log('🖼️ Thumbnail Generation Error:', e);
        return null;
    }
}

cmd({
    pattern: "stgm",
    alias: ["stagatv", "stg"],
    desc: "Search movies from StagaTV with Native Flow Buttons",
    category: "movie",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    const sendReact = async (emoji) => {
        try {
            await conn.sendMessage(from, {
                react: {
                    key: mek.key,
                    text: emoji
                }
            });
        } catch (e) {
            console.error("Reaction Error:", e);
        }
    };

    try {
        if (!q) {
            await sendReact("❌");
            return reply("⚠ *Please provide a movie name to search!*\n\n💡 *Example:* `.stgm house of the dragon`");
        }

        await sendReact("🎬");

        const dateNow = Date.now();
        const searchUrl = `https://ck-stagatv-api-alutheka.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.success) {
            await sendReact("❌");
            return reply("❌ *Oops! No movies found matching your query.* 🔍");
        }
        if (!data.results) {
            await sendReact("❌");
            return reply("❌ *Oops! No movies found matching your query.* 🔍");
        }
        if (data.results.length === 0) {
            await sendReact("❌");
            return reply("❌ *Oops! No movies found matching your query.* 🔍");
        }

        const moviesSlice = data.results.slice(0, 50);
        
        const movieRows = moviesSlice.map((movie, index) => ({
            header: `🎬 Result #${index + 1}`,
            title: `🎥 ${movie.title.substring(0, 45)}`,
            description: `✨ Year: ${movie.year ? movie.year : "N/A"} • Time: ${movie.time ? movie.time : "N/A"}`,
            id: `stg_dl_${index}_${dateNow}`
        }));

        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `✨ 𝗦𝗧𝗔𝗚𝗔𝗧𝗩 𝗠𝗢𝗩𝗜𝗘 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${moviesSlice.length} Movies\`\n\n⚡ *Please select your desired movie from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select Movie',
            optionTitle: '📂 StagaTV Search Results',
            offerText: '🏷️ 𝗦𝘁𝗮𝗴𝗮𝗧𝗩',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://www9.stagatv.com',
            offerExpiration: Date.now() + 600000,
            nativeFlow: [{
                text: '📋 Select Movie',
                sections: [{
                    title: '🌟 Available Movies',
                    rows: movieRows
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        const activeQualitySessions = new Map();

        // 1. Movie Selection Listener
        const movieSelectionListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg) {
                    return;
                }
                if (!msg.message) {
                    return;
                }

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId) {
                    return;
                }
                if (!selectedButtonId.includes(`_${dateNow}`)) {
                    return;
                }
                if (!selectedButtonId.startsWith("stg_dl_")) {
                    return;
                }
                if (msg.key?.remoteJid !== from) {
                    return;
                }

                const movieIndex = parseInt(selectedButtonId.split("_")[2]);
                const selectedMovie = moviesSlice[movieIndex];

                await sendReact("⏳");

                const infoUrl = `https://ck-stagatv-api-alutheka.vercel.app/api/minfo?url=${encodeURIComponent(selectedMovie.link)}`;
                const infoResponse = await axios.get(infoUrl);

                if (!infoResponse.data.status) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch cinematic details for this movie.* ⚠️");
                }

                const movie = infoResponse.data.result;

                let caption = `🌟 \`${movie.title}\`\n\n`;
                caption += `⭐ \`RATING:\` *${movie.rating ? movie.rating : "N/A"}*\n`;
                caption += `🎭 \`GENRES:\` *${movie.genres ? movie.genres.join(', ') : "N/A"}*\n`;
                caption += `📅 \`RELEASE:\` *${movie.details?.release ? movie.details.release : "N/A"}*\n`;
                caption += `⏳ \`DURATION:\` *${movie.details?.duration ? movie.details.duration : "N/A"}*\n`;
                caption += `🎬 \`DIRECTOR:\` *${movie.details?.director ? movie.details.director : "N/A"}*\n`;
                caption += `⭐ \`STARS:\` *${movie.details?.stars ? movie.details.stars : "N/A"}*\n\n`;
                caption += `📝 \`STORY:\` _${movie.synopsis ? movie.synopsis.slice(0, 160) : "N/A"}..._\n\n`;
                caption += `⚡ *Please select your server to download:*\n`;

                const dlDateNow = Date.now();

                const serverRows = movie.downloads.map((dl, i) => ({
                    header: `📥 Server: ${dl.name}`,
                    title: `🚀 [${dl.name}]`,
                    description: `💾 Tap to download from ${dl.name}`,
                    id: `stg_link_${movieIndex}_${i}_${dlDateNow}`
                }));

                activeQualitySessions.set(dlDateNow, { movie, downloads: movie.downloads });

                await conn.sendMessage(from, {
                    image: { url: movie.poster ? movie.poster : config.IMG_URL },
                    caption: caption,
                    footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                    optionText: '👉🏻 Select Server',
                    optionTitle: '🎯 Select Download Server',
                    offerText: '🏷️ 𝗦𝘁𝗮𝗴𝗮𝗧𝗩',
                    offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                    offerUrl: 'https://www9.stagatv.com',
                    offerExpiration: Date.now() + 600000,
                    nativeFlow: [{
                        text: '📋 Select Server',
                        sections: [{
                            title: '⚡ Available Servers',
                            rows: serverRows
                        }],
                        icon: 'default'
                    }],
                    interactiveAsTemplate: false
                }, { quoted: ck });

                await sendReact("✅");

            } catch (err) {
                console.error(err);
                await sendReact("❌");
            }
        };

        // 2. Server Selection & Download Listener
        const qualityListener = async (update2) => {
            try {
                const msg2 = update2.messages[0];
                if (!msg2) {
                    return;
                }
                if (!msg2.message) {
                    return;
                }

                const selectedQualityId = extractButtonId(msg2.message);
                if (!selectedQualityId) {
                    return;
                }
                if (!selectedQualityId.startsWith("stg_link_")) {
                    return;
                }
                if (msg2.key?.remoteJid !== from) {
                    return;
                }

                const parts = selectedQualityId.split("_");
                const dlTimestamp = parseInt(parts[4]);

                if (!activeQualitySessions.has(dlTimestamp)) {
                    return;
                }
                const session = activeQualitySessions.get(dlTimestamp);

                const qIndex = parseInt(parts[3]);
                const finalQuality = session.downloads[qIndex];

                await sendReact("⬇️");

                let targetDlUrl = finalQuality.link;
                const isServerB = finalQuality.name.toLowerCase().includes('server b') || finalQuality.link.includes('pages.stagatv.com');

                if (isServerB) {
                    const dl2Url = `https://ck-stagatv-api-alutheka.vercel.app/api/dl2?url=${encodeURIComponent(finalQuality.link)}`;
                    const dl2Response = await axios.get(dl2Url);
                    
                    if (!dl2Response.data.status) {
                        await sendReact("❌");
                        return reply("❌ *Failed to extract link from DL2 API response.* ⚠️");
                    }
                    if (!dl2Response.data.result) {
                        await sendReact("❌");
                        return reply("❌ *Failed to extract link from DL2 API response.* ⚠️");
                    }
                    targetDlUrl = dl2Response.data.result;
                }

                const dlUrl = `https://ck-stagatv-api-alutheka.vercel.app/api/dl?url=${encodeURIComponent(targetDlUrl)}`;
                const dlResponse = await axios.get(dlUrl);

                if (!dlResponse.data.download) {
                    await sendReact("❌");
                    return reply("❌ *Failed to extract direct download link from DL API response.* ⚠️");
                }

                const directLink = dlResponse.data.download;

                await sendReact("⬆️");
                const thumb = await createThumbnail(session.movie.poster);

                const fileNameTitle = dlResponse.data?.title ? dlResponse.data.title : (session.movie?.title ? session.movie.title : "Movie");
                const fileType = dlResponse.data?.type ? dlResponse.data.type : "mp4";
                const fileSize = dlResponse.data?.size ? dlResponse.data.size : "Unknown";

                const mimetype = fileType === 'mkv' ? 'video/x-matroska' : 'video/mp4';

                await conn.sendMessage(from, {
                    document: { url: directLink },
                    mimetype: mimetype,
                    fileName: `${fileNameTitle}.${fileType}`,
                    jpegThumbnail: thumb,
                    caption: `🎬 \`${session.movie.title}\`\n\n🎞️ \`Size:\` *${fileSize}*\n🎞️ \`Type:\` *${fileType.toUpperCase()}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                }, { quoted: ck });

                await sendReact("✅");

            } catch (err) {
                console.error(err);
                await sendReact("❌");
            }
        };

        conn.ev.on("messages.upsert", movieSelectionListener);
        conn.ev.on("messages.upsert", qualityListener);

        // Clean up listeners after 10 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", movieSelectionListener);
            conn.ev.off("messages.upsert", qualityListener);
            activeQualitySessions.clear();
        }, 600000);

    } catch (err) {
        console.error(err);
        await conn.sendMessage(from, { react: { key: mek.key, text: "❌" } });
        reply(`❌ *System Error:* \`${err.message ? err.message : err}\``);
    }
});
