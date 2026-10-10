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
    pattern: "stgtv",
    alias: ["tvsearch", "stagatv"],
    desc: "Search and download TV Series from StagaTV with Native Flow Buttons",
    category: "movie",
    react: "📺",
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
            return reply("⚠ *Please provide a TV series name to search!*\n\n💡 *Example:* `.stgtv house of the dragon`");
        }

        await sendReact("📺");

        const dateNow = Date.now();
        const searchUrl = `https://ck-stagatv-api-alutheka.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.success || !data.results || data.results.length === 0) {
            await sendReact("❌");
            return reply("❌ *Oops! No TV series found matching your query.* 🔍");
        }

        const seriesSlice = data.results.slice(0, 50);
        
        const seriesRows = seriesSlice.map((item, index) => ({
            header: `📺 Result #${index + 1}`,
            title: `🎬 ${item.title.substring(0, 45)}`,
            description: `✨ Year: ${item.year \vert{}\vert{} "N/A"} \vert{} Time: ${item.time || "N/A"}`,
            id: `stg_tv_${index}_${dateNow}`
        }));

        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `✨ 𝗦𝗧𝗔𝗚𝗔𝗧𝗩 𝗧𝗩 𝗦𝗘𝗥𝗜𝗘𝗦 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${seriesSlice.length} Results\`\n\n⚡ *Please select your desired TV series from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select TV Series',
            optionTitle: '📂 StagaTV Search Results',
            offerText: '🏷️ 𝗦𝘁𝗮𝗴𝗮𝗧𝗩',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://www9.stagatv.com',
            offerExpiration: Date.now() + 600000,
            nativeFlow: [{
                text: '📋 Select TV Series',
                sections: [{
                    title: '🌟 Available TV Series',
                    rows: seriesRows
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        const activeEpisodeSessions = new Map();

        // 1. TV Series Selection Listener
        const seriesSelectionListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) {
                    return;
                }

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`) || !selectedButtonId.startsWith("stg_tv_")) {
                    return;
                }
                if (msg.key?.remoteJid !== from) {
                    return;
                }

                const seriesIndex = parseInt(selectedButtonId.split("_")[3]);
                const selectedSeries = seriesSlice[seriesIndex];

                await sendReact("⏳");

                const infoUrl = `https://ck-stagatv-api-alutheka.vercel.app/api/tvinfo?url=${encodeURIComponent(selectedSeries.link)}`;
                const infoResponse = await axios.get(infoUrl);

                if (!infoResponse.data.status || !infoResponse.data.result) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch TV series details.* ⚠️");
                }

                const tv = infoResponse.data.result;

                let caption = `🌟 \`${tv.title}\`\n\n`;
                caption += `⭐ \`RATING:\` *${tv.rating || "N/A"}*\n`;
                caption += `🎭 \`GENRES:\` *${tv.genres ? tv.genres.join(', ') : "N/A"}*\n`;
                caption += `📅 \`RELEASE:\` *${tv.details?.release || "N/A"}*\n`;
                caption += `⏳ \`DURATION:\` *${tv.details?.duration || "N/A"}*\n`;
                caption += `🎬 \`NETWORK:\` *${tv.details?.network || "N/A"}*\n\n`;
                caption += `📝 \`STORY:\` _${tv.synopsis ? tv.synopsis.slice(0, 160) : "N/A"}..._\n\n`;
                caption += `⚡ *Please select your episode to download:*\n`;

                const epDateNow = Date.now();
                const episodes = tv.downloads || [];

                if (episodes.length === 0) {
                    await sendReact("❌");
                    return reply("❌ *No episodes found for this TV series.* ⚠️");
                }

                const episodeRows = episodes.map((ep, i) => ({
                    header: `📥 Episode ${i + 1}`,
                    title: `🎬 ${ep.name.substring(0, 45)}`,
                    description: `💾 Tap to download ${ep.name}`,
                    id: `stg_ep_${seriesIndex}_${i}_${epDateNow}`
                }));

                activeEpisodeSessions.set(epDateNow, { tv, episodes });

                await conn.sendMessage(from, {
                    image: { url: tv.poster || config.IMG_URL },
                    caption: caption,
                    footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                    optionText: '👉🏻 Select Episode',
                    optionTitle: '🎯 Select Episode',
                    offerText: '🏷️ 𝗦𝘁𝗮𝗴𝗮𝗧𝗩',
                    offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                    offerUrl: 'https://www9.stagatv.com',
                    offerExpiration: Date.now() + 900000,
                    nativeFlow: [{
                        text: '📋 Select Episode',
                        sections: [{
                            title: '⚡ Available Episodes',
                            rows: episodeRows
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

        // 2. Episode Selection & Download Listener
        const episodeSelectionListener = async (update2) => {
            try {
                const msg2 = update2.messages[0];
                if (!msg2 || !msg2.message) {
                    return;
                }

                const selectedEpId = extractButtonId(msg2.message);
                if (!selectedEpId || !selectedEpId.startsWith("stg_ep_")) {
                    return;
                }
                if (msg2.key?.remoteJid !== from) {
                    return;
                }

                const parts = selectedEpId.split("_");
                const epTimestamp = parseInt(parts[4]);

                if (!activeEpisodeSessions.has(epTimestamp)) {
                    return;
                }
                const session = activeEpisodeSessions.get(epTimestamp);

                const epIndex = parseInt(parts[3]);
                const finalEp = session.episodes[epIndex];

                await sendReact("⬇️");

                let targetDlUrl = finalEp.link;

                // Domain filtering: If link is from www9.stagatv.com, fetch via tvinfo2 api
                if (targetDlUrl.includes("www9.stagatv.com")) {
                    const tvinfo2Url = `https://ck-stagatv-api-alutheka.vercel.app/api/tvinfo2?url=${encodeURIComponent(targetDlUrl)}`;
                    const tvinfo2Response = await axios.get(tvinfo2Url);

                    if (!tvinfo2Response.data.status || !tvinfo2Response.data.result?.downloads) {
                        await sendReact("❌");
                        return reply("❌ *Failed to fetch episode download servers from TVInfo2 API.* ⚠️");
                    }

                    const serverDownloads = tvinfo2Response.data.result.downloads;
                    // Auto select Server A (or first available, fallback to Server B)
                    let selectedServer = serverDownloads.find(s => s.name.toLowerCase().includes('server a')) || serverDownloads[0];
                    
                    if (!selectedServer) {
                        await sendReact("❌");
                        return reply("❌ *No download servers found for this episode.* ⚠️");
                    }

                    targetDlUrl = selectedServer.link;
                }

                // Check if targetDlUrl is Server B or pages.stagatv.com
                const isServerB = targetDlUrl.toLowerCase().includes('server b') || targetDlUrl.includes('pages.stagatv.com');

                if (isServerB) {
                    const dl2Url = `https://ck-stagatv-api-alutheka.vercel.app/api/dl2?url=${encodeURIComponent(targetDlUrl)}`;
                    const dl2Response = await axios.get(dl2Url);
                    
                    if (!dl2Response.data.status || !dl2Response.data.result) {
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
                const thumb = await createThumbnail(session.tv.poster);

                const fileNameTitle = dlResponse.data?.title ? dlResponse.data.title : (finalEp?.name ? finalEp.name : "Episode");
                const fileType = dlResponse.data?.type ? dlResponse.data.type : "mkv";
                const fileSize = dlResponse.data?.size ? dlResponse.data.size : "Unknown";

                const mimetype = fileType === 'mkv' ? 'video/x-matroska' : 'video/mp4';

                await conn.sendMessage(from, {
                    document: { url: directLink },
                    mimetype: mimetype,
                    fileName: `${fileNameTitle}.${fileType}`,
                    jpegThumbnail: thumb,
                    caption: `🎬 \`${session.tv.title} - ${finalEp.name}\`\n\n🎞️ \`Size:\` *${fileSize}*\n🎞️ \`Type:\` *${fileType.toUpperCase()}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                }, { quoted: ck });

                await sendReact("✅");

            } catch (err) {
                console.error(err);
                await sendReact("❌");
            }
        };

        conn.ev.on("messages.upsert", seriesSelectionListener);
        conn.ev.on("messages.upsert", episodeSelectionListener);

        // Clean up listeners after 15 minutes (900000 ms)
        setTimeout(() => {
            conn.ev.off("messages.upsert", seriesSelectionListener);
            conn.ev.off("messages.upsert", episodeSelectionListener);
            activeEpisodeSessions.clear();
        }, 900000);

    } catch (err) {
        console.error(err);
        await conn.sendMessage(from, { react: { key: mek.key, text: "❌" } });
        reply(`❌ *System Error:* \`${err.message ? err.message : err}\``);
    }
});
