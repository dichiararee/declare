import fetch from 'node-fetch'
const { generateWAMessageFromContent } = (await import('@realvare/based')).default

const handler = async (m, { conn }) => {
    let pp = 'https://telegra.ph/file/default.jpg'
    try {
        pp = await conn.profilePictureUrl(conn.user.id, 'image')
    } catch (e) {}
    
    const res = await fetch(pp)
    const buffer = Buffer.from(await res.arrayBuffer())

    const msg = generateWAMessageFromContent(m.chat, {
        orderMessage: {
            itemCount: 1,
            status: 1,
            surface: 1,
            message: "se va sburro",
            orderTitle: "test",
            sellerJid: conn.user.id,
            totalAmount1000: "0",
            totalCurrencyCode: "EUR",
            thumbnail: buffer,
            contextInfo: {
                showAdAttribution: true
            }
        }
    }, { userJid: m.chat })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.command = ['order']
export default handler