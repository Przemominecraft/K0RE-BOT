// OBSŁUGA PRZYCISKÓW (Otwieranie Ticketów pod konkretne kategorie)
    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
        // Ignoruj przyciski akcji wewnątrz ticketa
        if (interaction.customId === 'ticket_claim' || interaction.customId === 'ticket_close_modal') return handleTicketButtons(interaction);

        // Konfiguracja kategorii: Nazwa wyświetlana i przedrostek kanału
        const config = {
            'ticket_free_ac': { label: 'Darmowe AC', prefix: 'free' },
            'ticket_paid_ac': { label: 'Płatne AC', prefix: 'paid' },
            'ticket_other':   { label: 'Inne', prefix: 'inne' }
        };

        const selected = config[interaction.customId];
        if (!selected) return;

        // TWORZENIE KANAŁU z unikalną nazwą kategorii
        const channel = await interaction.guild.channels.create({
            name: `${selected.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { 
                    id: interaction.guild.id, 
                    deny: [PermissionFlagsBits.ViewChannel] 
                },
                { 
                    id: interaction.user.id, 
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] 
                },
                { 
                    id: STAFF_ROLE_ID, 
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] 
                },
            ],
        });

        const embed = new EmbedBuilder()
            .setTitle('🛡️ FragZone Support')
            .setDescription(`Witaj ${interaction.user}!\n\n**Wybrana kategoria:** ${selected.label}\n\n**Status:** ⏳ Oczekiwanie na staff...`)
            .setColor('#2ecc71')
            .setFooter({ text: `Otwarto: ${new Date().toLocaleTimeString()}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        // Wysłanie wiadomości w nowym kanale
        await channel.send({ content: `Powiadomienie: <@&${STAFF_ROLE_ID}> | Użytkownik: ${interaction.user}`, embeds: [embed], components: [row] });
        
        // Odpowiedź dla użytkownika (widoczna tylko dla niego)
        await interaction.reply({ content: `✅ Twój ticket został utworzony: ${channel}`, ephemeral: true });
    }
