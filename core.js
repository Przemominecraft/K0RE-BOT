require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    Collection, 
    ChannelType, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// 1. KONFIGURACJA
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

// Konfiguracja kategorii ticketów
const TICKET_CONFIG = {
    'ticket_free_ac': { label: 'Darmowe AC', prefix: 'free', categoryId: '1476992445337178162' },
    'ticket_paid_ac': { label: 'Płatne AC', prefix: 'paid', categoryId: '1476992482259763392' },
    'ticket_other':   { label: 'Inne', prefix: 'inne', categoryId: '1476992518108217385' }
};

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

// 5. OBSŁUGA INTERAKCJI
client.on('interactionCreate', async (interaction) => {
    
    // --- KOMENDY SLASH ---
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Błąd podczas wykonywania komendy!', ephemeral: true });
        }
    }

    // --- PRZYCISKI ---
    if (interaction.isButton()) {
        
        // A. OTWIERANIE TICKETA
        if (TICKET_CONFIG[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });
            const selected = TICKET_CONFIG[interaction.customId];

            try {
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
                    .setTitle('🛡️ K0re Support - Discord')
                    .setDescription(`Witaj ${interaction.user}!\n\n**Wybrana kategoria:**\n${selected.label}\n\n**Status:** ⏳ Oczekiwanie na administrację...`)
                    .setColor('#2ecc71')
                    .setFooter({ text: `K0re SHOP • Dziś o ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: `<@&${STAFF_ROLE_ID}> | Nowy ticket!`, embeds: [embed], components: [row] });
                await interaction.editReply({ content: `✅ Twój ticket został utworzony: ${channel}` });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Błąd podczas tworzenia kanału. Sprawdź uprawnienia bota!' });
            }
        }

        // B. PRZEJMOWANIE TICKETA
        if (interaction.customId === 'ticket_claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: 'Tylko staff może przejąć ticket!', ephemeral: true });
            }
            await interaction.reply({ content: `✅ Ticket przejęty przez: ${interaction.user}` });
        }

        // C. OTWIERANIE OKNA ZAMYKANIA (MODAL)
        if (interaction.customId === 'ticket_close_modal') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: 'Tylko staff może zamknąć ticket!', ephemeral: true });
            }
            
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

    // --- OBSŁUGA MODALA (Finalne zamknięcie + PV) ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_close_reason') {
        const reason = interaction.fields.getTextInputValue('close_reason');
        const channelName = interaction.channel.name;

        // Szukamy właściciela ticketa w uprawnieniach kanału
        const ticketOwnerEntry = interaction.channel.permissionOverwrites.cache.find(
            overwrite => overwrite.type === 1 && overwrite.id !== interaction.guild.id && !interaction.member.roles.cache.has(overwrite.id)
        );

        const closeEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Zamknięty - K0re SHOP')
            .setDescription(`Twój ticket o nazwie \`${channelName}\` został zakończony.`)
            .addFields(
                { name: '👤 Zamknięty przez:', value: `${interaction.user.tag}`, inline: true },
                { name: '💬 Powód:', value: `\`\`\`${reason}\`\`\`` }
            )
            .setColor('#e74c3c')
            .setTimestamp()
            .setFooter({ text: 'Dziękujemy za skorzystanie z K0re SHOP!' });

        // Wysyłka na PV
        if (ticketOwnerEntry) {
            try {
                const user = await client.users.fetch(ticketOwnerEntry.id);
                await user.send({ embeds: [closeEmbed] });
            } catch (err) {
                console.log('Nie można wysłać PV (blokada DM).');
            }
        }

        await interaction.reply({ content: `✅ Ticket zamknięty. Kanał zostanie usunięty za 5 sekund...` });
        
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(token);
