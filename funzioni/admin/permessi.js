import chalk from 'chalk'

export async function groupUpdate(conn, anu) {
    try {
        const { id, participants, action, author } = anu
        
        if (!global.db || !global.db.data) return
        
        const chat = global.db.data.groups?.[id] || global.db.data.chats?.[id]
        if (!chat || !chat.rileva) return

        let displayName = ""
        let testo = ""

        if (action === 'promote' || action === 'demote') {
            const user = participants[0]
            displayName = action === 'promote' ? `🎋 PROMOZIONE` : `🎐 RETROCESSIONE`
            testo = action === 'promote' 
                ? `*@${user.split('@')[0]}* è ora un amministratore.`
                : `*@${user.split('@')[0]}* non è più un amministratore.`
        } else {
            return 
        }

        const fakeContact = {
            key: { participant: '0@s.whatsapp.net'},
            message: {
                contactMessage: {
                    displayName: displayName,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;User;;;\nFN:User\nitem1.TEL;waid=${(author || id).split('@')[0]}:${(author || id).split('@')[0]}\nEND:VCARD`
                }
            }
        }

        await conn.sendMessage(id, { 
            text: testo, 
            mentions: [participants[0], author].filter(Boolean),
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.canale.id,
                    newsletterName: global.canale.nome
                }
            }
        }, { quoted: fakeContact })

    } catch (e) {
        console.error(chalk.red('[Errore Log Permessi]:'), e)
    }
}