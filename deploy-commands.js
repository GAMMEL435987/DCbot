require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Riot ID")
    .addStringOption(opt =>
      opt.setName("riotid")
        .setDescription("Name#TAG")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show your linked Riot ID"),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your current Valorant rank"),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show your Valorant stats"),

  new SlashCommandBuilder()
    .setName("player")
    .setDescription("Check another player's rank")
    .addStringOption(opt =>
      opt.setName("riotid")
        .setDescription("Name#TAG")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show server Valorant rank leaderboard")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands("YOUR_CLIENT_ID_HERE"),
      { body: commands }
    );

    console.log("✅ Commands registered successfully");
  } catch (err) {
    console.error(err);
  }
})();