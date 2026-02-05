import chalk from 'chalk'

export default async function (m, conn = {}, isEvent = false) {
  try {
    let time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const border = chalk.grey('│')

    const safeGetName = async (id) => {
      try {
        return conn.getName ? await conn.getName(id) : id.split('@')[0]
      } catch {
        return id.split('@')[0]
      }
    }

    if (isEvent) {
      console.log(chalk.grey(JSON.stringify(m, null, 2)))
      
      const { id, participants, action } = m
      let groupName = await safeGetName(id)

      let eventCfg = {
        'add': { text: 'MEMBRO ENTRATO', icon: '📥', color: chalk.greenBright },
        'remove': { text: 'MEMBRO USCITO', icon: '📤', color: chalk.redBright },
        'promote': { text: 'NUOVO ADMIN', icon: '⭐', color: chalk.yellowBright },
        'demote': { text: 'ADMIN REVOCATO', icon: '🎖️', color: chalk.red },
        'announce': { text: 'SOLO ADMIN', icon: '🔒', color: chalk.blueBright },
        'not_announce': { text: 'TUTTI POSSONO SCRIVERE', icon: '🔓', color: chalk.cyanBright }
      }[action] || { text: `EVENTO: ${action.toUpperCase()}`, icon: '⚙️', color: chalk.white }

      console.log(chalk.cyanBright(`╭───〔 ${chalk.bold(time)} 〕───┈`))
      console.log(`${border} ${eventCfg.color.bold(eventCfg.icon + ' ' + eventCfg.text)}`)
      console.log(`${border} ${chalk.magenta('👥 GRUPPO:')} ${chalk.white(groupName)}`)
      if (participants) console.log(`${border} ${chalk.grey('👤 UTENTI:')} ${chalk.white(participants.map(p => p.split('@')[0]).join(', '))}`)
      console.log(chalk.cyanBright('╰────────────────────────┈\n'))
      return
    }

    let sender = m.sender || m.key?.participant || m.key?.remoteJid || ''
    let displayNum = sender.split('@')[0] || 'Sconosciuto'
    let name = m.pushName || await safeGetName(sender)
    let chat = m.chat || m.key?.remoteJid || ''
    let isGroup = chat.endsWith('@g.us')
    let chatName = isGroup ? await safeGetName(chat) : ''

    const mtype = m.mtype || (m.message ? Object.keys(m.message)[0] : 'unknown')
    const messageContent = m.text || m.msg?.text || m.msg?.caption || m.message?.conversation || ""
    const isCommand = (messageContent && /^[./!#]/.test(messageContent)) || false
    
    if (mtype === 'protocolMessage' || mtype === 'senderKeyDistributionMessage') return

    console.log(chalk.magentaBright(`╭───〔 ${chalk.bold(time)} 〕───┈`))
    console.log(`${border} ${chalk.blueBright.bold('✉️  ' + mtype.replace('Message', '').toUpperCase())} ${chalk.grey('da:')} ${isCommand ? chalk.redBright.bold(name) : chalk.greenBright.bold(name)} ${chalk.grey('(@' + displayNum + ')')}`)
    
    if (isGroup) {
      console.log(`${border} ${chalk.yellow('👥')} ${chalk.yellow.bold(chatName)}`)
    } else {
      console.log(`${border} ${chalk.cyan('👤 PRIVATA')}`)
    }

    // Se non è un comando e non è un semplice messaggio di testo (conversation), stampa il JSON
    if (!isCommand && mtype !== 'conversation' && mtype !== 'extendedTextMessage') {
      console.log(chalk.grey('├─┈'))
      console.log(`${border} ${chalk.yellow('📦 RAW JSON:')}`)
      const jsonStr = JSON.stringify(m.message || m, null, 2)
      jsonStr.split('\n').forEach(line => {
        console.log(`${border} ${chalk.grey(line)}`)
      })
    }

    if (messageContent) {
      console.log(chalk.grey('├─┈'))
      const lines = messageContent.split('\n')
      lines.forEach((line, index) => {
        const icon = isCommand ? chalk.red('⚡') : chalk.blue('💬')
        console.log(`${border} ${index === lines.length - 1 ? icon : chalk.grey('┇')} ${isCommand ? chalk.yellowBright(line) : chalk.white(line)}`)
      })
    } else if (mtype === 'conversation' || mtype === 'extendedTextMessage') {
      console.log(`${border} ${chalk.italic.grey('📎 [Media o Messaggio Vuoto]')}`)
    }
    
    console.log(chalk.magentaBright('╰────────────────────────┈\n'))
  } catch (e) {
    console.log(chalk.red(`[Logger]: Errore nel logging: ${e.message}`))
  }
}