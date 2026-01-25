import chalk from 'chalk'

export default async function (m, conn = {}, isEvent = false) {
  try {
    let time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const border = chalk.grey('│')

    if (isEvent) {
      const { id, participants, action } = m
      let groupName = 'Gruppo'
      try { groupName = await conn.getName(id) } catch { groupName = id }

      let eventCfg = {
        'add': { text: 'MEMBRO ENTRATO', icon: '📥', color: chalk.greenBright },
        'remove': { text: 'MEMBRO USCITO', icon: '📤', color: chalk.redBright },
        'promote': { text: 'NUOVO ADMIN', icon: '⭐', color: chalk.yellowBright },
        'demote': { text: 'ADMIN REVOCATO', icon: '🎖️', color: chalk.red }
      }[action] || { text: `EVENTO: ${action.toUpperCase()}`, icon: '⚙️', color: chalk.white }

      console.log(chalk.cyanBright(`╭───〔 ${chalk.bold(time)} 〕───┈`))
      console.log(`${border} ${eventCfg.color.bold(eventCfg.icon + ' ' + eventCfg.text)}`)
      console.log(`${border} ${chalk.magenta('👥 GRUPPO:')} ${chalk.white(groupName)}`)
      console.log(`${border} ${chalk.grey('👤 UTENTI:')} ${chalk.white(participants.map(p => p.split('@')[0]).join(', '))}`)
      console.log(chalk.cyanBright('╰────────────────────────┈\n'))
      return
    }

    let sender = m.sender || m.key?.participant || m.key?.remoteJid || ''
    let displayNum = sender.split('@')[0] || 'Sconosciuto'
    let name = m.name || (conn.getName ? await conn.getName(sender) : displayNum)
    let chat = m.chat || m.key?.remoteJid || ''
    let isGroup = chat.endsWith('@g.us')
    let chatName = isGroup ? await conn.getName(chat).catch(() => 'Gruppo') : ''

    const mtype = m.mtype || 'unknown'
    const messageContent = m.text || ""
    const isCommand = (messageContent && /^[./!#]/.test(messageContent)) || false
    
    let typeDisplay = mtype.replace('Message', '').toUpperCase()
    let mainColor = isCommand ? chalk.yellowBright : chalk.white
    let accentColor = isCommand ? chalk.redBright : chalk.greenBright
    
    if (mtype === 'protocolMessage' || mtype === 'senderKeyDistributionMessage') return

    console.log(chalk.magentaBright(`╭───〔 ${chalk.bold(time)} 〕───┈`))
    console.log(`${border} ${chalk.blueBright.bold('✉️  ' + typeDisplay)} ${chalk.grey('da:')} ${accentColor.bold(name)} ${chalk.grey('(@' + displayNum + ')')}`)
    
    if (isGroup) {
      console.log(`${border} ${chalk.yellow('👥')} ${chalk.yellow.bold(chatName)}`)
    } else {
      console.log(`${border} ${chalk.cyan('👤 PRIVATA')}`)
    }

    if (messageContent) {
      console.log(chalk.grey('├─┈'))
      const lines = messageContent.split('\n')
      lines.forEach((line, index) => {
        const icon = isCommand ? chalk.red('⚡') : chalk.blue('💬')
        console.log(`${border} ${index === lines.length - 1 ? icon : chalk.grey('┇')} ${mainColor(line)}`)
      })
    } else {
      console.log(`${border} ${chalk.italic.grey('📎 [Media o Messaggio Vuoto]')}`)
    }
    
    console.log(chalk.magentaBright('╰────────────────────────┈\n'))
  } catch (e) {
    console.log(chalk.red(`[Errore Logger]: ${e.message}`))
  }
}