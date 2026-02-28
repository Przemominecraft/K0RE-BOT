// Konfiguracja kategorii (ID, które podałeś)
const TICKET_CONFIG = {
    'ticket_free_ac': { 
        label: 'Darmowe AC', 
        prefix: 'free', 
        categoryId: '1476992445337178162' 
    },
    'ticket_paid_ac': { 
        label: 'Płatne AC', 
        prefix: 'paid', 
        categoryId: '1476992482259763392' 
    },
    'ticket_other': { 
        label: 'Inne', 
        prefix: 'inne', 
        categoryId: '1476992518108217385' 
    }
};

// Wewnątrz client.on('interactionCreate', async (interaction) => {
if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
    if (interaction.customId === 'ticket_claim' || interaction.customId === 'ticket_close_modal') return;

    const selected = TICKET_CONFIG[interaction.customId];
    if (!selected) return;

    // 1. Informujemy Discorda, że pracujemy (zapobiega błędowi "czynność nie powiodła się")
    await interaction.deferReply({ ephemeral: true });

    try {
        // 2. Tworzenie kanału w KONKRETNEJ kategorii
        const channel = await interaction.guild.channels.create({
            name: `${selected.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: selected.categoryId, // TU BOT WRZUCA TICKET DO KATEGORII
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ],
        });

        const embed = new EmbedBuilder()
            .setTitle('🛡️ K0re Support - Discord')
            .setDescription(`Witaj ${interaction.user}!\n\n**Kategoria:** ${selected.label}\n\n**Status:** ⏳ Oczekiwanie na administrację...`)
            .setColor('#2ecc71')
            .setFooter({ text: `K0re SHOP • ${new Date().toLocaleTimeString()}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close_modal').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@&${STAFF_ROLE_ID}> | Nowe zgłoszenie!`, embeds: [embed], components: [row] });
        
        // 3. Edytujemy odpowiedź tymczasową
        await interaction.editReply({ content: `✅ Twój ticket został utworzony: ${channel}` });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ Wystąpił błąd przy tworzeniu kanału. Sprawdź uprawnienia bota!' });
    }
}
