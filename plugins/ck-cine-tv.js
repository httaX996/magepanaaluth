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

// Global Sessions Map
const tvSearchSessions = new Map();
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 Minutes

// Quality Images Object
const QUALITY_IMAGES = {
    "480p": "https://i.ibb.co/DHjr43NX/1791297012670.jpg",
    "720p": "https://i.ibb.co/Kc04vK8v/1791297057307.jpg",
    "1080p": "https://i.ibb.co/Ndx5ht4Q/1791297099338.jpg"
};

function isSessionExpired(session) {
    if (!session) return true;
    return (Date.now() - session.createdAt) > SESSION_TIMEOUT;
}

// Button/Row ID Extract Function
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

// Poster Thumbnail Function
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
    pattern: "cinetv",
    alias: ["tvshow", "cinesubztv"],
    desc: "Search TV Series from CineSubz with Native Flow Buttons",
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
            return reply("🎬 *Please provide a TV Series name to search!*\n\n💡 *Example:* `.cinetv loki`");
        }

        await sendReact("🎬");

        const searchUrl = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/search?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.success || !data.results || !data.results.length) {
            await sendReact("❌");
            return reply("❌ *No TV Series found matching your search query!* 🔍");
        }

        const moviesSlice = data.results.slice(0, 20);
        const sessionId = Date.now().toString();

        tvSearchSessions.set(sessionId, {
            moviesSlice,
            from,
            createdAt: Date.now()
        });

        // Auto delete session after timeout
        setTimeout(() => {
            tvSearchSessions.delete(sessionId);
        }, SESSION_TIMEOUT);

        const movieRows = moviesSlice.map((movie, index) => ({
            header: `🎬 ${movie.year || "N/A"}`,
            title: `🎥 ${movie.title.substring(0, 45)}`,
            description: `✨ Tap to view details & select quality`,
            id: `tv_select_${sessionId}_${index}`
        }));

        // Send Search Results using Native Flow List
        await conn.sendMessage(from, {
            image: { url: config.IMG_URL },
            caption: `🔍 𝗖𝗜𝗡𝗘𝗦𝗨𝗕𝗭 𝗧𝗩 𝗦𝗘𝗔𝗥𝗖𝗛\n\n🎯 *Search Query:* \`${q}\`\n📂 *Total Found:* \`${moviesSlice.length} Series\`\n\n⚡ *Please select your desired TV Series from the menu below:*\n`,
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select TV Series',
            optionTitle: '📂 CineSubz TV Results',
            offerText: '🏷️ 𝗖𝗶𝗻𝗲𝗦𝘂𝗯𝘇',
            offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
            offerUrl: 'https://cinesubz.co',
            offerExpiration: Date.now() + 600000,
            nativeFlow: [{
                text: '📋 Select TV Series',
                sections: [{
                    title: `🌟 Search Results for: ${q}`,
                    rows: movieRows
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false
        }, { quoted: ck });

        await sendReact("✅");

        // ----------------------------------------------------
        // Dynamic Handler Function for Upsert Events
        // ----------------------------------------------------
        const tvButtonHandler = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;

                const selectedButtonId = extractButtonId(msg.message);
                if (!selectedButtonId) return;

                const currentJid = msg.key?.remoteJid;
                if (currentJid !== from) return;

                // A. TV Series selection (Details + Quality Menu එකම Message එකකින් යැවීම)
                if (selectedButtonId.startsWith(`tv_select_${sessionId}_`)) {
                    const movieIndex = parseInt(selectedButtonId.replace(`tv_select_${sessionId}_`, ""));
                    const session = tvSearchSessions.get(sessionId);

                    if (isSessionExpired(session)) {
                        conn.ev.off("messages.upsert", tvButtonHandler);
                        return reply("❌ *Session expired! Please search again.*");
                    }

                    await sendReact("⏳");
                    const selectedMovie = session.moviesSlice[movieIndex];
                    session.selectedMovieLink = selectedMovie.link;

                    // Fetch details
                    const infoUrl = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/tvinfo?url=${encodeURIComponent(selectedMovie.link)}`;
                    const { data } = await axios.get(infoUrl);

                    let detailsCaption = "";

                    if (data.success && data.data) {
                        const tvInfo = data.data;
                        session.tvPoster = tvInfo.poster || tvInfo.image || config.IMG_URL;
                        session.tvTitle = tvInfo.title || selectedMovie.title;

                        let tvCast = "N/A";
                        if (tvInfo.cast && Array.isArray(tvInfo.cast)) {
                            const filteredCast = tvInfo.cast.filter(c => c !== "Cast Collection");
                            if (filteredCast.length > 0) {
                                tvCast = filteredCast.slice(0, 5).map(c => `*• ${c}*`).join('\n');
                            }
                        }

                        let tvDesc = "No description available.";
                        if (tvInfo.description) {
                            tvDesc = tvInfo.description.length > 200 ? tvInfo.description.slice(0, 200) + "..." : tvInfo.description;
                        }

                        detailsCaption += `🎬 *${tvInfo.title || "Unknown"}*\n\n`;
                        detailsCaption += `📅 \`YEAR:\` *${tvInfo.year || "N/A"}*\n`;
                        detailsCaption += `⭐ \`IMDB:\` *${tvInfo.imdb || "N/A"}*\n`;
                        detailsCaption += `🌍 \`COUNTRY:\` *${tvInfo.country || "N/A"}*\n`;
                        detailsCaption += `🎭 \`CAST:\` \n${tvCast}\n\n`;
                        detailsCaption += `📝 \`DESC:\` _${tvDesc}_\n\n`;
                        detailsCaption += `⚡ *Please select your desired video resolution below:*\n`;
                    } else {
                        session.tvPoster = config.IMG_URL;
                        session.tvTitle = selectedMovie.title;
                        detailsCaption = `🎬 *${selectedMovie.title}*\n\n⚡ *Please select your desired video resolution below:*\n`;
                    }

                    tvSearchSessions.set(sessionId, session);

                    // Quality Selection Rows
                    const qualityRows = [
                        { header: `🎞️ Quality`, title: `480P`, description: `🔽 Select 480p Quality`, id: `tv_ext_${sessionId}_480p` },
                        { header: `🎞️ Quality`, title: `720P`, description: `🔽 Select 720p Quality`, id: `tv_ext_${sessionId}_720p` },
                        { header: `🎞️ Quality`, title: `1080P`, description: `🔽 Select 1080p Quality`, id: `tv_ext_${sessionId}_1080p` }
                    ];

                    // Details සහ Quality Buttons එකටම යැවීම
                    await conn.sendMessage(from, {
                        image: { url: session.tvPoster },
                        caption: detailsCaption,
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
                                title: '⚡ Available Qualities',
                                rows: qualityRows
                            }],
                            icon: 'default'
                        }],
                        interactiveAsTemplate: false
                    }, { quoted: ck });

                    await sendReact("✅");
                }

                // B. Quality Selection (Fetch Episodes and show with Quality Image)
                if (selectedButtonId.startsWith(`tv_ext_${sessionId}_`)) {
                    const qualityExt = selectedButtonId.replace(`tv_ext_${sessionId}_`, "").toLowerCase();
                    const session = tvSearchSessions.get(sessionId);

                    if (isSessionExpired(session)) {
                        conn.ev.off("messages.upsert", tvButtonHandler);
                        return reply("❌ *Session expired. Please search again.*");
                    }

                    await sendReact("⏳");
                    await reply("🔄 *Episodes links generating... Please wait a moment!* ⏳");

                    const info2Url = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/tvinfo2?url=${encodeURIComponent(session.selectedMovieLink)}&ext=${qualityExt}`;
                    const { data } = await axios.get(info2Url);

                    if (!data.success || !data.data || !data.data.seasons) {
                        await sendReact("❌");
                        return reply("❌ *Failed to fetch episodes for this quality.*");
                    }

                    const tvInfo2Data = data.data;
                    session.seasonsData = tvInfo2Data.seasons;
                    session.seasonKeys = Object.keys(tvInfo2Data.seasons);
                    tvSearchSessions.set(sessionId, session);

                    // Build Season / Episode Sections
                    const seasonSections = session.seasonKeys.map((seasonName, sIdx) => ({
                        title: `📂 ⭐ ${seasonName}`,
                        rows: tvInfo2Data.seasons[seasonName].map((ep, epIdx) => ({
                            header: `📺 ${ep.episode_number}`,
                            title: ep.episode_name ? `${ep.episode_number}:${ep.episode_name.substring(0, 30)}` : `${ep.episode_number}`,
                            description: `📦 Size: ${ep.downloads?.[0]?.size || 'N/A'} | 🎬 Tap to Download`,
                            id: `tv_ep_${sessionId}_${sIdx}_${epIdx}`
                        }))
                    }));

                    // Selected quality's custom image URL
                    const selectedQualityImage = QUALITY_IMAGES[qualityExt] || session.tvPoster || config.IMG_URL;

                    await conn.sendMessage(from, {
                        image: { url: selectedQualityImage },
                        caption: `📺 *${session.tvTitle || "TV Series"}*\n✨ *Selected Quality:* \`${qualityExt.toUpperCase()}\`\n\n🔽 *Please select your desired Episode from the list below:*\n`,
                        footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
                        optionText: '👉🏻 Select Episode',
                        optionTitle: '🍿 Available Episodes',
                        offerText: '🏷️ 𝗖𝗶𝗻𝗲𝗦𝘂𝗯𝘇',
                        offerCode: '👨🏻‍💻 ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ',
                        offerUrl: 'https://cinesubz.co',
                        offerExpiration: Date.now() + 900000,
                        nativeFlow: [{
                            text: '📋 Select Episode',
                            sections: seasonSections,
                            icon: 'default'
                        }],
                        interactiveAsTemplate: false
                    }, { quoted: ck });

                    await sendReact("✅");
                }

                // C. Episode Selection (Download & Send Document)
                if (selectedButtonId.startsWith(`tv_ep_${sessionId}_`)) {
                    const parts = selectedButtonId.split("_");
                    const sIdx = parseInt(parts[3]);
                    const epIdx = parseInt(parts[4]);

                    const session = tvSearchSessions.get(sessionId);
                    if (isSessionExpired(session)) {
                        conn.ev.off("messages.upsert", tvButtonHandler);
                        return reply("❌ *Session expired. Please try again.*");
                    }

                    await sendReact("⬇️");
                    const seasonName = session.seasonKeys[sIdx];
                    const episode = session.seasonsData[seasonName][epIdx];
                    const downloadLinkObj = episode.downloads?.[0];

                    if (!downloadLinkObj || !downloadLinkObj.download_link) {
                        await sendReact("❌");
                        return reply("❌ *Download link not available for this episode.*");
                    }

                    await reply("📥 *Generating direct download link... Please wait!* 🚀");

                    const dlApiUrl = `https://chethmina-kavishan-cinesubz-api-v1.vercel.app/api/dl?url=${encodeURIComponent(downloadLinkObj.download_link)}`;
                    const { data: dlData } = await axios.get(dlApiUrl);

                    if (!dlData.status || !dlData.direct_link) {
                        await sendReact("❌");
                        return reply("❌ *Direct download link generation failed!*");
                    }

                    await sendReact("⬆️");
                    const thumb = await createThumbnail(session.tvPoster);

                    await conn.sendMessage(from, {
                        document: { url: dlData.direct_link },
                        mimetype: "video/mp4",
                        fileName: `${dlData.title || episode.episode_name || "Episode"}.mp4`,
                        jpegThumbnail: thumb,
                        caption: `📌 *${seasonName} - ${episode.episode_number}* (${episode.episode_name || ""})\n\n🎞️ \`Quality:\` *${dlData.quality || downloadLinkObj.quality || "N/A"}*\n\n> 👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*`
                    }, { quoted: ck });

                    await sendReact("✅");
                }

            } catch (err) {
                console.error("Listener Error: ", err);
            }
        };

        conn.ev.on("messages.upsert", tvButtonHandler);

        // Cleanup listener after timeout
        setTimeout(() => {
            conn.ev.off("messages.upsert", tvButtonHandler);
            tvSearchSessions.delete(sessionId);
        }, SESSION_TIMEOUT);

    } catch (err) {
        console.error(err);
        await conn.sendMessage(from, { react: { key: mek.key, text: "❌" } });
        reply(`❌ *System Error:* \`${err.message || err}\``);
    }
});
