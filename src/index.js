require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ---------------- CONFIG ---------------- */

const CLIENT_ID = "1425219882857005118";
const NOTIFY_CHANNEL_ID = "1256688828165394432";
const CACHE_TTL = 5 * 60 * 1000;

/* ---------------- MAP DATA ---------------- */

const mapImages = {
  ancient: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_ancient_radar.jpg/public"
  ],
  anubis: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_anubis_radar.jpg/public"
  ],
  cache: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_cache_radar.jpg/public"
  ],
  dust2: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_dust2_radar.jpg/public"
  ],
  inferno: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_inferno_radar.jpg/public"
  ],
  mirage: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_mirage_radar.jpg/public"
  ],
  nuke: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_nuke_radar.jpg/public"
  ],
  overpass: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_overpass_radar.jpg/public"
  ],
  train: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/NEW-de_train_radar_psd.png/public"
  ],
  vertigo: [
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_vertigoUP_radar.jpg/public",
    "https://refrag.gg/cdn-cgi/imagedelivery/5wML_ikJr-qv52ESeLE6CQ/wordpress.refrag.gg/2023/12/de_vertigoDown__radar.jpg/public"
  ]
};

/* ---------------- RANK MAP ---------------- */

const rankScore = {
  Iron: 1,
  Bronze: 2,
  Silver: 3,
  Gold: 4,
  Platinum: 5,
  Diamond: 6,
  Ascendant: 7,
  Immortal: 8,
  Radiant: 9
};

/* ---------------- ROLE MAP ---------------- */

const rankRoles = {
  Iron: "1493178517632974918",
  Bronze: "1493178996488405213",
  Silver: "1493179165212545094",
  Gold: "1493179278991294464",
  Platinum: "1493179323736391800",
  Diamond: "1493179479705780276",
  Ascendant: "1493179591261556864",
  Immortal: "1493179654457004062",
  Radiant: "1493179689819177082"
};

/* ---------------- DATA ---------------- */

const DATA_FILE = "./data.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ---------------- CACHE ---------------- */

const cache = new Map();

/* ---------------- HENRIK API ---------------- */

async function fetchMMR(riotId) {
  const [name, tag] = riotId.split("#");

  const url = `https://api.henrikdev.xyz/valorant/v1/mmr/eu/${name}/${tag}`;

  const res = await axios.get(url, {
    headers: { Authorization: process.env.HENRIK_API_KEY }
  });

  return res.data.data;
}

async function fetchMatches(riotId) {
  const [name, tag] = riotId.split("#");

  const url = `https://api.henrikdev.xyz/valorant/v3/matches/eu/${name}/${tag}?filter=competitive`;

  const res = await axios.get(url, {
    headers: { Authorization: process.env.HENRIK_API_KEY }
  });

  return res.data.data;
}

/* ---------------- MATCH PARSER ---------------- */

