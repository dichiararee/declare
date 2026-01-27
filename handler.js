import { writeFileSync } from 'fs';
import print from './lib/print.js';

export default async function handler(conn, m) {
    try {
        if (!m.message) return;

        const jid = conn.decodeJid(m.key.remoteJid);
        const isGroup = jid.endsWith('@g.us');
        const sender = conn.decodeJid(m.key.participant || jid);

        m.chat = jid;
        m.sender = sender;
        
        m.mtype = Object.keys(m.message)[0];
        if (m.mtype === 'messageContextInfo') {
            m.message = m.message.listResponseMessage || m.message.buttonsResponseMessage || m.message;
            m.mtype = Object.keys(m.message)[0];
        }
        m.msg = m.message[m.mtype];

        let text = "";
        if (m.mtype === 'conversation') text = m.message.conversation;
        else if (m.mtype === 'extendedTextMessage') text = m.message.extendedTextMessage.text;
        else if (m.mtype === 'buttonsResponseMessage') text = m.message.buttonsResponseMessage.selectedButtonId;
        else if (m.mtype === 'listResponseMessage') text = m.message.listResponseMessage.singleSelectReply.selectedRowId;
        else if (m.mtype === 'templateButtonReplyMessage') text = m.message.templateButtonReplyMessage.selectedId;
        else if (m.mtype === 'interactiveResponseMessage') {
            const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                const params = JSON.parse(paramsJson);
                text = params.id || params.text || "";
            }
        } else if (m.msg?.selectedId) text = m.msg.selectedId;
        else if (m.msg?.text) text = m.msg.text;

        m.text = text || "";
        m.reply = (text, chatId, options) => conn.sendMessage(chatId || m.chat, { text: text, ...global.newsletter() }, { quoted: m, ...options });

        global.db.data = global.db.data || { users: {}, groups: {}, chats: {}, settings: {} };
        const users = global.db.data.users;
        const groups = global.db.data.groups;

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

        const prefix = global.prefix instanceof RegExp ? (global.prefix.test(m.text) ? m.text.match(global.prefix)[0] : '.') : (global.prefix || '.');
        if (!m.text.startsWith(prefix)) return;

        const args = m.text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const fullText = args.join(' '); 

        const isOwner = global.owner.some(o => o[0] === sender.split('@')[0]);
        
        const groupMetadata = isGroup ? await conn.groupMetadata(jid, true).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        
        const botJid = conn.decodeJid(conn.user.id); 
        const senderJid = conn.decodeJid(sender);

        const user = isGroup ? participants.find(u => 
            conn.decodeJid(u.id) === senderJid || 
            (u.jid && conn.decodeJid(u.jid) === senderJid)
        ) : {};

        const bot = isGroup ? participants.find(u => 
            conn.decodeJid(u.id) === botJid || 
            (u.jid && conn.decodeJid(u.jid) === botJid)
        ) : {};

        const isAdmin = (user && user.admin !== null) || isOwner;
        const isBotAdmin = (bot && bot.admin !== null) || false;

        for (let name in global.plugins) {
            let plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;

            const isAccept = Array.isArray(plugin.command) ? 
                plugin.command.includes(command) : 
                (plugin.command instanceof RegExp ? plugin.command.test(command) : plugin.command === command);

            if (isAccept) {
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
                    await plugin.call(conn, m, {
                        conn, args, text: fullText, usedPrefix: prefix, command, isOwner, isAdmin, isBotAdmin, participants, groupMetadata
                    });
                    writeFileSync('./database.json', JSON.stringify(global.db.data, null, 2));
                } catch (e) {
                    console.error(e);
                }
                break;
            }
        }
    } catch (e) {
        console.error(e);
    }
}