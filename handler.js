import { writeFileSync } from 'fs';
import print from './lib/print.js';
import { prima as antiPrivato } from './funzioni/owner/antiprivato.js'

function extractMessageText(message) {
    if (!message) return '';
    
    const mtype = Object.keys(message)[0];
    const msg = message[mtype];
    
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    
    if (message.buttonsResponseMessage?.selectedButtonId) {
        return message.buttonsResponseMessage.selectedButtonId;
    }
    
    if (message.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    
    if (message.templateButtonReplyMessage?.selectedId) {
        return message.templateButtonReplyMessage.selectedId;
    }
    
    if (message.interactiveResponseMessage) {
        const interactive = message.interactiveResponseMessage;
        
        if (interactive.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson);
                return params.id || params.text || params.name || "";
            } catch (e) {
                console.error('Errore parsing nativeFlowResponseMessage:', e);
            }
        }
        
        if (interactive.body) return interactive.body;
    }
    
    if (msg?.selectedId) return msg.selectedId;
    if (msg?.text) return msg.text;
    if (msg?.caption) return msg.caption;
    
    return '';
}

function extractMentions(message) {
    if (!message) return [];
    
    const mentions = [];
    const mtype = Object.keys(message)[0];
    const msg = message[mtype];
    
    if (msg?.contextInfo?.mentionedJid) {
        mentions.push(...msg.contextInfo.mentionedJid);
    }
    
    if (message.extendedTextMessage?.contextInfo?.mentionedJid) {
        mentions.push(...message.extendedTextMessage.contextInfo.mentionedJid);
    }
    
    return [...new Set(mentions)];
}

function extractQuotedMessage(conn, m) {
    const message = m.message;
    if (!message) return null;
    
    const mtype = Object.keys(message)[0];
    const msg = message[mtype];
    const contextInfo = msg?.contextInfo;
    
    if (!contextInfo?.quotedMessage) return null;
    
    const quotedMsg = contextInfo.quotedMessage;
    const quotedType = Object.keys(quotedMsg)[0];
    
    return {
        chat: m.key.remoteJid,
        sender: conn.decodeJid(contextInfo.participant || m.key.remoteJid),
        id: contextInfo.stanzaId,
        mtype: quotedType,
        msg: quotedMsg[quotedType],
        text: extractMessageText(quotedMsg),
        contextInfo: contextInfo,
        download: async () => {
            if (quotedMsg[quotedType]?.url) {
                return await conn.downloadMediaMessage({
                    key: { 
                        remoteJid: m.key.remoteJid,
                        id: contextInfo.stanzaId 
                    },
                    message: quotedMsg
                });
            }
            return null;
        }
    };
}

