import { defineCollection, z } from "astro:content";

// One Markdown file per food, named by its id in src/data/foods.json. The file
// holds only the prose; every figure on the page is read from foods.json.
const foods = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Two or three other food ids shown side by side, chosen for contrast. */
    compare: z.array(z.string()).min(2).max(3),
  }),
});

export const collections = { foods };
