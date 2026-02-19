const handler = async (m, { conn }) => {
    const chatsDb = global.db.data.chats || {}
    const pfpDefault = 'https://i.ibb.co/6fs5B1V/triplo3.jpg'
    
    const allGroups = Object.entries(chatsDb)
        .filter(([id, data]) => id.endsWith('@g.us'))
        .sort((a, b) => (b[1].messages || 0) - (a[1].messages || 0))
        .slice(0, 5)

    if (allGroups.length === 0) return m.reply('🏮 ╰┈➤ Nessun dato disponibile per i gruppi.')

    const totalMsgsGlobal = Object.values(chatsDb)
        .reduce((acc, chat) => acc + (chat.messages || 0), 0)

    const dataOggi = new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    })

    let report = `🏰 *TOP 5 GRUPPI ATTIVI* 🏰\n\n`

    for (let i = 0; i < allGroups.length; i++) {
        const [id, data] = allGroups[i]
        let groupName = 'Gruppo Sconosciuto'
        try {
            const meta = await conn.groupMetadata(id)
            groupName = meta.subject
        } catch {
            groupName = data.subject || 'Ex Gruppo'
        }
        
        const msgs = data.messages || 0
        const rankMedal = ['🥇', '🥈', '🥉', '🏅', '🏅'][i]
        
        report += `${rankMedal} *${i + 1}°* ─ *${groupName}*\n`
        report += `╰┈➤ \`messaggi\` ─ *${msgs}*\n\n`
    }

    report += `*Aggiornato al \`${dataOggi}\`* 🐉`

    let currentGroupPfp
    try {
        currentGroupPfp = await conn.profilePictureUrl(m.chat, 'image')
    } catch {
        currentGroupPfp = pfpDefault
    }

    await conn.sendMessage(m.chat, {
        text: report,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.canale.id,
                newsletterName: global.canale.nome,
                serverMessageId: 100
            },
            externalAdReply: {
                title: `Classifica Globale Gruppi`,
                body: `📧 - ${totalMsgsGlobal} messaggi totali nel bot`,
                thumbnailUrl: currentGroupPfp,
                sourceUrl: global.canale.link,
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })
}

handler.command = ['topgruppi', 'topgroups']
handler.group = true

export default handler