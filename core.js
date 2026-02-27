const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Wstaw tu ID roli staffu ustawionej przez /staff-set (lub na sztywno do testów)
const STAFF_ROLE_ID = 'TU_WSTAW_ID_ROLI_STAFF'; 

client.on('interactionCreate', async interaction => {
    // 1. OTWIERANIE TICKETA
    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
        const categoryName = interaction.customId.replace('ticket_', '').replace('_', ' ');
        
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const embed = new EmbedBuilder()
            .setTitle('🛡️ FragZone Support - Discord')
            .setDescription(`Witaj ${interaction.user}!\n\n**Opis problemu:**\nWybrano kategorię: ${categoryName}\n\n**Status:** ⏳ Oczekiwanie na administrację...`)
            .setColor('#2ecc71')
            .setFooter({ text: `Dziś o ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
        await interaction.reply({ content: `Otwarto ticket: ${channel}`, ephemeral: true });
    }

    // 2. PRZEJMOWANIE TICKETA
    if (interaction.isButton() && interaction.customId === 'ticket_claim') {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: 'Tylko staff może przejąć ticket!', ephemeral: true });
        }
        await interaction.reply({ content: `Ticket przejęty przez ${interaction.user} ✅` });
    }

    // 3. OKNO MODALNE (POWÓD ZAMKNIĘCIA)
    if (interaction.isButton() && interaction.customId === 'ticket_close_modal') {
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

    // 4. FINALNE ZAMKNIĘCIE I WIADOMOŚĆ PV
    if (interaction.isModalSubmit() && interaction.customId === 'modal_close_reason') {
        const reason = interaction.fields.getTextInputValue('close_reason');
        const topicOwner = interaction.channel.permissionOverwrites.cache.find(po => po.type === 1 && po.id !== STAFF_ROLE_ID);
        
        const closeEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Zamknięty - FragZone')
            .addFields(
                { name: '👤 Przez', value: interaction.user.username },
                { name: '💬 Powód', value: `\`\`\`${reason}\`\`\`` }
            )
            .setColor('#e74c3c');

        if (topicOwner) {
            const user = await client.users.fetch(topicOwner.id);
            await user.send({ embeds: [closeEmbed] }).catch(() => console.log("Nie można wysłać PV do użytkownika"));
        }

        await interaction.reply('Zamykanie kanału za 5 sekund...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});
