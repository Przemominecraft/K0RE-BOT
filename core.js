require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// 1. USTAWIENIA
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// 2. ŁADOWANIE KOMEND
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

// 3. REJESTRACJA SLASH COMMANDS
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('🚀 Odświeżanie komend...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('✅ Komendy zarejestrowane!');
    } catch (error) {
        console.error('❌ Błąd rejestracji:', error);
    }
})();

client.once('clientReady', (c) => {
    console.log(`✅ K0re SHOP Online! Zalogowano jako: ${c.user.tag}`);
});

// 4. GŁÓWNA OBSŁUGA INTERAKCJI (Async!)
client.on('interactionCreate', async (interaction) => {
    
    // OBSŁUGA KOMEND SLASH
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Błąd podczas komendy!', ephemeral: true });
        }
    }

    // OBSŁUGA PRZYCISKÓW
    if (interaction.isButton()) {
        
        // A. OTWIERANIE TICKETA
        if (interaction.customId.startsWith('ticket_') && 
            interaction.customId !== 'ticket_claim' && 
            interaction.customId !== 'ticket_close_modal') {

            const config = {
                'ticket_free_ac': { label: 'Darmowe AC', prefix: 'free' },
                'ticket_paid_ac': { label: 'Płatne AC', prefix: 'paid' },
                'ticket_other':   { label: 'Inne', prefix: 'inne' }
            };

            const selected = config[interaction.customId];
            if (!selected) return;

            // Tworzenie kanału
            const channel = await interaction.guild.channels.create({
                name: `${selected.prefix}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle('🛡️ FragZone Support')
                .setDescription(`Witaj ${interaction.user}!\n\n**Kategoria:** ${selected.label}\n\n**Status:** ⏳ Czekamy na staff...`)
                .setColor('#2ecc71');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [row] });
            await interaction.reply({ content: `Otwarto ticket: ${channel}`, ephemeral: true });
        }

        // B. PRZEJMOWANIE TICKETA
        if (interaction.customId === 'ticket_claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: 'Brak uprawnień!', ephemeral: true });
            await interaction.reply({ content: `✅ Ticket przejęty przez: ${interaction.user}` });
        }

        // C. MODAL ZAMYKANIA
        if (interaction.customId === 'ticket_close_modal') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: 'Brak uprawnień!', ephemeral: true });
            
            const modal = new ModalBuilder().setCustomId('modal_close_reason').setTitle('Zamykanie Ticketa');
            const reasonInput = new TextInputBuilder()
                .setCustomId('close_reason')
                .setLabel("Powód zamknięcia")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await interaction.showModal(modal);
        }
    }

    // OBSŁUGA MODALA (Finalne zamknięcie + PV)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_close_reason') {
        const reason = interaction.fields.getTextInputValue('close_reason');
        
        const closeEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Zamknięty')
            .addFields(
                { name: '👤 Przez', value: interaction.user.username },
                { name: '💬 Powód', value: `\`\`\`${reason}\`\`\`` }
            )
            .setColor('#e74c3c');

        // Próba wysłania PV do osoby (wyciągamy z nazwy kanału lub uprawnień)
        const channelName = interaction.channel.name;
        await interaction.reply('Zamykanie kanału za 5 sekund...');
        
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

client.login(token);
