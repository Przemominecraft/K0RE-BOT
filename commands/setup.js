const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Wysyła profesjonalny panel ticketów K0re SHOP')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('❄️ CENTRUM POMOCY K0RE SHOP')
            .setAuthor({ name: 'Kupna i Wsparcie Techniczne' })
            .setDescription(
                'Witaj w oficjalnym systemie wsparcia **K0re SHOP**! 🛡️\n\n' +
                'Jeśli chcesz coś kupić lub potrzebujesz pomocy, wybierz odpowiednią kategorię poniżej. ' +
                'Zostanie utworzony **prywatny kanał**, w którym nasi administratorzy Ci pomogą.\n\n' +
                '📌 **Zasady zgłoszeń:**\n' +
                '• Przygotuj screeny dowodów wpłat (jeśli dotyczy).\n' +
                '• Opisz swój problem w pierwszej wiadomości.\n' +
                '• Prosimy o cierpliwość – odpowiemy najszybciej jak to możliwe! ✅'
            )
            .setColor('#3498db') // Niebieski pod klimat K0re
            .setFooter({ text: 'K0re Support • Działamy dla społeczności', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_free_ac')
                    .setLabel('Darmowe AC')
                    .setEmoji('🎁')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('ticket_paid_ac')
                    .setLabel('Płatne AC')
                    .setEmoji('💸')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_other')
                    .setLabel('Inne')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Danger),
            );

        await interaction.reply({ content: 'Panel K0re SHOP został wysłany!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};
