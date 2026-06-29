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
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
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

  return {
    avgKills: playedMatches ? (kills / playedMatches).toFixed(1) : 0,
    avgDeaths: playedMatches ? (deaths / playedMatches).toFixed(1) : 0,
    avgAssists: playedMatches ? (assists / playedMatches).toFixed(1) : 0,

    kd: deaths ? (kills / deaths).toFixed(2) : kills,

    hsPercent,
    winrate,

    wins,
    losses,
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

    if (hours >= 50 && words >= 1500) { // <---------------------- MVP REQUIREMENTS
      if (mvpRole && !member.roles.cache.has(mvpRole.id)) {
        await member.roles.add(mvpRole).catch(() => {});
      }
    } else if (hours >= 20 || words >= 1000) { // <---------------------- VIP REQUIREMENTS
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

async function getPlayer(
  riotId,
  discordId,
  includeMatches = true
) {

  const cacheKey =
`${discordId}_${includeMatches}`;

  const cached = cache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.lastFetch < CACHE_TTL
  ) {
    return cached;
  }

  try {

    const mmr =
    await fetchMMR(riotId);

    const account =
    await fetchAccount(riotId);

    let matchStats = {};

    if (includeMatches) {

      const matches =
        await fetchMatches(riotId);

      matchStats =
        extractMatchStats(
          matches,
          riotId
        );
    }

    const [name, tag] = riotId.split("#");

    const result = {

      name,
      tag,

    level:
      account.account_level || 0,

    rank:
      mmr.currenttierpatched ||
      "Unrated",

    peakRank:
      mmr.highest_rank?.patched_tier ||
      "Unrated",

    rr:
      mmr.ranking_in_tier || 0,

    elo:
      mmr.elo || 0,

    ...matchStats,

    lastFetch:
      Date.now()
    };

    cache.set(
      cacheKey,
      result
    );

    return result;

  } catch (err) {

    console.log(err);

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

  /* --------- RANK COMMAND ---------- Disabled for now!!!
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
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await registerCommands();
    return interaction.editReply("✅ Commands redeployed successfully.");
  } catch (err) {
    console.error("DEPLOY ERROR:", err);
    return interaction.editReply("❌ Deploy failed (see console).");
  }
}
    if (interaction.commandName === "link") {
      const riotId = interaction.options.getString("riotid");

      valorantData[interaction.user.id] = { riotId };
      saveValorantData();
      valorantData = loadValorantData();

      return interaction.reply(`✅ Linked **${riotId}**`);
    }

    if (interaction.commandName === "rank") {

  await interaction.deferReply();
  valorantData = loadValorantData();
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

      const rank = p.rank || "Unrated";
      const peakRank = p.peakRank || "Unrated";

      const rankBase = rank.split(" ")[0];
      const peakBase = peakRank.split(" ")[0];

      const rankEmoji = rankEmojis[rankBase] || "";
      const shortRank = shortRanks[rank] || rank;
      const peakEmoji = rankEmojis[peakBase] || "";
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Valorant Profile")
        .setColor(0xffff00)
        .addFields(

          {
            name: "👤 Riot ID",
            value: `>>> ${p.name}#${p.tag}`,
            inline: false
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
      flags: MessageFlags.Ephemeral
    });
  }

  const oldRiotId = valorantData[userId].riotId;

  delete valorantData[userId];

  saveValorantData();

  return interaction.reply({
    content: `✅ Successfully unlinked **${oldRiotId}**`,
    flags: MessageFlags.Ephemeral
  });
}

    if (interaction.commandName === "leaderboard") {

  await interaction.deferReply();

  valorantData = loadValorantData();
  const results = [];

  for (const id of Object.keys(valorantData)) {

    // TEMPORARY
    console.log("USER:", id);
    console.log(valorantData[id]);
    // TEMPORARY END
  try {

    const u = valorantData[id];

    if (!u?.riotId) continue;

    const p = await getPlayer(u.riotId, id, false);

    // TEMPORARY
    console.log("PLAYER:", u.riotId, p?.rank);
    // TEMPORARY END

    if (!p || !p.rank) {
      console.log("FAILED:", u.riotId);
      continue;
    }

    const rankText = p.rank || "Unrated";
    const baseRank = rankText.split(" ")[0];

    results.push({
      discordId: id,
      riotId: u.riotId,
      rank: rankText,
      rr: p.rr || 0,
      score: rankScore[baseRank] || 0
    });

  } catch (err) {

    console.log("LEADERBOARD PLAYER ERROR:");
    console.log(err);

  }
}

  // Sortierung
  results.sort((a, b) => {

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.rr - a.rr;
  });

  let page = 0;
  const perPage = 10;

  const generateEmbed = (page) => {

    const start = page * perPage;
    const current = results.slice(start, start + perPage);

    const description = current.map((u, i) => {

const globalIndex = start + i + 1;

const rankBase =
u.rank.split(" ")[0];

const rankEmoji =
rankEmojis[rankBase] || "";

let placement;

if (globalIndex === 1)
placement = "🥇";

else if (globalIndex === 2)
placement = "🥈";

else if (globalIndex === 3)
placement = "🥉";

else
placement = `#${globalIndex}`;

const dcUser =
client.users.cache.get(
Object.keys(valorantData).find(
key =>
valorantData[key].riotId === u.riotId
)
);

const dcName =
dcUser?.username || "Unknown";

return (
`${placement} **${u.riotId}** • ${dcName}
${rankEmoji} ${u.rank} • ${u.rr} RR`
);

}).join("\n\n");

    return new EmbedBuilder()
      .setTitle("🏆   ▬▬▬   Valorant Leaderboard   ▬▬▬   🏆")
      .setColor(0xffd700)
      .setDescription(description || "No data.")
      .setFooter({
        text:
`Page ${page + 1} / ${Math.ceil(results.length / perPage)}`
      });

  };

  const row = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId("leaderboard_prev")
      .setLabel("⬅️ Previous")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("leaderboard_next")
      .setLabel("Next ➡️")
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.editReply({
    embeds: [generateEmbed(page)],
    components: results.length > perPage ? [row] : []
  });

  if (results.length <= perPage) return;

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000
  });

  collector.on("collect", async (i) => {

    if (i.user.id !== interaction.user.id) {
      return i.reply({
        content: "❌ You can't use these buttons.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (i.customId === "leaderboard_prev") {

      page--;

      if (page < 0) {
        page = Math.ceil(results.length / perPage) - 1;
      }
    }

    if (i.customId === "leaderboard_next") {

      page++;

      if (page >= Math.ceil(results.length / perPage)) {
        page = 0;
      }
    }

    await i.update({
      embeds: [generateEmbed(page)],
      components: [row]
    });

  });

  collector.on("end", async () => {

    try {

      await msg.edit({
        components: []
      });

    } catch {}
  });
}

    // MAP COMMAND HANDLER
    if (interaction.commandName === "map") {
  const mapName = interaction.options.getString("name");
  const images = mapImages[mapName];

  if (!images) {
    return interaction.reply({
      content: "❌ Map not found.",
      flags: MessageFlags.Ephemeral
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