// The one module that reads the teaspoon divisor. Every page that prints or
// computes with it imports TEASPOON_GL from here.
import foodsData from "../data/foods.json";
import sourcesData from "../data/sources.json";

export type Food = (typeof foodsData.foods)[number];
export type Source = (typeof sourcesData.sources)[number];

/** Glycaemic load of one 4g teaspoon of table sugar (Unwin 2016, Box 2): 4.2g × GI 65 ÷ 100. */
export const TEASPOON_GL: number = foodsData.teaspoon_gl;

export const foods = foodsData.foods;
export const categories = foodsData.categories;
export const sources = sourcesData.sources;

export const foodById = new Map(foods.map((f) => [f.id, f]));
export const sourceById = new Map(sources.map((s) => [s.id, s]));
export const categoryLabel = new Map(categories.map((c) => [c.id, c.label]));

export const foodPath = (f: Food) => `/foods/${f.id}/`;

/** The date every food value was last re-checked. It lives in sources.json and is never typed into a page. */
export const lastVerified: string = sourcesData.last_verified;

/** An ISO date as a readable one, for example 13 September 2026. */
export const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** One decimal place, as every teaspoon figure is shown. */
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** Up to two decimal places, trailing zeros dropped. */
export const num = (n: number) => String(Math.round(n * 100) / 100);

/** First letter upper case, for a phrase used at the start of a sentence. */
export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface Working {
  lines: string[];
  /** Set when the arithmetic does not land exactly on the published figure. */
  mismatch?: { calculated: string; printed: string };
}

/** The arithmetic behind a food's teaspoon figure, as plain lines of text. */
export function working(f: Food): Working {
  const tsp = num(TEASPOON_GL);
  const printed = fmt1(f.cubes);

  if (f.gl_basis === "back-calculated") {
    return {
      lines: [
        `Teaspoons printed on the source: ${printed}`,
        `Glycaemic load: ${printed} × ${tsp} = ${num(f.gl)}`,
      ],
    };
  }

  let gl: number;
  const lines: string[] = [];
  if (f.carbs_g === 0) {
    gl = 0;
    lines.push(`Glycaemic load: 0g carbohydrate × any GI ÷ 100 = 0`);
  } else if (f.gi === 0) {
    gl = 0;
    lines.push(`Glycaemic load: GI 0 × any carbohydrate ÷ 100 = 0`);
  } else if (f.carbs_g !== null && f.gi !== null) {
    gl = (f.carbs_g * f.gi) / 100;
    const rounded = f.gl_basis === "printed" && num(gl) !== num(f.gl) ? `, printed as ${num(f.gl)}` : "";
    lines.push(`Glycaemic load: ${num(f.carbs_g)}g carbohydrate × GI ${f.gi} ÷ 100 = ${num(gl)}${rounded}`);
  } else {
    gl = f.gl;
    lines.push(`Glycaemic load printed on the source: ${num(f.gl)}`);
  }

  const calculated = fmt1(gl / TEASPOON_GL);
  lines.push(`Teaspoons: ${num(gl)} ÷ ${tsp} = ${calculated}`);
  return calculated === printed ? { lines } : { lines, mismatch: { calculated, printed } };
}
