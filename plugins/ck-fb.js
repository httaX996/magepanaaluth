const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');
const getFBInfo = require("@xaviabot/fb-downloader");

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

// Interactive Message එකෙන් Button ID එක ලබා ගැනීමේ ශ්‍රිතය
function extractButtonId(msg) {
    if (!msg) return null;
    if (msg.templateButtonReplyMessage?.selectedId)
        return msg.templateButtonReplyMessage.selectedId;
    if (msg.buttonsResponseMessage?.selectedButtonId)
        return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
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
    pattern: "fb",
    alias: ["fbdl", "facebookdl", "facebook"],
    desc: "Download Facebook videos using Native Flow Buttons",
    category: "downloader",
    react: "🧩",
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

    if (!q || (!q.includes("facebook.com") && !q.includes("fb.watch"))) {
        await sendReact("❌");
        return reply("❌ *Please provide a valid Facebook video URL!*");
    }

    await sendReact("💡");

    try {
        // Fetching via @xaviabot/fb-downloader package
        const result = await getFBInfo(q);

        if (!result || (!result.sd && !result.hd)) {
            await sendReact("❌");
            return reply("❌ *Failed to fetch video. Please check the URL and try again.*");
        }

        const dateNow = Date.now();

        // Native Flow Quick Reply Buttons සැකසීම
        const buttons = [];
        if (result.sd) {
            buttons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "SD QUALITY 🪫",
                    id: `fb_sd_${dateNow}`
                })
            });
        }
        if (result.hd) {
            buttons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "HD QUALITY 🔋",
                    id: `fb_hd_${dateNow}`
                })
            });
        }
        buttons.push({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "AUDIO 🎶",
                id: `fb_audio_${dateNow}`
            })
        });

        const captionHeader = `🧩 \`𝗖𝗞 𝗙𝗕 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥\` 🧩\n\n` +
                              `🔖 \`TITLE:\` *${result.title || "Facebook Video"}*\n` +
                              `🔗 \`URL:\` *${q}*\n\n` +
                              `⚡ *Select an option below to download:*`;

        // Send Native Flow Message with Image & Buttons
        await conn.sendMessage(from, {
            image: { url: result.thumbnail || "https://i.imgur.com/vE7vW6G.png" },
            caption: captionHeader,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            nativeFlow: buttons,
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        // Button Response Listener
        const handleResponse = async (update) => {
            try {
                const messageData = update.messages[0];
                if (!messageData || !messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`)) return;

                if (messageData.key?.remoteJid !== from) return;

                await sendReact("⬇️");

                if (selectedButtonId.startsWith("fb_audio")) {
                    const sourceVideo = result.sd || result.hd;
                    if (!sourceVideo) {
                        await sendReact("❌");
                        return reply("❌ *No video available for audio extraction.*");
                    }

                    await sendReact("⬆️");
                    
                    // Direct Audio Document Download
                    await conn.sendMessage(from, {
                        audio: { url: sourceVideo },
                        mimetype: "audio/mp4",
                        ptt: false
                    }, { quoted: ck });

                } else {
                    const selectedVideoUrl = selectedButtonId.startsWith("fb_hd") ? result.hd : result.sd;

                    if (!selectedVideoUrl) {
                        await sendReact("❌");
                        return reply("❌ *Selected quality not available.*");
                    }

                    await sendReact("⬆️");

                    await conn.sendMessage(from, {
                        video: { url: selectedVideoUrl },
                        mimetype: "video/mp4",
                        caption: `🎬 *${result.title || "Facebook Video"}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                    }, { quoted: ck });
                }

                await sendReact("✅");

            } catch (error) {
                console.error("Download Error:", error);
                await sendReact("❌");
                await reply("❌ *Failed to download. Please try again.*");
            }
        };

        conn.ev.on("messages.upsert", handleResponse);
        
        // Clean up event listener after 5 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", handleResponse);
        }, 300000);

    } catch (e) {
        console.error(e);
        await sendReact("❌");
        reply(`❌ *Error:* \`${e.message || e}\``);
    }
});
