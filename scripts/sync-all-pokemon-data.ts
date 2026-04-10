/**
 * Runs all Pokemon data sync scripts in the correct order:
 * 1. sync-pokemon.ts — core Pokemon data (species, stats, catch rate)
 * 2. sync-pokemon-versions.ts — game versions and regional Pokedexes
 * 3. sync-pokemon-moves.ts — level-up moves by version group
 */

const scripts = [
  "sync-pokemon.ts",
  "sync-pokemon-versions.ts",
  "sync-pokemon-moves.ts",
];

const scriptsDir = new URL(".", import.meta.url);

for (const script of scripts) {
  const scriptPath = new URL(script, scriptsDir).pathname;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running ${script}...`);
  console.log("=".repeat(60));

  const command = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-read", "--allow-write", scriptPath],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error(`\n${script} failed with exit code ${code}. Aborting.`);
    Deno.exit(1);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log("All Pokemon data synced successfully.");
console.log("=".repeat(60));
