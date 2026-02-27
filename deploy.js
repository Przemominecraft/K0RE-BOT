const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🚀 Rozpoczynam odświeżanie komend Slash dla K0re SHOP...');
        
        await rest.put(
            // TWOJE NOWE APP ID
            Routes.applicationCommands('1476933815057518737'), 
            { body: commands },
        );

        console.log('✅ Sukces! Komendy zostały zarejestrowane w API Discorda.');
        console.log('💡 Jeśli ich nie widzisz, zrestartuj aplikację Discorda (Ctrl + R).');
    } catch (error) {
        console.error('❌ Błąd podczas rejestracji komend:', error);
    }
})();
