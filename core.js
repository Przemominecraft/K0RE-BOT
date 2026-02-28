require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID; // Pamiętaj dodać to na Railway!

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// TWOJE KATEGORIE
const TICKET_CONFIG = {
    'ticket_free_ac': { label: 'Darmowe AC', prefix: 'free', categoryId: '1476992445337178162' },
    'ticket_paid_ac': { label: 'Płatne AC', prefix: 'paid', categoryId: '1476992482259763392' },
    'ticket_other':   { label: 'Inne', prefix: 'inne', categoryId: '1476992518108217385' }
};

// Ładowanie komend
client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

// Rejestracja slashy
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('✅ Komendy zarejestrowane!');
    } catch (e) { console.error(e); }
})();

client.once('clientReady', (c) => console.log(`✅ Zalogowano: ${c.user.tag}`));

// GŁÓWNA FUNKCJA (Musi mieć async!)
client.on('interactionCreate', async (interaction) => {
    
    // 1. KOMENDY SLASH
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
    }

    // 2. PRZYCISKI
    if (interaction.isButton()) {
        
        // Kliknięcie w panelu setup (otwieranie)
        if (TICKET_CONFIG[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = TICKET_CONFIG[interaction.customId];

            const channel = await interaction.guild.channels.create({
                name: `${selected.prefix}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: selected.categoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle('🛡️ K0re Support')
                .setDescription(`Witaj ${interaction.user}!\nKategoria: **${selected.label}**\n\nCzekaj na reakcję staffu.`)
                .setColor('#2ecc71');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [row] });
            await interaction.editReply(`Otwarto ticket: ${channel}`);
        }

        // Przyciski wewnątrz ticketa
        if (interaction.customId === 'ticket_claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: 'Brak uprawnień!', ephemeral: true });
            await interaction.reply(`✅ Ticket przejęty przez: ${interaction.user}`);
        }

        if (interaction.customId === 'ticket_close_modal') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: 'Brak uprawnień!', ephemeral: true });
            const modal = new ModalBuilder().setCustomId('modal_close').setTitle('Zamykanie');
            const input = new TextInputBuilder().setCustomId('reason').setLabel("Powód").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }

    // 3. MODAL (Zamykanie)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_close') {
        const reason = interaction.fields.getTextInputValue('reason');
        await interaction.reply('Zamykanie za 5 sekund...');
        setTimeout(() => interaction.channel.delete(), 5000);
        // Tutaj można dodać wysyłanie PV do użytkownika
    }
});

client.login(token);
