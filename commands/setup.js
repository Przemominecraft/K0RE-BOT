const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Ustawia panel ticketów na kanale')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Tylko dla admina
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 SYSTEM TICKETÓW | K0RE SHOP')
            .setDescription('Kliknij przycisk poniżej, aby otworzyć ticket i skontaktować się z administracją.\n\n**Kategorie:**\n• Zakup kont\n• Zapytanie techniczne\n• Współpraca')
            .setColor(3447003) // Niebieski
            .setFooter({ text: 'K0re shop • Czas odpowiedzi: do 24h' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('Otwórz Ticket')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ content: 'Panel ticketów został wysłany!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};
