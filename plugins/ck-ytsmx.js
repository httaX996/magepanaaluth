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
    pattern: "ytsmx",
    alias: ["yts", "ytsmovie"],
    desc: "Search movies from YTS.MX with Premium Native Flow Buttons",
    category: "movie",
    react: "🍿",
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
            return reply("🍿 *Please provide a movie name to search on YTS!*\n\n💡 *Example:* `.ytsmx avatar`");
        }

        await sendReact("🍿");

        const dateNow = Date.now();
        // 1. YTS Search API
        const searchUrl = `https://ck-yts-mx-api-123abc456def.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.status || !data.data || !data.data.length) {
            await sendReact("❌");
            return reply("❌ *No movies found on YTS.* 🔍");
        }

        const moviesSlice = data.data.slice(0, 50);
        
        // Native Flow list rows සකස් කිරීම
        const movieRows = moviesSlice.map((movie, index) => ({
            header: `🎬 Result #${index + 1}`,
            title: `🍿 ${movie.title.substring(0, 45)}`,
            description: `📅 Year: ${movie.year} \vert{} ⭐ Rating: ${movie.rating}`,
            id: `yts_dl_${index}_${dateNow}`
        }));

        // Send Search Results using native flow button format
        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `🍿 𝗖𝗞 𝗬𝗧𝗦.𝗠𝗫 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${moviesSlice.length} Movies\`\n\n⚡ *Please select your desired movie from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select YTS Movie',
            optionTitle: '📂 YTS Movie Search Results',
            offerText: '🏷️ 𝗬𝗧𝗦.𝗠𝗫',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://yts.mx',
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

        // 2. Movie Selection Listener
        const movieSelectionListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`) || !selectedButtonId.startsWith("yts_dl_")) return;
                if (msg.key?.remoteJid !== from) return;

                const movieIndex = parseInt(selectedButtonId.split("_")[2]);
                const selectedMovie = moviesSlice[movieIndex];

                await sendReact("⏳");

                // YTS Info API
                const infoUrl = `https://ck-yts-mx-api-123abc456def.vercel.app/api/info?url=${encodeURIComponent(selectedMovie.url)}`;
                const infoResponse = await axios.get(infoUrl);

                if (!infoResponse.data.status) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch movie details from YTS.* ⚠️");
                }

                const movie = infoResponse.data.result;

                let caption = `🎬 \`${movie.title}\`\n\n`;
                caption += `📅 \`YEAR:\` *${movie.year || "N/A"}*\n`;
                caption += `🎭 \`GENRE:\` *${movie.genre || "N/A"}*\n`;
                caption += `⭐ \`IMDB:\` *${movie.imdb || "N/A"}*\n`;
                caption += `📝 \`PLOT:\` _${movie.plot?.slice(0, 180)}..._\n\n`;
                caption += `⚡ *Please select your quality to download:*\n`;

                const dlDateNow = Date.now();

                const qualityRows = movie.downloads.map((dl, i) => ({
                    header: `🎥 ${dl.quality} -${dl.type}`,
                    title: `🚀 [${dl.quality} (${dl.type})]`,
                    description: `💾 Size: ${dl.size}`,
                    id: `yts_link_${movieIndex}_${i}_${dlDateNow}`
                }));

                activeQualitySessions.set(dlDateNow, { movie, downloads: movie.downloads });

                // Movie Details & Quality Menu Message
                await conn.sendMessage(from, {
                    image: { url: movie.image },
                    caption: caption,
                    footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                    optionText: '👉🏻 Select Video Quality',
                    optionTitle: '🎯 Select Resolution & Quality',
                    offerText: '🏷️ 𝗬𝗧𝗦.𝗠𝗫',
                    offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                    offerUrl: 'https://yts.mx',
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

        // 3. Quality & Download Listener
        const qualityListener = async (update2) => {
            try {
                const msg2 = update2.messages[0];
                if (!msg2 || !msg2.message) return;

                const selectedQualityId = extractButtonId(msg2.message);
                if (!selectedQualityId || !selectedQualityId.startsWith("yts_link_")) return;
                if (msg2.key?.remoteJid !== from) return;

                const parts = selectedQualityId.split("_");
                const dlTimestamp = parseInt(parts[4]);

                if (!activeQualitySessions.has(dlTimestamp)) return;
                const session = activeQualitySessions.get(dlTimestamp);

                const qIndex = parseInt(parts[3]);
                const finalQuality = session.downloads[qIndex];

                await sendReact("⏳");
                await reply("⏳ *Generating direct link... This may take a few seconds, please wait!*");

                // Magnet Convert API
                const magnetApiUrl = `https://ck-pahe-inc-api-123xyz.vercel.app/api/magnet?url=${encodeURIComponent(finalQuality.url)}`;
                
                let magnetResponse;
                try {
                    magnetResponse = await axios.get(magnetApiUrl, { timeout: 120000 });
                } catch (apiErr) {
                    await sendReact("❌");
                    return reply("❌ *The server took too long to generate the link or encountered an error. Please try again later.*");
                }

                if (!magnetResponse.data.success || !magnetResponse.data.download_url) {
                    await sendReact("❌");
                    return reply("❌ *Direct download link could not be generated from magnet.* ⚠️");
                }

                const directLink = magnetResponse.data.download_url;

                await sendReact("⬆️");
                const thumb = await createThumbnail(session.movie.image);

                // File caption with quality & type
                const fileCaption = `🎬 \`${session.movie.title}\`\n\n🎞️ \`Quality:\` *${finalQuality.quality} -${finalQuality.type}*\n💾 \`Size:\` *${finalQuality.size}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`;

                await conn.sendMessage(from, {
                    document: { url: directLink },
                    mimetype: "video/mp4",
                    fileName: `${magnetResponse.data.title || session.movie.title + ' ' + finalQuality.quality}.mp4`,
                    jpegThumbnail: thumb,
                    caption: fileCaption
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
