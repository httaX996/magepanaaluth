const config = require('../config');
const { cmd } = require('../command');
const runtime = require('../lib/functions');
const os = require("os");

// ⚡ PING COMMAND
cmd({
    pattern: "ping",
    alias: ["speed", "p"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        const startTime = Date.now();

        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay

        const endTime = Date.now();
        const ping = endTime - startTime;

        // Send the ping result
        await conn.sendMessage(from, {
            text: `*CK BOT SPEED ➟ ${ping}ms*`
        }, { quoted: ck }); 

    } catch (e) {
        console.error(e);
        reply(`An error occurred: ${e.message}`);
    }
});


/*cmd({
    pattern: "uptime",
    alias: ["runtime", "up"],
    desc: "Check bot runtime / uptime",
    category: "main",
    react: "⏰",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const botRuntime = {runtime(process.uptime())};
        
        const uptimeMessage = `*⏰ BOT RUNTIME*\n\n` +
                              `⏱️ *Uptime:* ${botRuntime}\n\n` +
                              `> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`;

        await conn.sendMessage(from, {
            text: uptimeMessage
        }, { quoted: ck }); 
    } catch (err) {
        console.error(err);
        reply(`❌ *Error:* \`${err.message || err}\``);
    }
});*/


const ck = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "〴ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ ×͜×",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=13135550002:+13135550002
END:VCARD`
        }
    }
};
