require("dotenv").config();
const voiceStart = new Map()
const path = require("path");
const LEVELING_FILE = path.join(__dirname, "../leveling_system_data.json");
const VALORANT_FILE = path.resolve(process.cwd(), "valorant_data.json");
let levelingData = loadLevelingData()
let valorantData = loadValorantData()
// OwnerID_Gammel = 634106032188293130
let dirty = false
const fs = require("fs");
const axios = require("axios");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ActivityType
} = require("discord.js");

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
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

const rankEmojis = {
  Iron: "<:Iron_3_Rank:1334218151134625804>",
  Bronze: "<:Bronze_3_Rank:1334218189248266240>",
  Silver: "<:Silver_3_Rank:1334218206855827607>",
  Gold: "<:Gold_3_Rank:1334218222848966696>",
  Platinum: "<:Platinum_3_Rank:1334218238657298507>",
  Diamond: "<:Diamond_3_Rank:1334218252305563721>",
  Ascendant: "<:Ascendant_3_Rank:1334218268524806204>",
  Immortal: "<:Immortal_3_Rank:1334218280411467806>",
  Radiant: "<:Radiant_Rank:1334218296630841385>"
};

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

function loadLevelingData() {
  try {
    if (!fs.existsSync(LEVELING_FILE)) return {}
    const raw = fs.readFileSync(LEVELING_FILE, "utf8")
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function loadValorantData() {
  try {
    if (!fs.existsSync(VALORANT_FILE)) return {}
    const raw = fs.readFileSync(VALORANT_FILE, "utf8")
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLevelingData() {
  fs.writeFileSync(
    LEVELING_FILE,
    JSON.stringify(levelingData, null, 2)
  );
}

function saveValorantData() {
  fs.writeFileSync(VALORANT_FILE, JSON.stringify(valorantData, null, 2))
}

function ensureXPUser(data, id) {
  if (!data[id]) {
    data[id] = {
      words: 0,
      voiceSeconds: 0,
      riotId: null,
      history: []
    }
  }
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

async function fetchAccount(riotId) {
  const [name, tag] = riotId.split("#");

  const url = `https://api.henrikdev.xyz/valorant/v1/account/${name}/${tag}`;

  const res = await axios.get(url, {
    headers: { Authorization: process.env.HENRIK_API_KEY }
  });

  return res.data.data;
}

async function fetchMatches(riotId) {
  const [name, tag] = riotId.split("#");

  const url =
    `https://api.henrikdev.xyz/valorant/v3/matches/eu/${name}/${tag}?filter=competitive&size=50`;

  const res = await axios.get(url, {
    headers: {
      Authorization: process.env.HENRIK_API_KEY
    }
  });

  return res.data.data;
}

async function fetchFirstMatch(riotId) {

  const [name, tag] = riotId.split("#");

  let start = 0;
  let oldestMatch = null;

  while (true) {

    const url =
`https://api.henrikdev.xyz/valorant/v4/matches/eu/pc/${name}/${tag}?mode=competitive&size=10&start=${start}`;

    const res = await axios.get(url, {
      headers: {
        Authorization: process.env.HENRIK_API_KEY
      }
    });

    const matches = res.data.data || [];

    if (matches.length === 0) break;

    oldestMatch = matches[matches.length - 1];

    start += 10;

    // Sicherheitslimit
    if (start > 500) break;
  }

  if (!oldestMatch) {
    return "Unknown";
  }

  return oldestMatch.metadata?.started_at || "Unknown";
}

/* ---------------- MATCH PARSER ---------------- */

function extractMatchStats(matches, riotId) {
  const [name, tag] = riotId.split("#");

  let kills = 0;
  let deaths = 0;
  let assists = 0;

  let headshots = 0;
  let bodyshots = 0;
  let legshots = 0;

  let wins = 0;
  let losses = 0;

  const agentCount = {};

  if (!matches) {
    return {
      avgKills: 0,
      avgDeaths: 0,
      avgAssists: 0,
      kd: 0,
      hsPercent: 0,
      winrate: 0,
      wins: 0,
      losses: 0,
      favoriteAgent: "Unknown"
    };
  }

  let playedMatches = 0;

  for (const match of matches) {
    const players = match.players?.all_players || [];

    const player = players.find(p =>
      p.name?.toLowerCase() === name.toLowerCase() &&
      p.tag?.toLowerCase() === tag.toLowerCase()
    );

    if (!player) continue;

    playedMatches++;

    const stats = player.stats || {};

    kills += stats.kills || 0;
    deaths += stats.deaths || 0;
    assists += stats.assists || 0;

    headshots += player.stats?.headshots || 0;
    bodyshots += player.stats?.bodyshots || 0;
    legshots += player.stats?.legshots || 0;

    const agent = player.character || "Unknown";
    agentCount[agent] = (agentCount[agent] || 0) + 1;

    const team = player.team?.toLowerCase();
    const redWon = match.teams?.red?.has_won;
    const blueWon = match.teams?.blue?.has_won;

    if (
      (team === "red" && redWon) ||
      (team === "blue" && blueWon)
    ) {
      wins++;
    } else {
      losses++;
    }
  }

  const totalShots = headshots + bodyshots + legshots;

  const hsPercent = totalShots
    ? ((headshots / totalShots) * 100).toFixed(1)
    : 0;

  const winrate = playedMatches
    ? ((wins / playedMatches) * 100).toFixed(1)
    : 0;

  const favoriteAgent =
    Object.entries(agentCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

  return {
    avgKills: playedMatches ? (kills / playedMatches).toFixed(1) : 0,
    avgDeaths: playedMatches ? (deaths / playedMatches).toFixed(1) : 0,
    avgAssists: playedMatches ? (assists / playedMatches).toFixed(1) : 0,

    kd: deaths ? (kills / deaths).toFixed(2) : kills,

    hsPercent,
    winrate,

    wins,
    losses,

    favoriteAgent
  };
}

/* ---------------- GET PLAYER ---------------- */

async function checkXP(guild) {
  const vipRoleId = "1318994760689647753";
  const mvpRoleId = "1318997600455757956";

  const vipRole = guild.roles.cache.get(vipRoleId);
  const mvpRole = guild.roles.cache.get(mvpRoleId);

  for (const id in levelingData) {
    const u = levelingData[id];

    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) continue;

    const hours = u.voiceSeconds / 3600;
    const words = u.words;

    if (hours >= 25 && words >= 1000) { // <---------------------- MVP REQUIREMENTS
      if (mvpRole && !member.roles.cache.has(mvpRole.id)) {
        await member.roles.add(mvpRole).catch(() => {});
      }
    } else if (hours >= 10 || words >= 500) { // <---------------------- VIP REQUIREMENTS
      if (vipRole && !member.roles.cache.has(vipRole.id)) {
        await member.roles.add(vipRole).catch(() => {});
      }
    }
  }
}

const shortRanks = {
  "Iron 1": "Iron 1",
  "Iron 2": "Iron 2",
  "Iron 3": "Iron 3",

  "Bronze 1": "Bronze 1",
  "Bronze 2": "Bronze 2",
  "Bronze 3": "Bronze 3",

  "Silver 1": "Silver 1",
  "Silver 2": "Silver 2",
  "Silver 3": "Silver 3",

  "Gold 1": "Gold 1",
  "Gold 2": "Gold 2",
  "Gold 3": "Gold 3",

  "Platinum 1": "Plat 1",
  "Platinum 2": "Plat 2",
  "Platinum 3": "Plat 3",

  "Diamond 1": "Dia 1",
  "Diamond 2": "Dia 2",
  "Diamond 3": "Dia 3",

  "Ascendant 1": "Asc 1",
  "Ascendant 2": "Asc 2",
  "Ascendant 3": "Asc 3",

  "Immortal 1": "Immo 1",
  "Immortal 2": "Immo 2",
  "Immortal 3": "Immo 3",

  "Radiant": "Radiant"
};

async function getPlayer(riotId, discordId) {
  const cached = cache.get(discordId);
  if (cached?.lastFetch && Date.now() - cached.lastFetch < CACHE_TTL) return cached;

  try {
    const mmr = (await fetchMMR(riotId)) || {};
    const account = (await fetchAccount(riotId)) || {};
    const matches = await fetchMatches(riotId);
    const firstMatch = await fetchFirstMatch(riotId);
    console.log("MATCHES:", matches.length);

    const matchStats = extractMatchStats(matches, riotId);

    const result = {
      name: account.name || "Unknown",
      tag: account.tag || "???",
      firstMatch,
      level: account.account_level || 0,

      rank: mmr.currenttierpatched || "Unranked",
      peakRank:
        mmr.highest_rank?.patched_tier ||
        mmr.highest_rank?.patched_tier_name ||
        "Unknown",

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
    .setName("deploy")
    .setDescription("Redeploy slash commands (admin only)"),

  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link Riot account")
    .addStringOption(o =>
      o.setName("riotid").setDescription("Name#TAG").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View profile"),

  new SlashCommandBuilder()
    .setName("unlink")
    .setDescription("Unlink Riot account"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Server leaderboard"),

  /* --------- RANK COMMAND ---------- Disabled for now
  new SlashCommandBuilder()
  .setName("rank")
  .setDescription("View rank")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("Check another player's rank")
      .setRequired(false)
  ), */

  // MAP COMMAND
  new SlashCommandBuilder()
    .setName("map")
    .setDescription("Show CS Map with callouts")
    .addStringOption(option =>
      option.setName("name")
        .setDescription("Choose map")
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
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, "1256395457660325902"), { body: commands });
}

/* ---------------- READY ---------------- */

client.once("ready", async () => {

  try {
    await registerCommands();
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Command register error:", err);
  }

  console.log(`Logged in as ${client.user.tag}`);

  setTimeout(() => {
    client.user.setPresence({
      activities: [
        {
          name: "Playing Tax Fraud Simulator",
          type: 0,
        },
      ],
      status: "online",
    });

    console.log("Presence set successfully");
  }, 3000);
});

client.on("guildMemberAdd", member => {
  member.roles.add("1256399787654119425");
});

/* ---------------- INTERACTIONS ---------------- */

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const id = message.author.id;
  ensureXPUser(levelingData, id);

  const words = message.content?.trim()
    ? message.content.trim().split(/\s+/).length
    : 0;

  levelingData[id].words += words;

  saveLevelingData();
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const id = newState?.member?.id || oldState?.member?.id;
  if (!id) return;

  ensureXPUser(levelingData, id);

  // user joins voice
  if (!oldState.channel && newState.channel) {
    voiceStart.set(id, Date.now());
  }

  // user leaves voice
  if (oldState.channel && !newState.channel) {
    const start = voiceStart.get(id);
    if (!start) return;

    const seconds = Math.floor((Date.now() - start) / 1000);

    levelingData[id].voiceSeconds += seconds;

    voiceStart.delete(id);

    saveLevelingData();
  }
});

/* ---------------- INTERACTIONS ---------------- */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {

  if (interaction.commandName === "deploy") {

  const ownerId = "634106032188293130";

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "❌ No permission.",
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await registerCommands();
    return interaction.editReply("✅ Commands redeployed successfully.");
  } catch (err) {
    console.error("DEPLOY ERROR:", err);
    return interaction.editReply("❌ Deploy failed (see console).");
  }
}
    if (interaction.commandName === "link") {

  await interaction.deferReply();

  const riotId = interaction.options.getString("riotid");

  const firstMatch = await fetchFirstMatch(riotId);

  valorantData[interaction.user.id] = {
    riotId,
    history: [],
    firstMatch
  };

  saveValorantData();
  valorantData = loadValorantData();

  return interaction.editReply(
    `✅ Linked **${riotId}**`
  );
}

    if (interaction.commandName === "rank") {

  await interaction.deferReply();

  const targetUser =
    interaction.options.getUser("user") || interaction.user;

  valorantData = loadValorantData();

  if (!u) {
    return interaction.editReply(
      `❌ ${targetUser.username} has not linked a Riot account.`
    );
  }

  const p = await getPlayer(u.riotId, targetUser.id);

  if (!p) {
    return interaction.editReply("❌ API error.");
  }

  const rankBase = p.rank.split(" ")[0];
  const rankEmoji = rankEmojis[rankBase] || "";

  return interaction.editReply(
    `🎯 **${targetUser.username}** is currently ${rankEmoji} **${p.rank} (${p.rr} RR)**`
  );
}

    if (interaction.commandName === "profile") {
      await interaction.deferReply();
      valorantData = loadValorantData();
      const u = valorantData[interaction.user.id];
      if (!u || !u.riotId) return interaction.editReply("❌ Not linked. Use /link to connect your Riot account.");

      const p = await getPlayer(u.riotId, interaction.user.id);
      if (!p) return interaction.editReply("❌ API error.");

      const rankBase = p.rank.split(" ")[0];
      const peakBase = p.peakRank.split(" ")[0];

      const rankEmoji = rankEmojis[rankBase] || "";
      const shortRank = shortRanks[p.rank] || p.rank;
      const peakEmoji = rankEmojis[peakBase] || "";
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Valorant Profile")
        .setColor(0x00ff99)
        .addFields(

  {
    name: "👤 Riot ID",
    value: `>>> ${p.name}#${p.tag}`,
    inline: false
  },

  {
    name: "📅 First Match",
    value: `>>> ${
      u.firstMatch !== "Unknown"
        ? new Date(u.firstMatch).toLocaleDateString()
        : "Unknown"
    }`,
  inline: true
},

  // { name: "\u200B", value: "\u200B", inline: false},  }
  // Line Space

  {
    name: "🎖️ Level",
    value: `>>> ${p.level}`,
    inline: true
  },

  {
    name: "🏆 Rankㅤㅤ",
    value: `>>> ${rankEmoji} ${shortRank}`,
    inline: true
  },

  {
    name: "💎 RR",
    value: `>>> ${p.rr}`,
    inline: true
  },

  {
    name: "🏅 Winrate",
    value: `>>> ${p.winrate}%`,
    inline: true
  },

  {
    name: "⚔️ K/D",
    value: `>>> ${p.kd}`,
    inline: true
  },
  {
    name: "🎯 Headshot%",
    value: `>>> ${p.hsPercent}%`,
    inline: true
  },

  {
    name: "📊 AVG K / D / A",
    value: `>>> ${p.avgKills} / ${p.avgDeaths} / ${p.avgAssists}`,
    inline: false
  }

);

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "unlink") {

  const userId = interaction.user.id;

  if (!valorantData[userId]) {
    return interaction.reply({
      content: "❌ You don't have a linked Riot account.",
      ephemeral: true
    });
  }

  const oldRiotId = valorantData[userId].riotId;

  delete valorantData[userId];

  saveValorantData();

  return interaction.reply({
    content: `✅ Successfully unlinked **${oldRiotId}**`,
    ephemeral: true
  });
}

    if (interaction.commandName === "leaderboard") {
      await interaction.deferReply();

      const results = [];

      for (const id of Object.keys(valorantData)) {
        const u = valorantData[id];
        const p = await getPlayer(u.riotId, id);
        if (!p) continue;

        const baseRank = (p.rank || "Unrated").split(" ")[0];

        results.push({
          riotId: u.riotId,
          rank: p.rank,
          rr: p.rr,
          score: rankScore[baseRank] || 0
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
      content: "❌ Map not found.",
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

setInterval(() => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  checkXP(guild);
}, 10 * 60 * 1000);

/* ---------------- LOGIN ---------------- */

client.login(process.env.DISCORD_TOKEN);