export default async function handler(conn, m) {
    try {
        if (!m.message) return;

        const jid = conn.decodeJid(m.key.remoteJid);
        const isGroup = jid.endsWith('@g.us');
        const sender = conn.decodeJid(m.key.participant || m.key.remoteJid);

        m.chat = jid;
        m.sender = sender;
        
        let rawMessage = m.message;
        
        if (rawMessage.messageContextInfo) {
            if (rawMessage.listResponseMessage) {
                rawMessage = { listResponseMessage: rawMessage.listResponseMessage };
            } else if (rawMessage.buttonsResponseMessage) {
                rawMessage = { buttonsResponseMessage: rawMessage.buttonsResponseMessage };
            }
        }
        
        m.message = rawMessage;
        m.mtype = Object.keys(rawMessage)[0];
        m.msg = rawMessage[m.mtype];

        m.text = extractMessageText(rawMessage);
        
        m.mentionedJid = extractMentions(rawMessage);
        
        m.quoted = extractQuotedMessage(conn, m);

        m.reply = async (text, chatId, options = {}) => {
            return await conn.sendMessage(
                chatId || m.chat, 
                { text: text, ...global.newsletter?.() }, 
                { quoted: m, ...options }
            );
        };

 
        global.db.data = global.db.data || { users: {}, groups: {}, chats: {}, settings: {} };
        const users = global.db.data.users;
        const groups = global.db.data.groups;

        const isOwner = global.owner.some(o => o[0] === sender.split('@')[0]);

        await antiPrivato.call(conn, m, { isOwner })
        
        if (!users[sender]) users[sender] = { messages: 0, warns: {} };
        users[sender].messages++;
        
        if (isGroup) {
            if (!groups[jid]) {
                groups[jid] = { messages: 0, rileva: false, welcome: true, antilink: true };
            }
            groups[jid].messages++;
        }

        writeFileSync('./database.json', JSON.stringify(global.db.data, null, 2));
        await print(m, conn);

        if (m.key.fromMe) return;

        const prefix = global.prefix instanceof RegExp ? 
            (global.prefix.test(m.text) ? m.text.match(global.prefix)[0] : '.') : 
            (global.prefix || '.');
            
        if (!m.text.startsWith(prefix)) return;

        const args = m.text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const fullText = args.join(' '); 
        
        const groupMetadata = isGroup ? await conn.groupMetadata(jid).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        
        const cleanId = (id) => id ? id.split('@')[0].split(':')[0] + '@' + id.split('@')[1] : '';
        const extractNum = (id) => id ? id.split('@')[0].split(':')[0] : '';

        const botJid = cleanId(conn.decodeJid(conn.user.id));
        const botLid = conn.user.lid ? cleanId(conn.user.lid) : botJid; 
        const senderJid = cleanId(sender);

        const findParticipant = (targetJid, targetLid = null) => {
            if (!isGroup) return {};
            const tJid = cleanId(targetJid);
            const tNum = extractNum(tJid);
            
            return participants.find(p => {
                const pJid = cleanId(conn.decodeJid(p.id));
                const pLid = p.lid ? cleanId(conn.decodeJid(p.lid)) : null;
                const pNum = extractNum(pJid);
                
                return pJid === tJid || 
                       (pLid && pLid === targetLid) || 
                       (targetLid && pJid === targetLid) ||
                       pNum === tNum;
            }) || {};
        };

        const user = findParticipant(senderJid);
        const bot = findParticipant(botJid, botLid);

        const isAdmin = (user && user.admin !== null && user.admin !== undefined) || isOwner;
        const isBotAdmin = (bot && bot.admin !== null && bot.admin !== undefined) || false;

        for (let name in global.plugins) {
            let plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;

            const isAccept = Array.isArray(plugin.command) ? 
                plugin.command.includes(command) : 
                (plugin.command instanceof RegExp ? plugin.command.test(command) : plugin.command === command);

            if (isAccept) {
                // Controlli permessi
                if (plugin.group && !isGroup) { 
                    global.dfail('group', m, conn); 
                    continue; 
                }
                if (plugin.admin && !isAdmin) { 
                    global.dfail('admin', m, conn);
                    continue; 
                }     
                if (plugin.botAdmin && !isBotAdmin) { 
                    global.dfail('botAdmin', m, conn); 
                    continue; 
                }  
                if (plugin.owner && !isOwner) { 
                    global.dfail('owner', m, conn); 
                    continue; 
                }

                try {
                    if (typeof plugin.call === 'function') {
                        await plugin.call(conn, m, {
                            conn, args, text: fullText, usedPrefix: prefix, command, isOwner, isAdmin, isBotAdmin, participants, groupMetadata
                        });
                    } else if (typeof plugin === 'function') {
                        await plugin(m, {
                            conn, args, text: fullText, usedPrefix: prefix, command, isOwner, isAdmin, isBotAdmin, participants, groupMetadata
                        });
                    }
                    writeFileSync('./database.json', JSON.stringify(global.db.data, null, 2));
                } catch (e) {
                    console.error(`Errore nel plugin ${name}:`, e);
                    m.reply(`❌ Si è verificato un errore nell'esecuzione del comando.`);
                }
                break;
            }
        }
    } catch (e) {
        console.error('Errore nel handler:', e);
    }
}