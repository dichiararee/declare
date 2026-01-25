import { generateWAMessageFromContent, proto } from '@realvare/based'

const handler = async (m, { conn }) => {
    console.log('--- TEST BUTTONS ---')

    const buttons = [
        { buttonId: '.ping', buttonText: { displayText: '🏓 PING' }, type: 1 },
        { buttonId: '.funzioni', buttonText: { displayText: '⚙️ FUNZIONI' }, type: 1 }
    ]

    const buttonMessage = {
        text: "Ciao! Scegli un'opzione qui sotto:",
        footer: "Zexin Bot Test",
        buttons: buttons,
        headerType: 1
    }

    try {
        const msg = await generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    buttonsMessage: buttonMessage
                }
            }
        }, { quoted: m })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        console.log('--- BUTTONS INVIATI ---')
    } catch (e) {
        console.error('--- ERRORE BUTTONS ---', e)
        m.reply('Errore: ' + e.message)
    }
}

handler.command = ['test3']
export default handler