function extractMatchStats(matches, riotId) {
  const [name, tag] = riotId.split("#");

  let kills = 0, deaths = 0, assists = 0, wins = 0, losses = 0;
  const agentCount = {};

  if (!matches) {
    return { kills: 0, deaths: 0, assists: 0, kd: 0, wins: 0, losses: 0, favoriteAgent: "Unknown" };
  }

  for (const match of matches) {
    const players = match.players?.all_players || [];

    const player = players.find(p =>
      p.name?.toLowerCase() === name.toLowerCase() &&
      p.tag?.toLowerCase() === tag.toLowerCase()
    );

    if (!player) continue;

    const stats = player.stats || {};

    kills += stats.kills || 0;
    deaths += stats.deaths || 0;
    assists += stats.assists || 0;

    const agent = player.character || "Unknown";
    agentCount[agent] = (agentCount[agent] || 0) + 1;

    const team = player.team?.toLowerCase();
    const redWon = match.teams?.red?.has_won;
    const blueWon = match.teams?.blue?.has_won;

    if ((team === "red" && redWon) || (team === "blue" && blueWon)) {
      wins++;
    } else {
      losses++;
    }
  }

  const favoriteAgent =
    Object.entries(agentCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

  return {
    kills,
    deaths,
    assists,
    kd: deaths ? (kills / deaths).toFixed(2) : kills,
    wins,
    losses,
    favoriteAgent
  };
}

/* ---------------- GET PLAYER ---------------- */

async function getPlayer(riotId, discordId) {
  const cached = cache.get(discordId);
  if (cached && Date.now() - cached.lastFetch < CACHE_TTL) return cached;

  try {
    const mmr = await fetchMMR(riotId);
    const matches = await fetchMatches(riotId);

    const matchStats = extractMatchStats(matches, riotId);

    const result = {
      rank: mmr.currenttierpatched || "Unranked",
      rr: mmr.ranking_in_tier || 0,
      elo: mmr.elo || 0,
      ...matchStats,
      lastFetch: Date.now()
    };

    cache.set(discordId, result);
    return result;

  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    return null;
  }
}

/* ---------------- COMMANDS ---------------- */

const commands = [
  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link Riot account")
    .addStringOption(o =>
      o.setName("riotid").setDescription("Name#TAG").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View rank"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View profile"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Server leaderboard"),

  // 🔥 NEW MAP COMMAND
  new SlashCommandBuilder()
    .setName("map")
    .setDescription("CS Map mit Callouts anzeigen")
    .addStringOption(option =>
      option.setName("name")
        .setDescription("Map auswählen")
        .setRequired(true)
        .addChoices(
          { name: "Ancient", value: "ancient" },
          { name: "Anubis", value: "anubis" },
          { name: "Cache", value: "cache" },
          { name: "Dust2", value: "dust2" },
          { name: "Inferno", value: "inferno" },
          { name: "Mirage", value: "mirage" },
          { name: "Nuke", value: "nuke" },
          { name: "Overpass", value: "overpass" },
          { name: "Train", value: "train" },
          { name: "Vertigo", value: "vertigo" }
        )
    )

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

/* ---------------- READY ---------------- */

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  console.log("Commands registered.");
});

/* ---------------- INTERACTIONS ---------------- */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const data = loadData();

  try {

    if (interaction.commandName === "link") {
      const riotId = interaction.options.getString("riotid");

      data[interaction.user.id] = { riotId, history: [] };
      saveData(data);

      return interaction.reply(`✅ Linked **${riotId}**`);
    }

    if (interaction.commandName === "rank") {
      await interaction.deferReply();

      const u = data[interaction.user.id];
      if (!u) return interaction.editReply("❌ Not linked.");

      const p = await getPlayer(u.riotId, interaction.user.id);
      if (!p) return interaction.editReply("❌ API error.");

      return interaction.editReply(`🎯 **${p.rank} (${p.rr} RR)**`);
    }

    if (interaction.commandName === "profile") {
      await interaction.deferReply();

      const u = data[interaction.user.id];
      if (!u) return interaction.editReply("❌ Not linked.");

      const p = await getPlayer(u.riotId, interaction.user.id);
      if (!p) return interaction.editReply("❌ API error.");

      const embed = new EmbedBuilder()
        .setTitle("📊 Valorant Profile")
        .setColor(0x00ff99)
        .addFields(
          { name: "Rank", value: p.rank, inline: true },
          { name: "RR", value: String(p.rr), inline: true },
          { name: "ELO", value: String(p.elo), inline: true },
          { name: "K/D", value: String(p.kd), inline: true },
          { name: "K / D / A", value: `${p.kills}/${p.deaths}/${p.assists}` },
          { name: "Wins / Losses", value: `${p.wins}W / ${p.losses}L` },
          { name: "Favorite Agent", value: p.favoriteAgent, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "leaderboard") {
      await interaction.deferReply();

      const results = [];

      for (const id of Object.keys(data)) {
        const u = data[id];
        const p = await getPlayer(u.riotId, id);
        if (!p) continue;

        results.push({
          riotId: u.riotId,
          rank: p.rank,
          rr: p.rr,
          score: rankScore[p.rank?.split(" ")[0]] || 0
        });
      }

      results.sort((a, b) => b.score - a.score);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Leaderboard")
        .setColor(0xffd700)
        .setDescription(
          results.slice(0, 10)
            .map((u, i) =>
              `**#${i + 1}** ${u.riotId}\n${u.rank} | ${u.rr} RR`
            ).join("\n\n") || "No data"
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // MAP COMMAND HANDLER
    if (interaction.commandName === "map") {
  const mapName = interaction.options.getString("name");
  const images = mapImages[mapName];

  if (!images) {
    return interaction.reply({
      content: "❌ Map nicht gefunden.",
      ephemeral: true
    });
  }

  const embeds = [
    new EmbedBuilder()
      .setTitle(`🗺️ ${mapName.toUpperCase()} Callouts`)
      .setColor(0x0099ff)
      .setImage(images[0])
  ];

  for (let i = 1; i < images.length; i++) {
    embeds.push(
      new EmbedBuilder()
        .setColor(0x0099ff)
        .setImage(images[i])
    );
  }

  return interaction.reply({ embeds });
}

  } catch (err) {
    console.error("COMMAND ERROR:", err);
    return interaction.reply("❌ Something went wrong.");
  }
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.DISCORD_TOKEN);