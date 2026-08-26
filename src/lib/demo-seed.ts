/**
 * Deterministic demo data for the Turkey Slice Invitational: one course, ten
 * players, three finished years of history and a live tournament mid-round.
 *
 * Builds a single SQL script so the same seed can run from the CLI
 * (`npm run seed`) or from the token-guarded reset endpoint on a deployment
 * whose database this machine cannot dial directly.
 */

import { randomBytes, scryptSync } from "node:crypto";

const counters = new Map<string, number>();

/**
 * Deterministic ids (crs1, plr3, mch12). Re-running the seed produces exactly
 * the same rows, and the emitted SQL is a fraction of the size that random
 * UUIDs would make it.
 */
function uid(prefix: string): string {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return `${prefix}${next}`;
}

export const DEMO_PASSWORD = process.env.TSI_DEMO_PASSWORD ?? "TurkeySlice2026!";

export interface SeedScript {
  sql: string;
  liveTournamentId: string;
  password: string;
}

export function buildSeedSql(): SeedScript {
  counters.clear();
  const statements: string[] = [];

  function lit(value: unknown): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  const buckets = new Map<string, { columns: string[]; rows: string[] }>();

  function insert(table: string, columns: string[], values: unknown[]) {
    const bucket = buckets.get(table) ?? { columns, rows: [] };
    bucket.rows.push(`(${values.map(lit).join(", ")})`);
    buckets.set(table, bucket);
  }

  // Parents before children, so one pass satisfies every foreign key.
  const TABLE_ORDER = [
    "courses", "tees", "holes", "players", "tournaments", "teams", "entries",
    "rounds", "matches", "match_sides", "side_players", "scores", "wagers",
    "wager_players",
  ];

  function flush() {
    for (const table of TABLE_ORDER) {
      const bucket = buckets.get(table);
      if (!bucket || bucket.rows.length === 0) continue;
      // Chunked so no single statement grows unwieldy for a SQL console.
      for (let i = 0; i < bucket.rows.length; i += 250) {
        const chunk = bucket.rows.slice(i, i + 250);
        statements.push(
          `INSERT INTO ${table} (${bucket.columns.join(", ")}) VALUES\n${chunk.join(",\n")};`,
        );
      }
    }
  }

  function hash(password: string): string {
    const salt = randomBytes(16).toString("hex");
    return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
  }

  /** Deterministic PRNG so the demo data is identical on every machine. */
  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const HOLES: [number, number, number, number][] = [
    // number, par, stroke index, yardage
    [1, 4, 7, 410], [2, 5, 13, 528], [3, 4, 1, 452], [4, 3, 17, 168],
    [5, 4, 5, 425], [6, 4, 11, 388], [7, 3, 15, 195], [8, 5, 9, 545],
    [9, 4, 3, 441], [10, 4, 8, 402], [11, 5, 14, 512], [12, 3, 18, 152],
    [13, 4, 2, 448], [14, 4, 10, 395], [15, 4, 6, 418], [16, 3, 16, 182],
    [17, 5, 12, 560], [18, 4, 4, 436],
  ];

  const PLAYERS = [
    { username: "dmarchetti", name: "Dave Marchetti", hcp: 8.4, since: 2016, ghin: "4417290", admin: true },
    { username: "rwhitlock", name: "Ryan Whitlock", hcp: 12.1, since: 2016, ghin: "4417311" },
    { username: "sokafor", name: "Sam Okafor", hcp: 4.7, since: 2018, ghin: "5120884" },
    { username: "tdelgado", name: "Tony Delgado", hcp: 16.3, since: 2016, ghin: "4417356" },
    { username: "mfeld", name: "Marcus Feld", hcp: 9.9, since: 2019, ghin: "6033147" },
    { username: "cboone", name: "Chris Boone", hcp: 21.5, since: 2017, ghin: "4881002" },
    { username: "plindqvist", name: "Pat Lindqvist", hcp: 6.2, since: 2020, ghin: "7219460" },
    { username: "arhee", name: "Alex Rhee", hcp: 14.8, since: 2021, ghin: "7788231" },
    { username: "jvance", name: "Jordan Vance", hcp: 11.0, since: 2022, ghin: "8014577" },
    { username: "nsarto", name: "Nick Sarto", hcp: 18.2, since: 2023, ghin: "8452119" },
  ];

  const TABLES = [
    "wager_players", "wagers", "scores", "side_players", "match_sides", "matches",
    "rounds", "entries", "teams", "tournaments", "holes", "tees", "courses",
    "sessions", "players",
  ];

  // The seed always starts from a clean slate; the schema itself is left alone.
  statements.push(`TRUNCATE ${TABLES.join(", ")} CASCADE;`);

  // ---------------------------------------------------------------- course ---
  const courseId = uid("crs");
  insert("courses", ["id", "name", "city", "state"], [
    courseId, "Turkey Hollow Country Club", "Doylestown", "PA",
  ]);

  for (const [number, par, si, yards] of HOLES) {
    insert("holes", ["id", "course_id", "number", "par", "stroke_index", "yardage"], [
      uid("hol"), courseId, number, par, si, yards,
    ]);
  }

  const blueTee = uid("tee");
  const TEE_COLUMNS = ["id", "course_id", "name", "rating", "slope", "yardage"];
  insert("tees", TEE_COLUMNS, [blueTee, courseId, "Blue", 72.4, 136, 6802]);
  insert("tees", TEE_COLUMNS, [uid("tee"), courseId, "White", 70.8, 131, 6350]);
  insert("tees", TEE_COLUMNS, [uid("tee"), courseId, "Gold", 68.9, 125, 5910]);

  const PAR = HOLES.reduce((sum, h) => sum + h[1], 0);

  // --------------------------------------------------------------- players ---
  const playerIds: Record<string, string> = {};
  for (const p of PLAYERS) {
    const id = uid("plr");
    playerIds[p.username] = id;
    insert(
      "players",
      ["id", "username", "display_name", "password_hash", "ghin", "handicap_index",
       "member_since", "is_admin", "bio"],
      [id, p.username, p.name, hash(DEMO_PASSWORD), p.ghin ?? null, p.hcp, p.since,
       p.admin ? 1 : 0, null],
    );
  }

  const courseHandicap = (index: number) => Math.round(index * (136 / 113) + (72.4 - PAR));
  const handicapOf: Record<string, number> = {};
  for (const p of PLAYERS) handicapOf[p.username] = courseHandicap(p.hcp);

  function strokesOnHole(playing: number, strokeIndex: number): number {
    const base = Math.floor(playing / 18);
    return base + (strokeIndex <= playing % 18 ? 1 : 0);
  }

  // ----------------------------------------------------------- tournaments ---
  interface YearPlan {
    year: number;
    status: string;
    entrants: string[];
    darkMeat: string[];
    whiteMeat: string[];
    champion?: string;
    /** How many holes of each round to fill: 18 = complete. */
    progress: [number, number, number];
  }

  const CORE = [
    "dmarchetti", "rwhitlock", "sokafor", "tdelgado",
    "mfeld", "cboone", "plindqvist", "arhee",
  ];
  const CURRENT = [
    "dmarchetti", "rwhitlock", "sokafor", "tdelgado",
    "mfeld", "nsarto", "plindqvist", "jvance",
  ];

  const PLAN: YearPlan[] = [
    {
      year: 2023, status: "complete", entrants: CORE,
      darkMeat: ["dmarchetti", "sokafor", "mfeld", "plindqvist"],
      whiteMeat: ["rwhitlock", "tdelgado", "cboone", "arhee"],
      champion: "Dark Meat", progress: [18, 18, 18],
    },
    {
      year: 2024, status: "complete", entrants: CORE,
      darkMeat: ["dmarchetti", "tdelgado", "mfeld", "arhee"],
      whiteMeat: ["rwhitlock", "sokafor", "cboone", "plindqvist"],
      champion: "White Meat", progress: [18, 18, 18],
    },
    {
      year: 2025, status: "complete", entrants: CORE,
      darkMeat: ["dmarchetti", "rwhitlock", "plindqvist", "cboone"],
      whiteMeat: ["sokafor", "tdelgado", "mfeld", "arhee"],
      champion: "Dark Meat", progress: [18, 18, 18],
    },
    {
      year: 2026, status: "active", entrants: CURRENT,
      darkMeat: ["dmarchetti", "sokafor", "mfeld", "jvance"],
      whiteMeat: ["rwhitlock", "tdelgado", "plindqvist", "nsarto"],
      progress: [18, 11, 0],
    },
  ];

  const ROUND_PLAN: { name: string; format: "fourball" | "foursome" | "singles"; allowance: number }[] = [
    { name: "Friday Fourball", format: "fourball", allowance: 0.9 },
    { name: "Saturday Foursomes", format: "foursome", allowance: 0.5 },
    { name: "Sunday Singles", format: "singles", allowance: 1 },
  ];

  const random = mulberry32(20261126);

  /** A gross score for one player on one hole, shaped by their handicap. */
  function grossFor(username: string, par: number, strokeIndex: number): number {
    const playing = handicapOf[username];
    const expected = par + strokesOnHole(playing, strokeIndex);
    const roll = random();
    let score = expected;
    if (roll < 0.1) score -= 1;
    else if (roll < 0.55) score += 0;
    else if (roll < 0.85) score += 1;
    else if (roll < 0.96) score += 2;
    else score += 3;
    return Math.max(2, score);
  }

  const insertTournament = (values: unknown[]) =>
    insert(
      "tournaments",
      ["id", "year", "name", "course_id", "start_date", "end_date", "status", "champion", "notes"],
      values,
    );
  const insertTeam = (values: unknown[]) =>
    insert("teams", ["id", "tournament_id", "name", "color"], values);
  const insertEntry = (values: unknown[]) =>
    insert("entries", ["tournament_id", "player_id", "team_id", "course_handicap"], values);
  const insertRound = (values: unknown[]) =>
    insert(
      "rounds",
      ["id", "tournament_id", "name", "format", "course_id", "tee_id", "played_on",
       "sequence", "allowance", "status"],
      values,
    );
  const insertMatch = (values: unknown[]) =>
    insert("matches", ["id", "round_id", "name", "sequence", "status"], values);
  const insertSide = (values: unknown[]) =>
    insert("match_sides", ["id", "match_id", "label", "team_id"], values);
  const insertSidePlayer = (values: unknown[]) =>
    insert("side_players", ["side_id", "player_id"], values);
  const insertScore = (values: unknown[]) =>
    insert(
      "scores",
      ["id", "match_id", "hole", "subject_type", "subject_id", "gross", "putts", "updated_by"],
      values,
    );

  let liveRoundId = "";
  let fourballRoundId = "";
  let liveTournamentId = "";
  let nassauMatchId = "";

  const buildAll = () => {
    for (const plan of PLAN) {
      const tournamentId = uid("trn");
      const start = `${plan.year}-11-${plan.year === 2026 ? "20" : "17"}`;
      const end = `${plan.year}-11-${plan.year === 2026 ? "22" : "19"}`;
      insertTournament([
        tournamentId,
        plan.year,
        `${plan.year} Turkey Slice Invitational`,
        courseId,
        start,
        end,
        plan.status,
        plan.champion ?? null,
        plan.year === 2026 ? "The 11th playing. Gravy boat is on the line." : null,
      ]);
      if (plan.status === "active") liveTournamentId = tournamentId;

      const darkId = uid("tm");
      const whiteId = uid("tm");
      insertTeam([darkId, tournamentId, "Dark Meat", "#7c2d12"]);
      insertTeam([whiteId, tournamentId, "White Meat", "#0f766e"]);
      const teamOf: Record<string, string> = {};
      for (const u of plan.darkMeat) teamOf[u] = darkId;
      for (const u of plan.whiteMeat) teamOf[u] = whiteId;
      for (const u of plan.entrants) {
        insertEntry([tournamentId, playerIds[u], teamOf[u], null]);
      }

      ROUND_PLAN.forEach((rp, roundIndex) => {
        const roundId = uid("rnd");
        const holesToFill = plan.progress[roundIndex];
        const status =
          holesToFill === 0 ? "upcoming" : holesToFill === 18 ? "complete" : "live";
        insertRound([
          roundId,
          tournamentId,
          rp.name,
          rp.format,
          courseId,
          blueTee,
          `${plan.year}-11-${20 + roundIndex}`,
          roundIndex + 1,
          rp.allowance,
          status,
        ]);
        if (plan.status === "active") {
          if (status === "live") liveRoundId = roundId;
          if (rp.format === "fourball") fourballRoundId = roundId;
        }

        // Pair team members off against each other, rotating by round.
        const pairings: { dark: string[]; white: string[] }[] = [];
        if (rp.format === "singles") {
          for (let i = 0; i < 4; i++) {
            pairings.push({ dark: [plan.darkMeat[i]], white: [plan.whiteMeat[i]] });
          }
        } else {
          const shift = roundIndex === 1 ? 1 : 0;
          pairings.push({
            dark: [plan.darkMeat[0], plan.darkMeat[1 + shift]],
            white: [plan.whiteMeat[0], plan.whiteMeat[1 + shift]],
          });
          pairings.push({
            dark: [plan.darkMeat[2 - shift], plan.darkMeat[3]],
            white: [plan.whiteMeat[2 - shift], plan.whiteMeat[3]],
          });
        }

        pairings.forEach((pairing, matchIndex) => {
          const matchId = uid("mch");
          if (plan.status === "active" && status === "live" && matchIndex === 0) {
            nassauMatchId = matchId;
          }
          insertMatch([
            matchId,
            roundId,
            `Match ${matchIndex + 1}`,
            matchIndex + 1,
            holesToFill === 0 ? "upcoming" : holesToFill === 18 ? "complete" : "live",
          ]);
          const darkSide = uid("sd");
          const whiteSide = uid("sd");
          insertSide([darkSide, matchId, "A", darkId]);
          insertSide([whiteSide, matchId, "B", whiteId]);
          for (const u of pairing.dark) insertSidePlayer([darkSide, playerIds[u]]);
          for (const u of pairing.white) insertSidePlayer([whiteSide, playerIds[u]]);

          for (const [number, par, si] of HOLES) {
            if (number > holesToFill) break;
            if (rp.format === "foursome") {
              for (const [sideId, team] of [
                [darkSide, pairing.dark],
                [whiteSide, pairing.white],
              ] as [string, string[]][]) {
                // Alternate shot plays one ball: use the pair's better handicap.
                const anchor = team.reduce((best, u) =>
                  handicapOf[u] < handicapOf[best] ? u : best,
                );
                const gross = grossFor(anchor, par, si);
                insertScore([
                  uid("scr"), matchId, number, "side", sideId, gross,
                  1 + Math.round(random()), playerIds[team[0]],
                ]);
              }
            } else {
              for (const u of [...pairing.dark, ...pairing.white]) {
                const gross = grossFor(u, par, si);
                insertScore([
                  uid("scr"), matchId, number, "player", playerIds[u], gross,
                  1 + Math.round(random() + 0.2), playerIds[u],
                ]);
              }
            }
          }
        });
      });
    }
  };
  buildAll();

  // ------------------------------------------------------------ side bets ---
  if (liveRoundId) {
    const insertWager = (values: unknown[]) =>
      insert("wagers", ["id", "round_id", "match_id", "type", "amount", "settings"], values);
    const insertWagerPlayer = (values: unknown[]) =>
      insert("wager_players", ["wager_id", "player_id"], values);

    const nassauId = uid("wgr");
    insertWager([nassauId, liveRoundId, nassauMatchId, "nassau", 20, "{}"]);

    // Skins and head-to-head need individual scores, so they ride on the
    // fourball round rather than the alternate-shot one.
    const skinsId = uid("wgr");
    insertWager([
      skinsId, fourballRoundId, null, "skins", 5,
      JSON.stringify({ mode: "net", carryover: true }),
    ]);
    for (const u of CURRENT) insertWagerPlayer([skinsId, playerIds[u]]);

    const h2hId = uid("wgr");
    insertWager([h2hId, fourballRoundId, null, "h2h", 50, "{}"]);
    insertWagerPlayer([h2hId, playerIds["dmarchetti"]]);
    insertWagerPlayer([h2hId, playerIds["rwhitlock"]]);
  }


  flush();

  return {
    sql: statements.join("\n"),
    liveTournamentId,
    password: DEMO_PASSWORD,
  };
}
