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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* -----------------------------
   CONFIG
----------------------------- */

const CLIENT_ID = "1425219882857005118";
const NOTIFY_CHANNEL_ID = "1256688828165394432";

const CACHE_TTL = 5 * 60 * 1000;

/* -----------------------------
   RANK SYSTEM
----------------------------- */

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

/* -----------------------------
   ROLE MAPPING (RESTORED)
----------------------------- */

const rankRoles = {
  "Iron": "1493178517632974918",
  "Bronze": "1493178996488405213",
  "Silver": "1493179165212545094",
  "Gold": "1493179278991294464",
  "Platinum": "1493179323736391800",
  "Diamond": "1493179479705780276",
  "Ascendant": "1493179591261556864",
  "Immortal": "1493179654457004062",
  "Radiant": "1493179689819177082"
};

/* -----------------------------
   DATA STORAGE
----------------------------- */

const DATA_FILE = "./data.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* -----------------------------
   CACHE
----------------------------- */

const cache = new Map();

/* -----------------------------
   TRACKER API
----------------------------- */

async function fetchProfile(riotId) {
  const url = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(riotId)}`;

  const res = await axios.get(url, {
    headers: {
      "TRN-Api-Key": process.env.TRACKER_API_KEY
    }
  });

  return res.data.data;
}

/* -----------------------------
   EXTRACT DATA
----------------------------- */

function extract(profile) {
  const comp = profile.segments.find(s => s.type === "competitive");
  const overview = profile.segments.find(s => s.type === "overview");

  return {
    rank: comp?.stats?.tier?.displayName || "Unranked",
    rr: comp?.stats?.rating?.value || 0,
    wins: overview?.stats?.matchesWon?.value || 0,
    losses: overview?.stats?.matchesLost?.value || 0,
    kd: overview?.stats?.kdRatio?.value || 0,
    kills: overview?.stats?.kills?.value || 0,
    deaths: overview?.stats?.deaths?.value || 0,
    assists: overview?.stats?.assists?.value || 0
  };
}

/* -----------------------------
   CACHE WRAPPER
----------------------------- */

async function getPlayer(riotId, discordId) {
  const now = Date.now();
  const cached = cache.get(discordId);

  if (cached && now - cached.lastFetch < CACHE_TTL) {
    return cached;
  }

  const profile = await fetchProfile(riotId);
  const data = extract(profile);

  const result = {
    ...data,
    lastFetch: now
  };

  cache.set(discordId, result);
  return result;
}

/* -----------------------------
   HISTORY
----------------------------- */

function updateHistory(userData, rr, rank) {
  if (!userData.history) userData.history = [];

  userData.history.push({
    time: Date.now(),
    rr,
    rank
  });

  if (userData.history.length > 30) {
    userData.history.shift();
  }
}

/* -----------------------------
   ROLE UPDATE
----------------------------- */

async function updateRoles(member, oldRank, newRank) {
  const oldTier = oldRank?.split(" ")[0];
  const newTier = newRank?.split(" ")[0];

  const roleId = rankRoles[newTier];
  if (!roleId) return false;

  // remove all rank roles
  Object.values(rankRoles).forEach(id => {
    if (member.roles.cache.has(id)) {
      member.roles.remove(id).catch(() => {});
    }
  });

  await member.roles.add(roleId).catch(() => {});

  return oldTier !== newTier;
}

/* -----------------------------
   SYNC LOOP
----------------------------- */

async function syncAll() {
  const data = loadData();
  const guild = client.guilds.cache.first();
  if (!guild) return;

  for (const id of Object.keys(data)) {
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (!member) continue;

      const old = cache.get(id);
      const p = await getPlayer(data[id].riotId, id);

      updateHistory(data[id], p.rr, p.rank);

      const rankUp = await updateRoles(member, old?.rank, p.rank);

      cache.set(id, p);
      saveData(data);

      if (rankUp) {
        const channel = guild.channels.cache.get(NOTIFY_CHANNEL_ID);

        if (channel) {
          channel.send(
            `📈 **Rank Up!** <@${member.id}> reached **${p.rank}**`
          );
        }
      }

    } catch {}
  }
}

/* -----------------------------
   COMMANDS
----------------------------- */

const commands = [
  new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link your Riot account")
  .addStringOption(o =>
    o
      .setName("riotid")
      .setDescription("Your Riot ID (Name#TAG)")
      .setRequired(true)
  ),


  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View stats"),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View rank"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Server leaderboard")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
}

/* -----------------------------
   EVENTS
----------------------------- */

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await registerCommands();

  syncAll();
  setInterval(syncAll, 5 * 60 * 1000);
});

/* -----------------------------
   COMMAND HANDLER
----------------------------- */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const data = loadData();

  try {

    /* ---------------- LINK ---------------- */

    if (interaction.commandName === "link") {
      const riotId = interaction.options.getString("riotid");

      data[interaction.user.id] = {
        riotId,
        history: []
      };

      saveData(data);

      return interaction.reply(`✅ Linked **${riotId}**`);
    }

    /* ---------------- RANK ---------------- */

    if (interaction.commandName === "rank") {
      await interaction.deferReply();

      const u = data[interaction.user.id];
      if (!u) return interaction.editReply("❌ Not linked.");

      const p = await getPlayer(u.riotId, interaction.user.id);

      return interaction.editReply(`🎯 **${p.rank} (${p.rr} RR)**`);
    }

    /* ---------------- PROFILE ---------------- */

    if (interaction.commandName === "profile") {
      await interaction.deferReply();

      const u = data[interaction.user.id];
      if (!u) return interaction.editReply("❌ Not linked.");

      const p = await getPlayer(u.riotId, interaction.user.id);

      if (!p) {
        return interaction.editReply("❌ Could not fetch player data.");
      }

      const embed = new EmbedBuilder()
        .setTitle("📊 Valorant Profile")
        .setColor(0x00ff99)
        .addFields(
          { name: "Rank", value: p.rank || "Unknown", inline: true },
          { name: "RR", value: String(p.rr ?? "0"), inline: true },
          { name: "K/D", value: String(p.kd ?? "0"), inline: true },
          { name: "K / D / A", value: `${p.kills ?? 0}/${p.deaths ?? 0}/${p.assists ?? 0}` },
          { name: "Wins / Losses", value: `${p.wins ?? 0}W / ${p.losses ?? 0}L` }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    /* ---------------- LEADERBOARD ---------------- */

    if (interaction.commandName === "leaderboard") {
      await interaction.deferReply();

      const results = [];

      for (const id of Object.keys(data)) {
        const u = data[id];

        try {
          const p = await getPlayer(u.riotId, id);

          results.push({
            riotId: u.riotId,
            rank: p.rank || "Unranked",
            score: rankScore[p.rank?.split(" ")[0]] || 0,
            rr: p.rr || 0
          });

        } catch (err) {
          console.error(`Leaderboard error for ${u.riotId}`, err);
        }
      }

      results.sort((a, b) => b.score - a.score);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Leaderboard")
        .setColor(0xffd700)
        .setDescription(
          results.slice(0, 10)
            .map((u, i) =>
              `**#${i + 1}** ${u.riotId}\n${u.rank} | ${u.rr} RR`
            )
            .join("\n\n") || "No data"
        );

      return interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.error("Command error:", err);

    if (interaction.deferred) {
      return interaction.editReply("❌ Something went wrong.");
    } else {
      return interaction.reply("❌ Something went wrong.");
    }
  }
});

/* -----------------------------
   LOGIN
----------------------------- */

client.login(process.env.DISCORD_TOKEN);