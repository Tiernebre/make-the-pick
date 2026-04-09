const command = Deno.args[0];
const rest = Deno.args.slice(1);

switch (command) {
  case "seed": {
    const { runSeedCommand } = await import("./cli/seed/mod.ts");
    await runSeedCommand(rest);
    break;
  }
  case "trpc":
  case undefined: {
    const { runTrpcCommand } = await import("./cli/trpc.ts");
    await runTrpcCommand();
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    console.log(`
Usage: deno task cli <command>

Commands:
  trpc      Run tRPC CLI (default)
  seed      Seed fake data into the dev database

Run 'deno task cli <command> --help' for more information.
`);
    Deno.exit(1);
}
