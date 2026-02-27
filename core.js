const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType 
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = '1465447308111118520'; 

// --- WPISZ TUTAJ SWOJE ID KATEGORII ---
const CAT_FREE = 'ID_KATEGORII_DARMOWE';
const CAT_PAID = 'ID_KATEGORII_PLATNE';
const CAT_OTHER = 'ID_KATEGORII_INNE';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

function getConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) return { staffRoles: [] };
    try {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return data.staffRoles ? data : { staffRoles: [] };
    } catch (e) { return { staffRoles: [] }; }
}

client.once('ready', async () => {
    console.log(`✅ K0re SHOP Bot Online!`);
    const SERWER_TAG = 'K0RE';
    try {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (guild) {
            const botMember = await guild.members.fetch(client.user.id);
            await botMember.setNickname(`${SERWER_TAG} ${client.user.username}`);
        }
    } catch (error) { console.log("⚠️ Błąd nicku:", error.message); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (command) try { await command.execute(interaction); } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    const config = getConfig();
    const staffRoles = config.staffRoles;
    const isStaff = interaction.member.roles.cache.some(role => staffRoles.includes(role.id)) || 
                    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (interaction.isButton() && interaction.customId.startsWith('t_')) {
        const key = interaction.customId.replace('t_', '');
        const modal = new ModalBuilder().setCustomId(`modal_open_${key}`).setTitle('K0re SHOP - Zgłoszenie');
        const input = new TextInputBuilder().setCustomId('user_input').setRequired(true);

        if (key === 'free') {
            input.setLabel("Dlaczego chcesz darmowe konto?").setPlaceholder("Wpisz krótki powód...").setStyle(TextInputStyle.Short);
        } else if (key === 'paid') {
            input.setLabel("Co chcesz kupić?").setPlaceholder("np. Konto 2022 / Pakiet 8 sztuk").setStyle(TextInputStyle.Short);
        } else {
            input.setLabel("W czym możemy pomóc?").setStyle(TextInputStyle.Paragraph);
        }

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_open_')) {
        const key = interaction.customId.replace('modal_open_', '');
        const userInput = interaction.fields.getTextInputValue('user_input');
        
        const CATEGORIES = {
            free: { label: 'Darmowe acc', prefix: 'free', catId: CAT_FREE },
            paid: { label: 'Płatne acc', prefix: 'shop', catId: CAT_PAID },
            other: { label: 'Inne', prefix: 'inne', catId: CAT_OTHER }
        };
        const cat = CATEGORIES[key];

        const overwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ];
        staffRoles.forEach(id => {
            overwrites.push({ id: id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] });
        });

        const channel = await interaction.guild.channels.create({
            name: `${cat.prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: cat.catId,
            permissionOverwrites: overwrites,
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`❄️ K0re SHOP - ${cat.label}`)
            .setDescription(`Witaj ${interaction.user}!\n\n**Twoja wiadomość:**\n${userInput}\n\n**Status:** ⏳ Oczekiwanie na obsługę...`)
            .setColor('#3498db')
            .setFooter({ text: 'Płatność tylko PSC | Brak zwrotów' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Przejmij').setEmoji('📜').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@&${staffRoles[0] || ''}>`, embeds: [welcomeEmbed], components: [row] });
        await interaction.reply({ content: `✅ Ticket otwarty: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'claim') {
        if (!isStaff) return interaction.reply({ content: "❌ Tylko administracja!", ephemeral: true });
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setDescription(interaction.message.embeds[0].description.replace('⏳ Oczekiwanie na obsługę...', `✅ Obsługiwane przez: **${interaction.user.username}**`))
            .setColor('#2ecc71');
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claimed').setLabel('W trakcie...').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('close_req').setLabel('Zamknij').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );
        await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });
    }

    if (interaction.isButton() && interaction.customId === 'close_req') {
        if (!isStaff) return interaction.reply({ content: "❌ Brak uprawnień.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId('modal_close').setTitle('Zamykanie Ticketu');
        const input = new TextInputBuilder().setCustomId('reason').setLabel("Powód zamknięcia:").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_close') {
        await interaction.reply("✅ Zamykanie za 5 sekund...");
        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
    }
});

client.login(TOKEN);
