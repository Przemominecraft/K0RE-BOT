require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// 1. KONFIGURACJA
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID; // Dodaj to ID na Railway!

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// 2. ŁADOWANIE KOMEND Z FOLDERU /commands
client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        }
    }
}

// 3. REJESTRACJA KOMEND SLASH
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('🚀 Odświeżanie komend slash...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('✅ Komendy zarejestrowane!');
    } catch (error) {
        console.error('❌ Błąd rejestracji:', error);
    }
})();

// 4. EVENT: START BOTA
client.once('clientReady', (c) => {
    console.log(`✅ K0re SHOP Bot Online! Zalogowano jako: ${c.user.tag}`);
});

// 5. OBSŁUGA INTERAKCJI (Komendy + Przyciski + Modale)
client.on('interactionCreate', async interaction => {
    
    // OBSŁUGA KOMEND SLASH
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Błąd komendy!', ephemeral: true });
        }
    }

    // OBSŁUGA PRZYCISKÓW (Otwieranie Ticketów)
    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
        if (interaction.customId === 'ticket_claim' || interaction.customId === 'ticket_close_modal') return handleTicketButtons(interaction);

        const categoryNames = {
            'ticket_free_ac': 'Darmowe AC',
            'ticket_paid_ac': 'Płatne AC',
            'ticket_other': 'Inne'
        };
        const category = categoryNames[interaction.customId] || 'Ticket';

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ],
        });

        const embed = new EmbedBuilder()
            .setTitle('🛡️ FragZone Support')
            .setDescription(`Witaj ${interaction.user}!\n\n**Wybrana kategoria:** ${category}\n\n**Status:** ⏳ Oczekiwanie na staff...`)
            .setColor('#2ecc71')
            .setFooter({ text: `Otwarto: ${new Date().toLocaleTimeString()}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Otwarto ticket: ${channel}`, ephemeral: true });
    }

    // OBSŁUGA PRZYCISKÓW (Przejmij / Zamknij)
    async function handleTicketButtons(interaction) {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: 'Nie masz uprawnień!', ephemeral: true });
        }

        if (interaction.customId === 'ticket_claim') {
            await interaction.reply({ content: `✅ Ticket przejęty przez: ${interaction.user}` });
        }

        if (interaction.customId === 'ticket_close_modal') {
            const modal = new ModalBuilder().setCustomId('modal_close_reason').setTitle('Zamykanie Ticketa');
            const reasonInput = new TextInputBuilder()
                .setCustomId('close_reason')
                .setLabel("Podaj powód zamknięcia")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await interaction.showModal(modal);
        }
    }

    // OBSŁUGA MODALA (Powód zamknięcia + PV)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_close_reason') {
        const reason = interaction.fields.getTextInputValue('close_reason');
        
        const closeEmbed = new EmbedBuilder()
            .setTitle('🎫 Twój Ticket został zamknięty')
            .addFields(
                { name: '👤 Przez', value: interaction.user.username },
                { name: '💬 Powód', value: `\`\`\`${reason}\`\`\`` }
            )
            .setColor('#e74c3c');

        // Próba wysłania PV do osoby z nazwy kanału (uproszczone)
        await interaction.reply('Zamykanie kanału za 5 sekund...');
        setTimeout(() => interaction.channel.delete(), 5000);
        
        // Możesz dodać logikę szukania usera po permissionOverwrites tutaj
    }
});

client.login(token);
