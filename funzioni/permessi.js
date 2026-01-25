import chalk from 'chalk'

export async function groupUpdate(conn, anu) {
    try {
        const { id, participants, action, author } = anu
        
        const isRilevaActive = global.db.groups[id]?.rileva || false
        if (!isRilevaActive) return

        const user = participants[0]
        const from = author || anu.author || id

        const fakeContact = {
            key: { participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
            message: {
                contactMessage: {
                    displayName: await conn.getName(user),
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;User;;;\nFN:User\nitem1.TEL;waid=${user.split('@')[0]}:${user.split('@')[0]}\nitem1.X-ABLabel:PSTN\nEND:VCARD`
                }
            }
        }

        let testo = ''
        if (action === 'promote') {
            testo = `@${from.split('@')[0]} ha dato i poteri a @${user.split('@')[0]}`
        } else if (action === 'demote') {
            testo = `@${from.split('@')[0]} ha tolto i poteri a @${user.split('@')[0]}`
        }

        if (testo) {
            await conn.sendMessage(id, { 
                text: testo, 
                mentions: [from, user] 
            }, { quoted: fakeContact })
        }
    } catch (e) {
        console.error(chalk.red('[Errore Funzione Permessi]:'), e)
    }
}