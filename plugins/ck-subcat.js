const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');

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

cmd({
    pattern: "subcat",
    alias: ["subtitlecat", "subcatdl"],
    desc: "Search subtitles from SubtitleCat with Native Flow Buttons",
    category: "download",
    react: "📝",
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
            return reply("⚠ *Please provide a title to search subtitles!*\n\n💡 *Example:* `.subcat business proposal`");
        }

        await sendReact("🔍");

        const dateNow = Date.now();
        const searchUrl = `https://ck-subtitlecat-api.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data || !data.results || !data.results.length) {
            await sendReact("❌");
            return reply("❌ *Oops! No subtitles found matching your query.* 🔍");
        }

        // WhatsApp Native Flow List එකක දැක්විය හැකි උපරිම ප්‍රතිඵල ප්‍රමාණය ලබා ගනී (Slice 0-50 or all)
        const allResults = data.results;
        const resultsSlice = allResults.slice(0, 100);

        // Subtitle rows නිර්මාණය කිරීම
        const subRows = resultsSlice.map((sub, index) => ({
            header: `📝 Subtitle #${index + 1}`,
            title: `📄 ${sub.title.substring(0, 45)}`,
            description: `💾 Size: ${sub.size || "Unknown"} | Click to download`,
            id: `subcat_dl_${index}_${dateNow}`
        }));

        // Search Message එක යැවීම
        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `✨ 𝗦𝗨𝗕𝗧𝗜𝗧𝗟𝗘𝗖𝗔𝗧 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${data.total_found || allResults.length} Subtitles\`\n\n⚡ *Please select your desired subtitle from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select Subtitle',
            optionTitle: '📂 SubtitleCat Results',
            offerText: '🏷️ 𝗦𝘂𝗯𝘁𝗶𝘁𝗹𝗲𝗖𝗮𝘁',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://subtitlecat.com',
            offerExpiration: Date.now() + 600000, // 10 minutes
            nativeFlow: [{
                text: '📋 Select Subtitle',
                sections: [{
                    title: '🌟 Available Subtitles',
                    rows: subRows
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        // Subtitle Selection Listener
        const subSelectionListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`) || !selectedButtonId.startsWith("subcat_dl_")) return;
                if (msg.key?.remoteJid !== from) return;

                const subIndex = parseInt(selectedButtonId.split("_")[2]);
                const selectedSub = resultsSlice[subIndex];

                await sendReact("⏳");

                // Info API එකට Call කර download_link එක ලබා ගැනීම
                const infoUrl = `https://ck-subtitlecat-api.vercel.app/api/info?url=${encodeURIComponent(selectedSub.url)}`;
                const infoResponse = await axios.get(infoUrl);

                if (!infoResponse.data || !infoResponse.data.download_link) {
                    await sendReact("❌");
                    return reply("❌ *Failed to fetch download link for this subtitle.* ⚠️");
                }

                const downloadLink = infoResponse.data.download_link;
                const subTitle = selectedSub.title || "Subtitle";

                await sendReact("⬆️");

                // SRT File එක Document එකක් ලෙස යැවීම
                await conn.sendMessage(from, {
                    document: { url: downloadLink },
                    mimetype: "application/x-subrip", // srt mimetype
                    fileName: `${subTitle}.srt`,
                    caption: `📄 \`${subTitle}\`\n\n💾 \`Size:\` *${selectedSub.size || "N/A"}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                }, { quoted: ck });

                await sendReact("✅");

            } catch (err) {
                console.error(err);
                await sendReact("❌");
            }
        };

        conn.ev.on("messages.upsert", subSelectionListener);

        // මිනිත්තු 10 කට පසු Listener එක ඉවත් කිරීම
        setTimeout(() => {
            conn.ev.off("messages.upsert", subSelectionListener);
        }, 600000);

    } catch (err) {
        console.error(err);
        await conn.sendMessage(from, { react: { key: mek.key, text: "❌" } });
        reply(`❌ *System Error:* \`${err.message || err}\``);
    }
});
