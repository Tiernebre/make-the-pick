-- Replace the six NPCs that had no trainer sprite in the smogon/sprites repo
-- (Professors Elm, Rowan, Sycamore, Magnolia have no in-game trainer sprite;
-- Jessie and James are anime-only) with thematically matched substitutes from
-- the same region/team that do have sprites, so every NPC now renders a
-- consistent Smogon pixel sprite instead of a Bulbapedia Sugimori fallback.
--
-- Each row keeps its existing `npc-*` id so league_player and other foreign
-- keys stay intact — only name, email, and image rotate.

-- Professor Elm -> Jasmine (Olivine City, Johto gen2). Gentle, studious gym
-- leader known for caring for a sick Ampharos — the closest Johto stand-in
-- for Elm's quiet academic energy.
UPDATE "user" SET
  name = 'Jasmine',
  email = 'npc-jasmine@npc.local',
  image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen2/gold-silver/Jasmine.png'
WHERE id = 'npc-professor-elm';

-- Professor Rowan -> Bertha (Sinnoh Elite Four, gen4). Grandmotherly ground-
-- type expert; matches Rowan as the older, wiser Sinnoh voice.
UPDATE "user" SET
  name = 'Bertha',
  email = 'npc-bertha@npc.local',
  image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/diamond-pearl/Bertha.png'
WHERE id = 'npc-professor-rowan';

-- Professor Sycamore -> Clemont (Lumiose City, Kalos gen6). Inventor gym
-- leader — Kalos's closest "scientist in a lab coat" analogue for Sycamore.
UPDATE "user" SET
  name = 'Clemont',
  email = 'npc-clemont@npc.local',
  image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/noncanonical/trainers/gen6/x-y/Clemont.png'
WHERE id = 'npc-professor-sycamore';

-- Professor Magnolia -> Drasna (Kalos Elite Four, gen6). Galar has no trainer
-- sprites in the Smogon repo at all, so we bridge to Kalos with Drasna, the
-- other notable elder female scholar with a sprite.
UPDATE "user" SET
  name = 'Drasna',
  email = 'npc-drasna@npc.local',
  image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/noncanonical/trainers/gen6/x-y/Drasna.png'
WHERE id = 'npc-professor-magnolia';

-- Jessie -> Ariana (Team Rocket executive, gen4 HGSS). Replaces the anime
-- Rocket duo with the in-game Rocket Executive pair for matching chaos vibes.
UPDATE "user" SET
  name = 'Ariana',
  email = 'npc-ariana@npc.local',
  image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/heartgold-soulsilver/Ariana.png'
WHERE id = 'npc-jessie';

-- James -> Proton (Team Rocket executive, gen4 HGSS). Paired with Ariana
-- above; canonically described as the scariest Rocket — fits "chaos".
UPDATE "user" SET
  name = 'Proton',
  email = 'npc-proton@npc.local',
  image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/heartgold-soulsilver/Proton.png'
WHERE id = 'npc-james';
