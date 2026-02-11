import chalk from 'chalk'
import PhoneNumber from 'awesome-phonenumber'

export default async function (m, conn = {}, isEvent = false) {
  try {
    let time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const border = chalk.grey('│')

    const toRaw = (id) => id ? id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : ''

    const safeGetName = async (id) => {
      try {
        return conn.getName ? await conn.getName(id) : id.split('@')[0]
      } catch {
        return id.split('@')[0]
      }
    }

    if (isEvent) {
      const { id, action } = m
      let groupName = await safeGetName(id)
      let eventCfg = {
        'add': { text: 'MEMBRO ENTRATO', icon: '📥', color: chalk.greenBright },
        'remove': { text: 'MEMBRO USCITO', icon: '📤', color: chalk.redBright },
        'promote': { text: 'NUOVO ADMIN', icon: '⭐', color: chalk.yellowBright },
        'demote': { text: 'ADMIN REVOCATO', icon: '🎖️', color: chalk.red }
      }[action] || { text: `EVENTO: ${action.toUpperCase()}`, icon: '⚙️', color: chalk.white }

      console.log(chalk.cyanBright(`╭───〔 ${chalk.bold(time)} 〕───┈`))
      console.log(`${border} ${eventCfg.color.bold(eventCfg.icon + ' ' + eventCfg.text)}`)
      console.log(`${border} ${chalk.magenta('👥 GRUPPO:')} ${chalk.white(groupName)}`)
      console.log(chalk.cyanBright('╰────────────────────────┈\n'))
      return
    }

    const botJid = conn.user?.id ? conn.decodeJid(conn.user.id) : ''
    const botRaw = toRaw(botJid)
    const senderJid = m.sender || ''
    const userRaw = toRaw(senderJid)
    
    const userRoleText = m.userRole || 'MEMBRO'
    const botRoleText = m.botRole || 'MEMBRO'

    const formatRole = (role) => {
      if (role === 'OWNER') return chalk.bgRed.white.bold(' OWNER ')
      if (role === 'ADMIN') return chalk.bgYellow.black.bold(' ADMIN ')
      return chalk.black.bgWhite(' MEMBRO ')
    }

    const formattedNum = new PhoneNumber('+' + userRaw).getNumber('international')
    const mtype = m.mtype || (m.message ? Object.keys(m.message)[0] : 'unknown')
    const messageContent = m.text || ''
    const isCommand = (messageContent && /^[\\@#&_\-+/?!*.&=]/.test(messageContent))
    const weight = Buffer.byteLength(JSON.stringify(m.message || {}), 'utf8') + ' B'

    console.log(chalk.blueBright(`╭───〔 ${chalk.bold(time)} 〕───┈`))
    console.log(`${border} ${chalk.grey('🤖 BOT:')} ${chalk.white(botRaw)} [${formatRole(botRoleText)}]`)
    console.log(`${border} ${chalk.grey('👤 DA :')} ${chalk.bold(m.pushName || userRaw)} (${chalk.white(formattedNum)}) | ${formatRole(userRoleText)}`)
    console.log(`${border} ${chalk.grey('🆔 JID:')} ${chalk.grey(senderJid)}`)
    
    if (m.senderLid && m.senderLid !== 'N/A') {
      console.log(`${border} ${chalk.grey('🆔 LID:')} ${chalk.grey(m.senderLid)}`)
    }
    
    console.log(`${border} ${chalk.grey('📍 CHAT :')} ${m.chat.endsWith('@g.us') ? chalk.yellow(await safeGetName(m.chat)) : chalk.cyan('PRIVATA')}`)
    console.log(`${border} ${chalk.grey('📦 TIPO:')} ${chalk.magenta(mtype.replace('Message', '').toUpperCase())} │ ${chalk.grey('PESO:')} ${chalk.green(weight)}`)

    if (m.quoted) {
      console.log(`${border} ${chalk.grey('↩️  RISPOSTA A:')} ${chalk.white(await safeGetName(m.quoted.sender))}`)
    }

    if (messageContent) {
      console.log(chalk.grey('├─┈'))
      messageContent.split('\n').forEach(line => {
        const icon = isCommand ? chalk.red('⚡') : chalk.blue('💬')
        console.log(`${border} ${icon} ${isCommand ? chalk.yellowBright(line) : chalk.white(line)}`)
      })
    }
    
    console.log(chalk.blueBright('╰────────────────────────┈\n'))

  } catch (e) {
    console.error(chalk.red(`[Print Error]:`), e)
  }
}