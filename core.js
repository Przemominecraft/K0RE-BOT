const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// 1. DEFINICJA KOMEND
const commands = [
    {
        name: 'cennik',
        description: 'Wyświetla aktualny cennik K0RE SHOP',
    },
    {
        name: 'status',
        description: 'Sprawdza czy bot działa poprawnie',
    }
];

// 2. REJESTRACJA KOMEND (Slash Commands)
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('🚀 Rozpoczynam odświeżanie komend slash...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log('✅ Komendy zarejestrowane globalnie!');
    } catch (error) {
        console.error('❌ Błąd rejestracji:', error);
    }
})();

// 3. EVENTY
client.once('clientReady', (c) => {
    console.log(`✅ K0re SHOP Bot Online! Zalogowano jako: ${c.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'cennik') {
        const embed = new EmbedBuilder()
            .setTitle('❄️ K0RE SHOP | AKTUALNY CENNIK')
            .setDescription('Najlepsza jakość kont na rynku.\nPłatność: **PSC (PLN)**.')
            .setColor(3447003) // Niebieski
            .addFields(
                { name: '⚡ FRESH ACCOUNTS', value: '• 1 sztuka: 5 PLN\n• Pakiet 8 szt.: 20 PLN', inline: true },
                { name: '✨ PREMIUM SETUP', value: '• Konto + Serwer: 50 PLN', inline: true }
            )
            .setFooter({ text: 'K0re shop • Zaufany dostawca' });

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'status') {
        await interaction.reply('✅ Bot śmiga aż miło!');
    }
});

client.login(token);
