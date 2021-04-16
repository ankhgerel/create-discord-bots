const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require('fs');
const ascii = require('ascii-table');
const table = new ascii().setHeading('Command', 'Load Status');
require('dotenv').config();

client.on("ready", () => {
    console.log(`${client.user.tag} 봇에 로그인 하였습니다!`);
});
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()

client.devs = [''] //자신의 ID
client.category = ['bot', 'owner']


fs.readdir('./commands/', (err, list) => {
    for (let file of list) {
        try {
            let pull = require(`./commands/${file}`);
            if (pull.name && pull.run && pull.aliases) {
                table.addRow(file, '✅');
                for (let alias of pull.aliases) {
                    client.aliases.set(alias, pull.name);
                }
                client.commands.set(pull.name, pull);
            } else {
                table.addRow(file, '❌ -> Error');
                continue;
            }
        } catch (e) { 
            table.addRow(file, `❌ -> ${e}`); 
            continue;
        }
    }
    console.log(table.toString());
});
const prefix = process.env.PREFIX
client.on('message', async message => {
	
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    let args = message.content.substr(prefix.length).trim().split(' ');
    if (client.commands.get(args[0])) {
        client.commands.get(args[0]).run(client, message, args);
    } else if (client.aliases.get(args[0])) {
        client.commands.get(client.aliases.get(args[0])).run(client, message, args);
    } else {
        let s = 0;
        let sname = undefined;
        let typed = args[0];
        let valids = [];
        for (let x of client.commands.array()) {
            for (let y of x.aliases) {
                valids.push(y);
            }
            valids.push(x.name);
        }
        for (let curr of valids) {
            let cnt = 0;
            let i = 0;
            for (let curlet of curr.split('')) {
                if (curlet[i] && typed.split('')[i] && curlet[i] == typed.split('')[i]) {
                    cnt++;
                }
                i++;
            }
            if (cnt > s) {
                s = cnt;
                sname = curr;
            }
        }
    }

});

client.login(process.env.TOKEN)