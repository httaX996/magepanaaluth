const config = require('../config');
const { cmd, commands } = require('../command');
const { prepareWAMessageMedia, tokenizeCode } = require('@itsliaaa/baileys');
const { randomUUID } = require('crypto');

// Testing Image URL
const TEST_IMAGE_URL = 'https://i.ibb.co/M5DfjJ1h/x.jpg';

// Fake Quoted Message Object (ck context)
const ck = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "〴ᴄʜᴇᴛʜᴍɪɴᴀ ×͜×",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=13135550002:+13135550002
END:VCARD`
        }
    }
};

// -----------------------------------------------------------------
// TEST 1: Simple Text Message
// -----------------------------------------------------------------
cmd({
    pattern: "test1",
    desc: "Test regular text message",
    category: "test",
    react: "🧪",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            text: "👋🏻 Hello! Test 1 Successful."
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 2: Text Message with Standard Link Preview
// -----------------------------------------------------------------
cmd({
    pattern: "test2",
    desc: "Test text message with standard link preview",
    category: "test",
    react: "🔗",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const urlA = 'https://www.npmjs.com/package/@itsliaaa/baileys';
        await conn.sendMessage(from, {
            text: urlA + ' 👆🏻 Check it out!',
            linkPreview: {
                'matched-text': urlA,
                title: '🌱 @itsliaaa/baileys',
                description: 'Underrated Baileys Fork',
                previewType: 0,
                jpegThumbnail: TEST_IMAGE_URL
            }
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 3: Large Link Preview with Metadata & Favicon
// -----------------------------------------------------------------
cmd({
    pattern: "test3",
    desc: "Test large link preview with favicon",
    category: "test",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const urlB = 'https://www.npmjs.com/package/@itsliaaa/baileys#readme';
        
        const { imageMessage: image } = await prepareWAMessageMedia({
            image: { url: TEST_IMAGE_URL }
        }, {
            upload: conn.waUploadToServer,
            mediaTypeOverride: 'thumbnail-link'
        });

        image.height = 720;
        image.width = 480;

        await conn.sendMessage(from, {
            text: urlB + ' 👆🏻 Check it out!',
            linkPreview: {
                'matched-text': urlB,
                title: '🌱 @itsliaaa/baileys',
                description: 'Underrated Baileys Fork',
                previewType: 0,
                highQualityThumbnail: image,
                linkPreviewMetadata: {
                    linkMediaDuration: 0,
                    socialMediaPostType: 1, // REEL
                }
            },
            favicon: {
                url: TEST_IMAGE_URL
            }
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 4: Location Message
// -----------------------------------------------------------------
cmd({
    pattern: "test4",
    desc: "Test location message",
    category: "test",
    react: "📍",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            location: {
                degreesLatitude: 6.927079,
                degreesLongitude: 79.861244,
                name: '👋🏻 I am here (Colombo, Sri Lanka)'
            }
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 5: Event Message
// -----------------------------------------------------------------
cmd({
    pattern: "test5",
    desc: "Test event message",
    category: "test",
    react: "🗓️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            event: {
                name: '🎶 Meet & Mingle Party',
                description: 'Meet & Mingle Party is a fun gathering to connect and chat.',
                call: 'audio',
                startDate: new Date(Date.now() + 3600000),
                endDate: new Date(Date.now() + 28800000),
                isCancelled: false,
                isScheduleCall: false,
                extraGuestsAllowed: false,
                location: {
                    name: 'Colombo',
                    degreesLatitude: 6.927079,
                    degreesLongitude: 79.861244
                }
            }
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 6: Business Product Message
// -----------------------------------------------------------------
cmd({
    pattern: "test6",
    desc: "Test product message",
    category: "test",
    react: "🛍️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            image: { url: TEST_IMAGE_URL },
            body: '👋🏻 Check my product here!',
            footer: '@itsliaaa/baileys',
            product: {
                currencyCode: 'LKR',
                description: '🛍️ Interesting product!',
                priceAmount1000: 70_000_000,
                productId: randomUUID(),
                productImageCount: 1,
                salePriceAmount1000: 65_000_000,
                signedUrl: 'https://www.npmjs.com/package/@itsliaaa/baileys',
                title: '📦 Starseed (Premium)',
                url: 'https://www.npmjs.com/package/@itsliaaa/baileys'
            },
            businessOwnerJid: '0@s.whatsapp.net'
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});


        

// -----------------------------------------------------------------
// TEST 8: Rich Response with Tokenized Code Block & Table
// -----------------------------------------------------------------
cmd({
    pattern: "test8",
    desc: "Test rich response structure",
    category: "test",
    react: "✨",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const codeSnippet = 'console.log("Hello, World from Baileys!")';
        
        await conn.sendMessage(from, {
            disclaimerText: 'RAW submessages structure example',
            richResponse: [{
                text: 'Example Usage\n',
            }, {
                language: 'javascript',
                code: tokenizeCode(codeSnippet, 'javascript')
            }, {
                text: '\nPretty simple, right?\n'
            }, {
                text: 'Comparison between Node.js, Bun, and Deno\n',
            }, {
                title: 'Runtime Comparison',
                table: [{
                    isHeading: true,
                    items: ['', 'Node.js', 'Bun', 'Deno']
                }, {
                    isHeading: false,
                    items: ['Engine', 'V8 (C++)', 'JavaScriptCore (C++)', 'V8 (C++)']
                }, {
                    isHeading: false,
                    items: ['Performance', '4/5', '5/5', '4/5']
                }]
            }, {
                text: '\nDoes this help clarify the differences?'
            }]
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 9: Dedicated Message with Code Block
// -----------------------------------------------------------------
cmd({
    pattern: "test9",
    desc: "Test code block message",
    category: "test",
    react: "🧾",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            disclaimerText: 'Code Block Test',
            headerText: '## Example Code Usage',
            contentText: '---',
            code: 'const express = require("express");\nconst app = express();\napp.listen(3000);',
            language: 'javascript',
            footerText: 'Pretty simple, right?'
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 10: Message with Inline Entities (Links)
// -----------------------------------------------------------------
cmd({
    pattern: "test10",
    desc: "Test inline entities with links",
    category: "test",
    react: "🌏",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            disclaimerText: 'Inline Entities Test',
            headerText: '## Check Out These Links!',
            contentText: '---',
            links: [{
                text: '1. Google Search',
                title: 'Popular Search Engine',
                url: 'https://www.google.com/'
            }, {
                text: '2. YouTube Video Platform',
                title: 'Popular Streaming Platform',
                url: 'https://www.youtube.com/'
            }, {
                text: '3. Modded Baileys NPM',
                title: 'Underrated Baileys Fork',
                url: 'https://www.npmjs.com/package/@itsliaaa/baileys'
            }],
            footerText: '---'
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 11: Message with Standalone Table
// -----------------------------------------------------------------
cmd({
    pattern: "test11",
    desc: "Test table message",
    category: "test",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            disclaimerText: 'Table Test',
            headerText: '## Comparison between Node.js, Bun, and Deno',
            contentText: '---',
            title: 'Runtime Comparison',
            table: [
                ['', 'Node.js', 'Bun', 'Deno'],
                ['Engine', 'V8 (C++)', 'JavaScriptCore (C++)', 'V8 (C++)'],
                ['Performance', '4/5', '5/5', '4/5']
            ],
            noHeading: false,
            footerText: 'Does this help clarify the differences?'
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 12: Quick Reply Buttons Message
// -----------------------------------------------------------------
cmd({
    pattern: "test12",
    desc: "Send interactive buttons message",
    category: "test",
    react: "🔘",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            text: "✨ කරුණාකර පහත Button එකක් තෝරන්න:",
            footer: "CK Bot System",
            buttons: [
                { buttonId: 'btn1', buttonText: { displayText: '✨ Option 1' }, type: 1 },
                { buttonId: 'btn2', buttonText: { displayText: '✨ Option 2' }, type: 1 }
            ],
            headerType: 1
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 13: Interactive Flow / Interactive Buttons Message
// -----------------------------------------------------------------
cmd({
    pattern: "test13",
    desc: "Send flow/interactive message",
    category: "test",
    react: "💭",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            text: "💭 Flow Response Options:",
            footer: "CK Bot System",
            buttons: [
                { buttonId: 'flow1', buttonText: { displayText: '💭 Open Flow' }, type: 1 }
            ],
            headerType: 1
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 14: Interactive List Menu Message
// -----------------------------------------------------------------
cmd({
    pattern: "test14",
    desc: "Send interactive list message",
    category: "test",
    react: "📄",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const sections = [
            {
                title: "Section 1",
                rows: [
                    { title: "Option 1", rowId: "option1", description: "This is option 1" },
                    { title: "Option 2", rowId: "option2", description: "This is option 2" }
                ]
            }
        ];

        await conn.sendMessage(from, {
            text: "📄 See More Options",
            footer: "CK Bot System",
            title: "📄 Menu List",
            buttonText: "✨ Click Here",
            sections
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 15: Template Buttons Message (Updated & Working Version)
// -----------------------------------------------------------------
cmd({
    pattern: "test15",
    desc: "Send template buttons message",
    category: "test",
    react: "📑",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            text: "✨ Template Menu Options:",
            footer: "CK Bot System",
            templateButtons: [
                {
                    index: 1,
                    urlButton: {
                        displayText: '🌐 Visit Website',
                        url: 'https://www.npmjs.com/package/@itsliaaa/baileys'
                    }
                },
                {
                    index: 2,
                    callButton: {
                        displayText: '📞 Call Owner',
                        phoneNumber: '+94700000000'
                    }
                },
                {
                    index: 3,
                    quickReplyButton: {
                        displayText: '✨ Quick Reply',
                        id: 'quick_reply_id'
                    }
                }
            ],
            viewOnce: true
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 16: Regular Buttons Message
// -----------------------------------------------------------------
cmd({
    pattern: "test16",
    desc: "Test regular buttons message",
    category: "test",
    react: "🔘",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            text: '👆🏻 Buttons!',
            footer: '@itsliaaa/baileys',
            buttons: [{
                text: '👋🏻 SignUp',
                id: '#SignUp'
            }]
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 17: Buttons with Media & Native Flow / List Message
// -----------------------------------------------------------------
cmd({
    pattern: "test17",
    desc: "Test buttons with media & list message",
    category: "test",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // 1. Image with Buttons and Sections
        await conn.sendMessage(from, {
            image: { url: TEST_IMAGE_URL },
            caption: '👆🏻 Buttons and Native Flow!',
            footer: '@itsliaaa/baileys',
            buttons: [{
                text: '📋 Select',
                sections: [{
                    title: '✨ Section 1',
                    rows: [{
                        header: '',
                        title: '💭 Secret Ingredient',
                        description: '',
                        id: '#SecretIngredient'
                    }]
                }, {
                    title: '✨ Section 2',
                    highlight_label: '🔥 Popular',
                    rows: [{
                        header: '',
                        title: '🏷️ Coupon',
                        description: '',
                        id: '#CouponCode'
                    }]
                }]
            }]
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 18: Interactive Native Flow
// -----------------------------------------------------------------
cmd({
    pattern: "test18",
    desc: "Test native flow interactive message",
    category: "test",
    react: "🗄️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            image: { url: TEST_IMAGE_URL },
            caption: '🗄 Interactive!',
            footer: '@itsliaaa/baileys',
            optionText: '👉🏻 Select Options',
            optionTitle: '📄 Select Options',
            offerText: '🏷️ Newest Coupon!',
            offerCode: '@itsliaaa/baileys',
            offerUrl: 'https://www.npmjs.com/package/@itsliaaa/baileys',
            offerExpiration: Date.now() + 3600000,
            nativeFlow: [{
                text: '👋🏻 Greeting',
                id: '#Greeting',
                icon: 'review'
            }, {
                text: '📞 Call',
                call: '628123456789'
            }, {
                text: '📋 Copy',
                copy: '@itsliaaa/baileys'
            }, {
                text: '🌐 Source',
                url: 'https://www.npmjs.com/package/@itsliaaa/baileys',
                useWebview: true
            }, {
                text: '📋 Select',
                sections: [{
                    title: '✨ Section 1',
                    rows: [{
                        header: '',
                        title: '🏷️ Coupon',
                        description: '',
                        id: '#CouponCode'
                    }]
                }, {
                    title: '✨ Section 2',
                    highlight_label: '🔥 Popular',
                    rows: [{
                        header: '',
                        title: '💭 Secret Ingredient',
                        description: '',
                        id: '#SecretIngredient'
                    }]
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false,
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 19: Carousel & Native Flow (Working Version)
// -----------------------------------------------------------------
cmd({
    pattern: "test19",
    desc: "Test carousel with native flow",
    category: "test",
    react: "🗂️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const msg = generateWAMessageFromContent(from, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: "🗂️ Interactive Carousel Test!"
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: "@itsliaaa/baileys"
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
                            cards: [
                                {
                                    header: proto.Message.InteractiveMessage.Header.create({
                                        title: "🖼️ Card 1",
                                        hasVideoAttachment: false,
                                        imageMessage: (await conn.sendMessage(from, { image: { url: TEST_IMAGE_URL } }, { quoted: ck })).message.imageMessage
                                    }),
                                    body: proto.Message.InteractiveMessage.Body.create({
                                        text: "This is the first card description"
                                    }),
                                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [{
                                            name: "cta_url",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🌐 Open Source",
                                                url: "https://www.npmjs.com/package/@itsliaaa/baileys"
                                            })
                                        }]
                                    })
                                },
                                {
                                    header: proto.Message.InteractiveMessage.Header.create({
                                        title: "🖼️ Card 2",
                                        hasVideoAttachment: false,
                                        imageMessage: (await conn.sendMessage(from, { image: { url: TEST_IMAGE_URL } }, { quoted: ck })).message.imageMessage
                                    }),
                                    body: proto.Message.InteractiveMessage.Body.create({
                                        text: "This is the second card description"
                                    }),
                                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [{
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🛒 Select Option",
                                                id: "#Option2"
                                            })
                                        }]
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: ck });

        await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});
// -----------------------------------------------------------------
// TEST 20: Native Flow with Audio in Footer
// -----------------------------------------------------------------
cmd({
    pattern: "test20",
    desc: "Test native flow with audio footer",
    category: "test",
    react: "🔈",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            text: '🔈 Music in the footer!',
            audioFooter: {
                url: 'https://github.com/manpakaya/Lara_Data_Base/raw/refs/heads/main/hm.mp3' // Test Audio Link
            },
            nativeFlow: [{
                text: '👍🏻 Good, next',
                id: '#Next',
                icon: 'review'
            }, {
                text: '👎🏻 Skip',
                id: '#Skip',
                icon: 'default'
            }]
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 21: Hydrated Template Buttons (Working Version)
// -----------------------------------------------------------------
cmd({
    pattern: "test21",
    desc: "Test hydrated template buttons",
    category: "test",
    react: "🫙",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const msg = generateWAMessageFromContent(from, {
            templateMessage: {
                hydratedTemplate: {
                    hydratedContentText: "🫙 Hydrated Template Message Test!",
                    hydratedFooterText: "@itsliaaa/baileys",
                    hydratedButtons: [
                        {
                            index: 1,
                            urlButton: {
                                displayText: "🌐 Visit Website",
                                url: "https://www.npmjs.com/package/@itsliaaa/baileys"
                            }
                        },
                        {
                            index: 2,
                            callButton: {
                                displayText: "📞 Call Owner",
                                phoneNumber: "+94700000000"
                            }
                        },
                        {
                            index: 3,
                            quickReplyButton: {
                                displayText: "👉🏻 Order Now",
                                id: "#Order"
                            }
                        }
                    ]
                }
            }
        }, { quoted: ck });

        await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});

// -----------------------------------------------------------------
// TEST 22
// -----------------------------------------------------------------

cmd({
    pattern: "test22",
    desc: "Test native flow interactive message",
    category: "test",
    react: "🗄️",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, {
            image: { url: TEST_IMAGE_URL },
            caption: '🗄 Interactive!',
            footer: '👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            optionText: '👉🏻 Select Options',
            optionTitle: '📄 Select Options',
            offerText: '🏷️ 𝗖𝗶𝗻𝗲𝗦𝘂𝗯𝘇',
            offerCode: '>👨🏻‍💻 *ᴄʜᴇᴛʜᴍɪɴᴀ ᴋᴀᴠɪꜱʜᴀɴ*',
            offerUrl: 'https://www.npmjs.com/package/@itsliaaa/baileys',
            offerExpiration: Date.now() + 3600000,
            nativeFlow: [{
                text: '📋 Select',
                sections: [{
                    title: '✨ Section 1',
                    rows: [{
                        header: '',
                        title: '🏷️ Coupon',
                        description: '',
                        id: '#CouponCode'
                    }]
                }, {
                    title: '✨ Section 2',
                    highlight_label: '🔥 Popular',
                    rows: [{
                        header: '',
                        title: '💭 Secret Ingredient',
                        description: '',
                        id: '#SecretIngredient'
                    }]
                }],
                icon: 'default'
            }],
            interactiveAsTemplate: false,
        }, { quoted: ck });
    } catch (e) {
        console.error(e);
        reply(`${e}`);
    }
});
