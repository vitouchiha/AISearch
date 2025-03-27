import { Filter } from "../config/deps.ts";

// A shit ton of porn related searching going on.... the fuck.

const filter = new Filter();
const customWords = [
  "sex",
  "porn",
  "xxx",
  "adult",
  "erotic",
  "nude",
  "anal",
  "tits",
];
filter.addWords(...customWords);

export function badWordsFilter(text: string): boolean {
  return filter.isProfane(text);
}
