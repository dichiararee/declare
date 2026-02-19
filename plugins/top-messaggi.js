import PhoneNumber from 'awesome-phonenumber'

const handler = async (m, { conn }) => {
    const usersDb = global.db.data.users || {}
    const chatMetada = m.isGroup ? await conn.groupMetadata(m.chat) : { subject: 'Chat Privata' }
    
    let groupPfp
    try {
        groupPfp = await conn.profilePictureUrl(m.chat, 'image')
    } catch {
        groupPfp = 'https://i.ibb.co/6fs5B1V/triplo3.jpg'
    }

    const allUsers = Object.entries(usersDb)
        .filter(([id, data]) => (id.endsWith('@s.whatsapp.net') || id.endsWith('@lid')) && data.messages > 0)
    
    const totalMsgs = allUsers.reduce((acc, [id, data]) => acc + (data.messages || 0), 0)
    
    const topUsers = allUsers
        .sort((a, b) => (b[1].messages || 0) - (a[1].messages || 0))
        .slice(0, 5)

    if (topUsers.length === 0) return m.reply('🏮 ╰┈➤ Nessun dato disponibile per la classifica.')

    const dataOggi = new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    })

    let report = `🏆 *TOP 5 MESSAGGI* 🏆\n\n`
    const mentions = []

    topUsers.forEach(([id, data], index) => {
        const jid = id
        const num = id.split('@')[0]
        const msgs = data.messages || 0
        const rankMedal = ['🥇', '🥈', '🥉', '🏅', '🏅'][index]
        
        report += `${rankMedal} *${index + 1}°* ─ *@${num}*\n`
        report += `╰┈➤ \`messaggi\` ─ *${msgs}*\n\n`
        mentions.push(jid)
    })

    report += `*Aggiornato al \`${dataOggi}\`* 🐉`

    await conn.sendMessage(m.chat, {
        text: report,
        mentions: mentions,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.canale.id,
                newsletterName: global.canale.nome,
                serverMessageId: 100
            },
            externalAdReply: {
                title: `${chatMetada.subject}`,
                body: `📧 - ${totalMsgs} messaggi`,
                thumbnailUrl: groupPfp,
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })
}

handler.command = ['topmessaggi', 'topmsgs', 'leaderboard']
handler.group = true

export default handler