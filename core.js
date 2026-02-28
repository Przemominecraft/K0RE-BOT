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

// 1. USTAWIENIA (Pamiętaj o Variables na Railway!)
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

// Konfiguracja Twoich kategorii
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
        const command = require(path.join(commandsPath, file));
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
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('✅ Komendy zarejestrowane!');
    } catch (error) {
        console.error('❌ Błąd rejestracji:', error);
    }
})();

client.once('clientReady', (c) => {
    console.log(`✅ K0re SHOP Bot Online! Zalogowano jako: ${c.user.tag}`);
});

// 4. OBSŁUGA INTERAKCJI
client.on('interactionCreate', async (interaction) => {
    
    // --- KOMENDY SLASH ---
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction).catch(console.error);
    }

    // --- PRZYCISKI ---
    if (interaction.isButton()) {
        
        // A. OTWIERANIE TICKETA (Z BLOKADĄ DO 1 SZTUKI)
        if (TICKET_CONFIG[interaction.customId]) {
            await interaction.deferReply({ ephemeral: true });

            // Sprawdzanie czy użytkownik ma już otwarty kanał z jednym z przedrostków
            const existingTicket = interaction.guild.channels.cache.find(ch => 
                ch.name.includes(interaction.user.username.toLowerCase()) && 
                Object.values(TICKET_CONFIG).some(cfg => ch.name.startsWith(cfg.prefix))
            );

            if (existingTicket) {
                return interaction.editReply({ content: `❌ Masz już otwarty ticket! Przejdź tutaj: ${existingTicket}` });
            }

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
                    .setFooter({ text: `K0re SHOP • ${new Date().toLocaleTimeString()}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: `<@&${STAFF_ROLE_ID}> | Nowy ticket!`, embeds: [embed], components: [row] });
                await interaction.editReply({ content: `✅ Twój ticket został utworzony: ${channel}` });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Błąd tworzenia kanału. Sprawdź uprawnienia bota!' });
            }
        }

        // B. PRZEJMOWANIE TICKETA
        if (interaction.customId === 'ticket_claim') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: 'Tylko staff może przejąć ticket!', ephemeral: true });
            }
            await interaction.reply({ content: `✅ Ticket przejęty przez: ${interaction.user}` });
        }

        // C. OKNO ZAMYKANIA
        if (interaction.customId === 'ticket_close_modal') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: 'Tylko staff może zamknąć ticket!', ephemeral: true });
            }
            const modal = new ModalBuilder().setCustomId('modal_close_reason').setTitle('Zamykanie Ticketa');
            const reasonInput = new TextInputBuilder().setCustomId('close_reason').setLabel("Podaj powód").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await interaction.showModal(modal);
        }
    }

    // --- OBSŁUGA MODALA (Zamykanie + PV) ---
    if (interaction.isModalSubmit() && interaction.customId === 'modal_close_reason') {
        const reason = interaction.fields.getTextInputValue('close_reason');
        const channelName = interaction.channel.name;

        // Szukanie właściciela ticketa
        const ticketOwnerEntry = interaction.channel.permissionOverwrites.cache.find(
            ov => ov.type === 1 && ov.id !== interaction.guild.id && !interaction.member.roles.cache.has(ov.id)
        );

        const closeEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Zamknięty - K0re SHOP')
            .setDescription(`Twój ticket \`${channelName}\` został zakończony.`)
            .addFields(
                { name: '👤 Przez:', value: `${interaction.user.tag}`, inline: true },
                { name: '💬 Powód:', value: `\`\`\`${reason}\`\`\`` }
            )
            .setColor('#e74c3c')
            .setTimestamp();

        if (ticketOwnerEntry) {
            try {
                const user = await client.users.fetch(ticketOwnerEntry.id);
                await user.send({ embeds: [closeEmbed] });
            } catch (err) { console.log('Błąd wysyłki PV (blokada DM).'); }
        }

        await interaction.reply({ content: `✅ Ticket zamknięty. Kanał zniknie za 5 sekund...` });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(token);
