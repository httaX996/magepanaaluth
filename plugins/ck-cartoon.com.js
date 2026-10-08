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

// Image එකෙන් Thumbnail සාදා ගැනීමේ ශ්‍රිතය
async function createThumbnail(url) {
    try {
        if (!url) return null;
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
    pattern: "cartoon",
    alias: ["cartoons"],
    desc: "Search cartoons with Premium Native Flow Buttons",
    category: "download",
    react: "🧸",
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
            return reply("🧸 *Please provide a cartoon name to search!*\n\n💡 *Example:* `.cartoon garfield`");
        }

        await sendReact("🧸");

        const dateNow = Date.now();
        const searchUrl = `https://ck-api-v1.vercel.app/movie/cartoon/search?q=${encodeURIComponent(q)}`;
        const { data: searchData } = await axios.get(searchUrl);

        const resultsList = searchData?.data || searchData?.results;

        if (!searchData || !searchData.success || !resultsList || !resultsList.length) {
            await sendReact("❌");
            return reply("❌ *Oops! No cartoons found matching your query.* 🔍");
        }

        const cartoonsSlice = resultsList.slice(0, 50);

        // Single list section for search results
        const cartoonRows = cartoonsSlice.map((cartoon, index) => ({
            header: `🎬 Result #${index + 1}`,
            title: `🧸 ${(cartoon.title || `Cartoon ${index + 1}`).substring(0, 45)}`,
            description: `✨ Tap to view details & downloads`,
            id: `cartoon_dl_${index}_${dateNow}`
        }));

        // Send Search Results using native flow button format
        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `✨ 𝗖𝗞 𝗖𝗔𝗥𝗧𝗢𝗢𝗡 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${cartoonsSlice.length} Cartoons\`\n\n⚡ *Please select your desired cartoon from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select Cartoon',
            optionTitle: '📂 Cartoon Search Results',
            offerText: '🏷️ 𝗖𝗞 𝗖𝗮𝗿𝘁𝗼𝗼𝗻𝘀',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://ck-api-v1.vercel.app',
            offerExpiration: Date.now() + 600000, // 10 minutes
            nativeFlow: [{
                text: '📋 Select Cartoon',
                sections: [{
                    title: '🌟 Available Cartoons',
                    rows: cartoonRows
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        const activeCartoonSessions = new Map();

        // 1. Cartoon Selection Listener
        const cartoonSelectionListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`) || !selectedButtonId.startsWith("cartoon_dl_")) return;
                if (msg.key?.remoteJid !== from) return;

                const cartoonIndex = parseInt(selectedButtonId.split("_")[2]);
                const selectedCartoon = cartoonsSlice[cartoonIndex];

                await sendReact("⏳");

                const infoUrl = `https://ck-api-v1.vercel.app/movie/cartoon/info?url=${encodeURIComponent(selectedCartoon.url)}`;
                const { data: infoResponse } = await axios.get(infoUrl);

                const cartoonInfo = infoResponse?.results || infoResponse?.data || infoResponse;

                if (!cartoonInfo) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch details for this cartoon.* ⚠️");
                }

                let caption = `🌟 \`${cartoonInfo.title || selectedCartoon.title || "Cartoon"}\`\n\n`;
                caption += `📅 \`YEAR:\` *${cartoonInfo.year || "N/A"}*\n`;
                caption += `⭐ \`IMDB:\` *${cartoonInfo.imdb_rating || cartoonInfo.imdb || "N/A"}*\n`;
                caption += `💿 \`QUALITY:\` *${cartoonInfo.quality || "N/A"}*\n\n`;
                caption += `⚡ *Please select your episode/file to download:*\n`;

                // Collect available download page links from cartoonInfo
                let rawLinks = [];
                if (cartoonInfo.links && cartoonInfo.links.length > 0) {
                    rawLinks = cartoonInfo.links;
                } else if (cartoonInfo.url) {
                    rawLinks = [{ name: cartoonInfo.title || "Download Link", url: cartoonInfo.url }];
                } else {
                    rawLinks = [{ name: selectedCartoon.title || "Download Link", url: selectedCartoon.url }];
                }

                const dlDateNow = Date.now();

                const linkRows = rawLinks.map((linkObj, i) => ({
                    header: `📥 Option #${i + 1}`,
                    title: `🚀 ${(linkObj.name || linkObj.title || `Option ${i + 1}`).substring(0, 45)}`,
                    description: `💾 ${cartoonInfo.quality}`,
                    id: `cartoon_link_${cartoonIndex}_${i}_${dlDateNow}`
                }));

                activeCartoonSessions.set(dlDateNow, { cartoonInfo, rawLinks });

                // Cartoon Details Message with Native Flow Link Options
                await conn.sendMessage(from, {
                    image: { url: cartoonInfo.image || selectedCartoon.image || config.IMG_URL },
                    caption: caption,
                    footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                    optionText: '👉🏻 Select Download Option',
                    optionTitle: '🎯 Select File / Episode',
                    offerText: '🏷️ 𝗖𝗞 𝗖𝗮𝗿𝘁𝗼𝗼𝗻𝘀',
                    offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                    offerUrl: 'https://ck-api-v1.vercel.app',
                    offerExpiration: Date.now() + 600000,
                    nativeFlow: [{
                        text: '📋 Select Option',
                        sections: [{
                            title: '⚡ Available Options',
                            rows: linkRows
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

        // 2. Link/Episode Selection Listener
        const linkSelectionListener = async (update2) => {
            try {
                const msg2 = update2.messages[0];
                if (!msg2 || !msg2.message) return;

                const selectedLinkId = extractButtonId(msg2.message);
                if (!selectedLinkId || !selectedLinkId.startsWith("cartoon_link_")) return;
                if (msg2.key?.remoteJid !== from) return;

                const parts = selectedLinkId.split("_");
                const dlTimestamp = parseInt(parts[4]);

                if (!activeCartoonSessions.has(dlTimestamp)) return;
                const session = activeCartoonSessions.get(dlTimestamp);

                const linkIndex = parseInt(parts[3]);
                const selectedRawLinkObj = session.rawLinks[linkIndex];
                const targetPageUrl = selectedRawLinkObj?.url || selectedRawLinkObj?.link || selectedRawLinkObj;

                if (!targetPageUrl) {
                    await sendReact("❌");
                    return reply("❌ *Selected link URL not found.* ⚠️");
                }

                await sendReact("⬇️");

                // Fetch direct link using /movie/cartoon/dl API
                const dlApiUrl = `https://ck-api-v1.vercel.app/movie/cartoon/dl?url=${encodeURIComponent(targetPageUrl)}`;
                const { data: dlResponse } = await axios.get(dlApiUrl);

                if (!dlResponse || !dlResponse.success || !dlResponse.direct_links || !dlResponse.direct_links.length) {
                    await sendReact("❌");
                    return reply("❌ *Failed to extract direct download link from API response.* ⚠️");
                }

                // Extract direct download link from direct_links array
                const directLinkObj = dlResponse.direct_links[0];
                const directDownloadUrl = directLinkObj?.link || directLinkObj?.url;

                if (!directDownloadUrl) {
                    await sendReact("❌");
                    return reply("❌ *Direct video link is empty.* ⚠️");
                }

                await sendReact("⬆️");
                const thumb = session.cartoonInfo?.image ? await createThumbnail(session.cartoonInfo.image) : null;

                // Document Title extracted from Cartoon Info / direct link response
                const docFileName = session.cartoonInfo?.title || selectedRawLinkObj?.name || directLinkObj?.name || "Cartoon";

                await conn.sendMessage(from, {
                    document: { url: directDownloadUrl },
                    mimetype: "video/mp4",
                    fileName: `${docFileName}.mp4`,
                    jpegThumbnail: thumb,
                    caption: `🎬 \`${docFileName}\`\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                }, { quoted: ck });

                await sendReact("✅");

            } catch (err) {
                console.error(err);
                await sendReact("❌");
            }
        };

        conn.ev.on("messages.upsert", cartoonSelectionListener);
        conn.ev.on("messages.upsert", linkSelectionListener);

        // Clean up listeners after 10 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", cartoonSelectionListener);
            conn.ev.off("messages.upsert", linkSelectionListener);
            activeCartoonSessions.clear();
        }, 600000);

    } catch (err) {
        console.error(err);
        await conn.sendMessage(from, { react: { key: mek.key, text: "❌" } });
        reply(`❌ *System Error:* \`${err.message || err}\``);
    }
});
