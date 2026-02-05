import fetch from 'node-fetch'
const { generateWAMessageFromContent } = (await import('@realvare/based')).default

const handler = async (m, { conn }) => {
    const metaAIJid = '13135550002@s.whatsapp.net'
    
    let pp = 'https://telegra.ph/file/default.jpg'
    try {
        pp = await conn.profilePictureUrl(conn.user.id, 'image')
    } catch (e) {}
    
    const res = await fetch(pp)
    const arrayBuffer = await res.buffer()

    const msg = generateWAMessageFromContent(m.chat, {
        extendedTextMessage: {
            text: 'se va sburro',
            contextInfo: {
                participant: metaAIJid,
                remoteJid: metaAIJid,
                quotedMessage: {
                    listMessage: {
                        title: "test",
                        description: "test",
                        buttonText: "test",
                        listType: 1,
                        sections: [{ title: "test", rows: [] }]
                    }
                },
                externalAdReply: {
                    title: 'test',
                    body: 'sborro',
                    mediaType: 1,
                    showAdAttribution: true,
                    sourceType: 'product',
                    thumbnail: arrayBuffer,
                    sourceUrl: 'https://www.whatsapp.com',
                    renderLargerThumbnail: false,
                    businessOwnerJid: metaAIJid
                },
                isForwarded: true,
                forwardingScore: 999,
                adContextInfo: {
                    advertiserName: "Meta AI",
                }
            }
        }
    }, { userJid: conn.user.id })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.command = ['testead']
export default handler