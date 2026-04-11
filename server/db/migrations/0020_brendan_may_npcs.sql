-- Add Brendan and May from Ruby/Sapphire/Emerald as NPCs. They use the new
-- `regional` strategy, which favors Pokémon from a specific generation —
-- here, Hoenn (generation-iii), matching the region they debuted in.

INSERT INTO "user" (id, name, email, email_verified, is_npc, npc_strategy, image, created_at, updated_at) VALUES
  ('npc-brendan', 'Brendan', 'npc-brendan@npc.local', true, true, 'regional:generation-iii', 'https://archives.bulbagarden.net/media/upload/thumb/9/95/Ruby_Sapphire_Brendan.png/120px-Ruby_Sapphire_Brendan.png', now(), now()),
  ('npc-may', 'May', 'npc-may@npc.local', true, true, 'regional:generation-iii', 'https://archives.bulbagarden.net/media/upload/thumb/f/f7/Ruby_Sapphire_May.png/120px-Ruby_Sapphire_May.png', now(), now())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  is_npc = EXCLUDED.is_npc,
  npc_strategy = EXCLUDED.npc_strategy,
  image = EXCLUDED.image,
  updated_at = now();
