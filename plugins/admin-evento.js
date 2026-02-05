const handler = async (m, { conn, text }) => {
    const { generateWAMessageFromContent } = (await import('@realvare/based')).default
    
    let [eventTitle, eventDesc, eventLoc] = text.split('|').map(v => v.trim())
    
    if (!eventTitle) return m.reply('Esempio d\'uso:\n.evento Titolo | Descrizione | Luogo')

    const now = Math.floor(Date.now() / 1000)
    const startTime = now + 3600 
    const endTime = startTime + 7200 

    const msg = generateWAMessageFromContent(m.chat, {
        eventMessage: {
            isCanceled: false,
            name: eventTitle,
            description: eventDesc || "Nessuna descrizione fornita",
            location: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: eventLoc || "Luogo non specificato"
            },
            joinLink: "", 
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            extraGuestsAllowed: true,
            isScheduleCall: false,
            hasReminder: true,
            reminderOffsetSec: "3600"
        }
    }, { userJid: m.chat, quoted: m })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.command = ['evento', 'event'],
handler.admin = true
export default handler