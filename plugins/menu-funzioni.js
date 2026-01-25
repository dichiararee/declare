import fetch from 'node-fetch';

let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin }) => {
  const jid = m.chat;
  const userName = m.pushName || 'Utente';

  // 1. Recupero immagine del gruppo
  let groupPfp;
  try {
    groupPfp = await conn.profilePictureUrl(jid, 'image');
  } catch (e) {
    groupPfp = 'https://i.ibb.co/kVdFLyGL/sam.jpg'; 
  }

  // 2. Fake Contact Zexin-Bot
  const fkontak_zexin = {
    key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', fromMe: false, id: 'ZexinSystem' },
    message: {
      contactMessage: {
        displayName: `ZEXIN SYSTEM 🛡️`,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Zexin;;;\nFN:Zexin\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nEND:VCARD`
      }
    }
  };

  // --- MENU CAROSELLO (Senza Bottoni per stabilità totale) ---
  if (!args.length) {
    const adminFeatures = [
      { key: 'rileva', name: '📡 Monitoraggio', desc: 'Rileva eventi e modifiche nel gruppo.' },
      { key: 'welcome', name: '🍡 Benvenuto', desc: 'Invia un messaggio ai nuovi membri.' },
      { key: 'antilink', name: '🧧 Protezione Link', desc: 'Rimuove link di inviti esterni.' }
    ];

    const cards = adminFeatures.map(f => ({
      header: {
        imageMessage: groupPfp,
        hasVideoMessage: false,
      },
      body: { 
        text: `*MODULO:* ${f.name}\n*INFO:* ${f.desc}\n\n*Comando da scrivere:*\n\`${usedPrefix}attiva ${f.key}\`\n\`${usedPrefix}disattiva ${f.key}\`` 
      }
    }));

    const msg = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: `*PANNELLO ADMIN ZEXIN-BOT*\n\nCiao ${userName}, scorri le schede per vedere i comandi disponibili per gestire il gruppo.` },
            carouselMessage: {
              cards: cards
            },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: '120363303102327657@newsletter',
                newsletterName: 'Zexin Updates 🪷'
              }
            }
          }
        }
      }
    };

    return await conn.relayMessage(jid, msg, { quoted: fkontak_zexin });
  }

  // --- LOGICA DI ESECUZIONE (Rimasta invariata) ---
  let isEnable = /attiva|on|1/i.test(command);
  if (/disattiva|off|0/i.test(command)) isEnable = false;

  global.db.groups = global.db.groups || {};
  global.db.groups[jid] = global.db.groups[jid] || { rileva: false, welcome: true, antilink: true };
  let settings = global.db.groups[jid];

  const type = args[0].toLowerCase();
  if (!m.isGroup && !isOwner) return;
  if (m.isGroup && !isAdmin && !isOwner) return;

  let featureName = "";
  switch (type) {
    case 'rileva':
      settings.rileva = isEnable;
      featureName = 'MONITORAGGIO';
      break;
    case 'welcome':
      settings.welcome = isEnable;
      featureName = 'BENVENUTO';
      break;
    case 'antilink':
      settings.antilink = isEnable;
      featureName = 'ANTILINK';
      break;
    default:
      return;
  }

  let confText = `*CONFIGURAZIONE ZEXIN*\n\n` +
                 `*Modulo:* \`${featureName}\`\n` +
                 `*Stato:* ${isEnable ? '🟢 ATTIVATO' : '🔴 DISATTIVATO'}\n` +
                 `*Eseguito da:* @${m.sender.split('@')[0]}`;

  await conn.sendMessage(jid, { 
    text: confText, 
    mentions: [m.sender],
    contextInfo: {
        externalAdReply: {
            title: "ZEXIN UPDATE",
            body: "Impostazioni salvate",
            mediaType: 1,
            thumbnailUrl: groupPfp,
            renderLargerThumbnail: true
        }
    }
  }, { quoted: fkontak_zexin });
};

handler.help = ['funzioni', 'attiva', 'disattiva'];
handler.tags = ['admin'];
handler.command = ['funzioni', 'attiva', 'disattiva'];
handler.group = true;
handler.admin = true;

export default handler;