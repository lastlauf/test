/**
 * Plain-text explanations of every game the tournament plays. No imports that
 * touch the database, so the screens that teach the formats can render these
 * on the client.
 */

import type { Format } from "./scoring";

export interface FormatGuide {
  format: Format;
  name: string;
  players: string;
  /** One line on what the format actually is. */
  summary: string;
  /** How a hole is played and scored, in the order it happens. */
  howItWorks: string[];
  /** The rules that decide the result and the strokes. */
  rules: string[];
}

export const FORMAT_GUIDES: FormatGuide[] = [
  {
    format: "fourball",
    name: "Fourball",
    players: "2 v 2 · four players",
    summary:
      "Also called best ball. Everyone plays their own ball the whole way round, and each side counts only its better score on each hole.",
    howItWorks: [
      "All four players tee off and play their own ball to the hole.",
      "Each side takes its lower net score on that hole and throws the other away.",
      "The lower of the two side scores wins the hole. Equal scores halve it.",
    ],
    rules: [
      "Match play: you are counting holes won, not strokes.",
      "Strokes come off the low player — the best player in the match plays off scratch and everyone else gets the difference, at 90% allowance.",
      "A player who picks up simply has no score that hole; their partner still counts.",
      "The match ends the moment a side is up by more holes than are left, so 3&2 means three up with two to play.",
    ],
  },
  {
    format: "foursome",
    name: "Foursomes",
    players: "2 v 2 · four players",
    summary:
      "Alternate shot. Each side plays one ball between two players, taking turns — the purest test of a partnership and the fastest round of the weekend.",
    howItWorks: [
      "Decide who tees off on the odd holes; the partner takes the even ones.",
      "From there you alternate every shot until the ball is holed, whoever hit last.",
      "The side with the lower net score wins the hole.",
    ],
    rules: [
      "Match play, one score per side per hole.",
      "The tee order holds for the whole round no matter who holed out last.",
      "A penalty stroke does not change whose turn it is to play.",
      "Strokes are 50% of the pair's combined handicaps, taken off the low side.",
    ],
  },
  {
    format: "singles",
    name: "Singles",
    players: "1 v 1 · two players",
    summary:
      "You against one other player, no partner to bail you out. The Sunday format, and the one that settles arguments.",
    howItWorks: [
      "Both players play their own ball.",
      "Lower net score wins the hole; equal scores halve it.",
      "Keep going until one player is up by more holes than remain.",
    ],
    rules: [
      "Match play at full handicap difference — the lower handicap plays off scratch.",
      "Strokes fall on the hardest holes first, by stroke index.",
      "All square after 18 is a halved match; nobody wins.",
    ],
  },
];

export const BET_GUIDES = [
  {
    name: "Nassau",
    summary: "Three bets in one: the front nine, the back nine, and the full 18.",
    rules: [
      "Each segment is its own match and its own stake.",
      "A halved segment pays nobody.",
      "Losing side splits the cost, winning side splits the proceeds.",
    ],
  },
  {
    name: "Skins",
    summary: "Every hole is worth money, and only an outright win collects.",
    rules: [
      "Lowest score on a hole wins the skin; any tie and nobody wins it.",
      "With carryover on, a tied hole rolls its value onto the next one.",
      "The stake is what each other player pays the winner of a skin.",
    ],
  },
  {
    name: "Head to head",
    summary: "A private match between two players inside a bigger group.",
    rules: [
      "Straight match play on net scores between the two of you.",
      "Winner takes the stake; a halved match pays nothing.",
    ],
  },
];

/** How many players fit on one side of a given format. */
export function sideCapacity(format: Format): number {
  return format === "singles" ? 1 : 2;
}
