const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-set')
        .setDescription('Ustawia rolę administracyjną do obsługi ticketów')
        .addRoleOption(option => 
            option.setName('rola')
                .setDescription('Wybierz rolę staffu')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const rola = interaction.options.getRole('rola');
        
        // Tutaj w prawdziwym bocie zapisałbyś ID tej roli do bazy danych lub pliku json
        // Na razie bot po prostu potwierdzi wybór
        await interaction.reply({ 
            content: `✅ Rola **${rola.name}** została ustawiona jako Staff do ticketów!`, 
            ephemeral: true 
        });
    },
};
