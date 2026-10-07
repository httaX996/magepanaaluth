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
    if (!msg) return null;
    if (msg.templateButtonReplyMessage?.selectedId) return msg.templateButtonReplyMessage.selectedId;
    if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId;
    if (msg.interactiveResponseMessage) {
        const nf = msg.interactiveResponseMessage.nativeFlowResponseMessage;
        if (nf?.paramsJson) {
            try { const p = JSON.parse(nf.paramsJson); if (p.id) return p.id; } catch {}
        }
        return msg.interactiveResponseMessage.buttonId || null;
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
    pattern: "cineck",
    alias: ["cinesubz", "cine"],
    desc: "Search movies from CineSubz with Premium Native Flow Buttons",
    category: "movie",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    // Helper Reaction Function
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
            return reply("⚠️️ *Please provide a movie name to search!*\n\n💡 *Example:* `.cineck deadpool`");
        }

        await sendReact("🎬");

        const dateNow = Date.now();
        const searchUrl = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.success || !data.results || !data.results.length) {
            await sendReact("❌");
            return reply("❌ *Oops! No movies found matching your query.* 🔍");
        }

        const moviesSlice = data.results.slice(0, 50);
        
        // Single list section
        const movieRows = moviesSlice.map((movie, index) => ({
            header: `🎬 Result #${index + 1}`,
            title: `🎥 ${movie.title.substring(0, 45)}`,
            description: `✨ Tap to view details & downloads`,
            id: `cine_dl_${index}_${dateNow}`
        }));

        // Send Search Results using native flow button format
        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `✨ 𝗖𝗜𝗡𝗘𝗦𝗨𝗕𝗭 𝗠𝗢𝗩𝗜𝗘 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${moviesSlice.length} Movies\`\n\n⚡ *Please select your desired movie from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select Movie',
            optionTitle: '📂 CineSubz Search Results',
            offerText: '🏷️ 𝗖𝗶𝗻𝗲𝗦𝘂𝗯𝘇',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://cinesubz.co',
            offerExpiration: Date.now() + 600000, // 10 minutes
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
                if (!msg || !msg.message) return;

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`) || !selectedButtonId.startsWith("cine_dl_")) return;
                if (msg.key?.remoteJid !== from) return;

                const movieIndex = parseInt(selectedButtonId.split("_")[2]);
                const selectedMovie = moviesSlice[movieIndex];

                await sendReact("⏳");

                const infoUrl = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/minfo?url=${encodeURIComponent(selectedMovie.link)}`;
                const infoResponse = await axios.get(infoUrl);

                if (!infoResponse.data.success) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch cinematic details for this movie.* ⚠️");
                }

                const movie = infoResponse.data.data;

                let caption = `🌟 \`${movie.title}\`\n\n`;
                caption += `📅 \`YEAR:\` *${movie.year || "N/A"}*\n`;
                caption += `⭐ \`IMDB:\` *${movie.imdb || "N/A"} / 10*\n`;
                caption += `⏳ \`TIME:\` *${movie.time || "N/A"}*\n`;
                caption += `🌍 \`COUNTRY:\` *${movie.country || "N/A"}*\n`;
                caption += `🎭 \`CAST:\` ${movie.cast?.slice(0, 4).map(c => `*${c}*`).join(', ') || "N/A"}\n\n`;
                caption += `📝 \`STORY:\` _${movie.description?.slice(0, 160)}..._\n\n`;
                caption += `⚡ *Please select your quality to download:*\n`;

                const dlDateNow = Date.now();

                const qualityRows = movie.downloads.map((dl, i) => ({
                    header: `📥 Quality: ${dl.quality}`,
                    title: `🚀 [${dl.quality}]`,
                    description: `💾 File Size: ${dl.size || "Unknown"}`,
                    id: `cine_link_${movieIndex}_${i}_${dlDateNow}`
                }));

                activeQualitySessions.set(dlDateNow, { movie, downloads: movie.downloads });

                // Movie Details Message
                await conn.sendMessage(from, {
                    image: { url: movie.poster || selectedMovie.image },
                    caption: caption,
                    footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                    optionText: '👉🏻 Select Quality',
                    optionTitle: '🎯 Select Resolution',
                    offerText: '🏷️ 𝗖𝗶𝗻𝗲𝗦𝘂𝗯𝘇',
                    offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                    offerUrl: 'https://cinesubz.co',
                    offerExpiration: Date.now() + 600000,
                    nativeFlow: [{
                        text: '📋 Select Quality',
                        sections: [{
                            title: '⚡ Available Resolutions',
                            rows: qualityRows
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

        // 2. Quality Selection Listener
        const qualityListener = async (update2) => {
            try {
                const msg2 = update2.messages[0];
                if (!msg2 || !msg2.message) return;

                const selectedQualityId = extractButtonId(msg2.message);
                if (!selectedQualityId || !selectedQualityId.startsWith("cine_link_")) return;
                if (msg2.key?.remoteJid !== from) return;

                const parts = selectedQualityId.split("_");
                const dlTimestamp = parseInt(parts[4]);

                if (!activeQualitySessions.has(dlTimestamp)) return;
                const session = activeQualitySessions.get(dlTimestamp);

                const qIndex = parseInt(parts[3]);
                const finalQuality = session.downloads[qIndex];

                await sendReact("⬇️");

                const dlUrl = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/dl?url=${encodeURIComponent(finalQuality.download_link)}`;
                const dlResponse = await axios.get(dlUrl);

                if (!dlResponse.data.status || !dlResponse.data.direct_link) {
                    await sendReact("❌");
                    return reply("❌ *Failed to extract direct download link from API response.* ⚠️");
                }

                const directLink = dlResponse.data.direct_link;

                await sendReact("⬆️");
                const thumb = await createThumbnail(session.movie.poster);

                const fileNameTitle = dlResponse.data?.title || session.movie?.title || "Movie";
                const fileNameQuality = dlResponse.data?.quality || finalQuality?.quality || "NOT FOUND";

                await conn.sendMessage(from, {
                    document: { url: directLink },
                    mimetype: "video/mp4",
                    fileName: `${fileNameTitle} [${fileNameQuality}].mp4`,
                    jpegThumbnail: thumb,
                    caption: `🎬 \`${session.movie.title}\`\n\n🎞️ \`Resolution:\` *${dlResponse.data.quality || finalQuality.quality}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
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
        reply(`❌ *System Error:* \`${err.message || err}\``);
    }
});
