const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Wysyła profesjonalny panel ticketów K0re SHOP'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('❄️ CENTRUM POMOCY K0RE SHOP')
            .setDescription(
                'Witaj w oficjalnym systemie wsparcia **K0re SHOP**! 🧊\n\n' +
                'Wybierz odpowiednią kategorię poniżej, aby otworzyć ticket.\n\n' +
                '📌 **Informacje:**\n' +
                '• **Płatne acc:** Przygotuj kod PSC (PLN).\n' +
                '• **Brak zwrotów:** Kupując u nas, akceptujesz tę zasadę.\n' +
                '• **Cierpliwość:** Każda sprawa zostanie rozpatrzona! ✅'
            )
            .setColor('#3498db')
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: 'K0re SHOP • Najlepsze konta na rynku' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_free').setLabel('Darmowe acc').setEmoji('🎁').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('t_paid').setLabel('Płatne acc').setEmoji('💎').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('t_other').setLabel('Inne').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel wysłany!', ephemeral: true });
    },
};
