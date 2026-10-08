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
    pattern: "thenkiri",
    alias: ["then", "tkri"],
    desc: "Search movies & TV series from Thenkiri with Premium Native Flow Buttons",
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
            return reply("⚠️ *Please provide a movie or series name to search!*\n\n💡 *Example:* `.thenkiri business proposal`");
        }

        await sendReact("🎬");

        const dateNow = Date.now();
        const searchUrl = `https://ck-thenkiri-api-2468.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.status || !data.results || !data.results.length) {
            await sendReact("❌");
            return reply("❌ *Oops! No results found matching your query on Thenkiri.* 🔍");
        }

        const resultsSlice = data.results.slice(0, 50);
        
        // Single list section
        const buttonRows = resultsSlice.map((item, index) => ({
            header: `🎬 Result #${index + 1}`,
            title: `🎥 ${item.title.substring(0, 45)}`,
            description: `✨ Tap here to view episodes & downloads`,
            id: `tkri_sel_${index}_${dateNow}`
        }));

        // Send Search Results using native flow button format
        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `✨ 𝗧𝗛𝗘𝗡𝗞𝗜𝗥𝗜 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${resultsSlice.length} Results\`\n\n⚡ *Please select your desired item from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select Title',
            optionTitle: '📂 Thenkiri Search Results',
            offerText: '🏷️ 𝗧𝗵𝗲𝗻𝗸𝗶𝗿𝗶',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://thenkiri.com',
            offerExpiration: Date.now() + 600000, // 10 minutes
            nativeFlow: [{
                text: '📋 Select Title',
                sections: [{
                    title: '🌟 Available Titles',
                    rows: buttonRows
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        const activeEpisodeSessions = new Map();

        // 1. Title Selection Listener (Search Result -> Info API)
        const titleSelectionListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`) || !selectedButtonId.startsWith("tkri_sel_")) return;
                if (msg.key?.remoteJid !== from) return;

                const itemIndex = parseInt(selectedButtonId.split("_")[2]);
                const selectedItem = resultsSlice[itemIndex];

                await sendReact("⏳");

                const infoUrl = `https://ck-thenkiri-api-2468.vercel.app/api/info?url=${encodeURIComponent(selectedItem.url)}`;
                const infoResponse = await axios.get(infoUrl);

                if (!infoResponse.data.success || !infoResponse.data.data) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch details for this title from Thenkiri.* ⚠️");
                }

                const mediaData = infoResponse.data.data;

                let caption = `🌟 \`${mediaData.title}\`\n\n`;
                if (mediaData.synopsis) {
                    caption += `📝 \`SYNOPSIS:\` _${mediaData.synopsis.slice(0, 160)}..._\n\n`;
                }
                caption += `⚡ *Please select an episode or file to download:*\n`;

                // Collect all episodes/downloads across seasons
                let allEpisodes = [];
                if (mediaData.seasons && mediaData.seasons.length > 0) {
                    mediaData.seasons.forEach((season) => {
                        if (season.episodes && season.episodes.length > 0) {
                            season.episodes.forEach((ep) => {
                                allEpisodes.push({
                                    name: `${season.season} -${ep.name}`,
                                    url: ep.url
                                });
                            });
                        }
                    });
                }

                if (allEpisodes.length === 0) {
                    await sendReact("❌");
                    return reply("❌ *No download links or episodes available for this item.* ⚠️");
                }

                const epDateNow = Date.now();

                const episodeButtonRows = allEpisodes.map((ep, i) => ({
                    header: `📥 ${ep.name}`,
                    title: `🚀 [${ep.name.substring(0, 35)}]`,
                    description: `💾 Tap to download file`,
                    id: `tkri_ep_${itemIndex}_${i}_${epDateNow}`
                }));

                activeEpisodeSessions.set(epDateNow, { mediaData, episodes: allEpisodes });

                // Media Details and Episode Menu Message
                await conn.sendMessage(from, {
                    image: { url: mediaData.posterImage || selectedItem.image },
                    caption: caption,
                    footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                    optionText: '👉🏻 Select Episode',
                    optionTitle: '🎯 Select Resolution / Episode',
                    offerText: '🏷️ 𝗧𝗵𝗲𝗻𝗸𝗶𝗿𝗶',
                    offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                    offerUrl: 'https://thenkiri.com',
                    offerExpiration: Date.now() + 600000,
                    nativeFlow: [{
                        text: '📋 Select Episode',
                        sections: [{
                            title: '⚡ Available Episodes / Files',
                            rows: episodeButtonRows
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

        // 2. Episode Selection & Downloadwella DL Resolver Listener
        const episodeListener = async (update2) => {
            try {
                const msg2 = update2.messages[0];
                if (!msg2 || !msg2.message) return;

                const selectedEpId = extractButtonId(msg2.message);
                if (!selectedEpId || !selectedEpId.startsWith("tkri_ep_")) return;
                if (msg2.key?.remoteJid !== from) return;

                const parts = selectedEpId.split("_");
                const epTimestamp = parseInt(parts[4]);

                if (!activeEpisodeSessions.has(epTimestamp)) return;
                const session = activeEpisodeSessions.get(epTimestamp);

                const epIndex = parseInt(parts[3]);
                const selectedEpisode = session.episodes[epIndex];

                await sendReact("⬇️");

                let finalDownloadUrl = selectedEpisode.url;

                // Check if the URL starts with downloadwella or needs downloadwella API resolution
                if (finalDownloadUrl.includes("downloadwella.com")) {
                    const dlApiUrl = `https://ck-thenkiri-api-2468.vercel.app/api/dl?url=${encodeURIComponent(finalDownloadUrl)}`;
                    const dlResponse = await axios.get(dlApiUrl);

                    if (!dlResponse.data.status || !dlResponse.data.download_url) {
                        await sendReact("❌");
                        return reply("❌ *Failed to extract direct download link from Downloadwella API.* ⚠️");
                    }
                    finalDownloadUrl = dlResponse.data.download_url;
                }

                await sendReact("⬆️");
                const thumb = await createThumbnail(session.mediaData.posterImage);

                // Dynamic Mimetype and Extension Handling for MKV/MP4 files
                let mime = "video/mp4";
                let fileExtension = "mp4";

                if (finalDownloadUrl.toLowerCase().includes(".mkv")) {
                    mime = "video/x-matroska";
                    fileExtension = "mkv";
                }

                const fileNameFinal = `${session.mediaData.title} - ${selectedEpisode.name} [THENKIRI].${fileExtension}`;

                await conn.sendMessage(from, {
                    document: { url: finalDownloadUrl },
                    mimetype: mime,
                    fileName: fileNameFinal,
                    jpegThumbnail: thumb,
                    caption: `🎬 \`${session.mediaData.title}\`\n\n🎞️ \`File:\` *${selectedEpisode.name}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                }, { quoted: ck });

                await sendReact("✅");

            } catch (err) {
                console.error(err);
                await sendReact("❌");
            }
        };

        conn.ev.on("messages.upsert", titleSelectionListener);
        conn.ev.on("messages.upsert", episodeListener);

        // Clean up listeners after 10 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", titleSelectionListener);
            conn.ev.off("messages.upsert", episodeListener);
            activeEpisodeSessions.clear();
        }, 600000);

    } catch (err) {
        console.error(err);
        await conn.sendMessage(from, { react: { key: mek.key, text: "❌" } });
        reply(`❌ *System Error:* \`${err.message || err}\``);
    }
});
