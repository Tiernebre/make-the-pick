-- Point NPC profile images at raw Smogon trainer sprites from
-- https://github.com/smogon/sprites, served through raw.githubusercontent.com.
-- Prefers canonical (ripped game) trainer sprites where available and falls
-- back to noncanonical (reconstructed) sprites for post-gen4 characters that
-- Smogon only ships in that directory.
--
-- Six NPCs have no trainer sprite in the Smogon repo at all (Professors Elm,
-- Rowan, Sycamore, Magnolia have no game sprite; Jessie and James are anime
-- only). Rather than leaving them on Bulbapedia and breaking the visual
-- consistency of the NPC roster, we repurpose their row to a thematically
-- similar character from the same region (or the same antagonist team) that
-- does have a sprite. We update the display name and email in place but keep
-- the existing user id so any foreign keys (league_player, etc.) stay intact.

UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Oak.png'         WHERE id = 'npc-professor-oak';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen3/ruby-sapphire/Birch.png'  WHERE id = 'npc-professor-birch';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/noncanonical/trainers/gen5/black-white/Juniper.png' WHERE id = 'npc-professor-juniper';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/noncanonical/trainers/gen7/sun-moon/Kukui.png'    WHERE id = 'npc-professor-kukui';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Red.png'         WHERE id = 'npc-red';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Blue.png'        WHERE id = 'npc-blue';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen2/gold-silver/Silver.png'   WHERE id = 'npc-silver';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/noncanonical/trainers/gen7/sun-moon/Hau.png'      WHERE id = 'npc-hau';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/noncanonical/trainers/gen7/sun-moon/Gladion.png'  WHERE id = 'npc-gladion';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Brock.png'       WHERE id = 'npc-brock';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Misty.png'       WHERE id = 'npc-misty';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Lt._Surge.png'   WHERE id = 'npc-lt-surge';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Erika.png'       WHERE id = 'npc-erika';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Sabrina.png'     WHERE id = 'npc-sabrina';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Lance.png'       WHERE id = 'npc-lance';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen3/firered-leafgreen/Agatha.png' WHERE id = 'npc-agatha';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Bruno.png'       WHERE id = 'npc-bruno';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/diamond-pearl/Cynthia.png' WHERE id = 'npc-cynthia';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen3/ruby-sapphire/Steven.png' WHERE id = 'npc-steven';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen1/red-blue/Giovanni.png'    WHERE id = 'npc-giovanni';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/heartgold-soulsilver/Archer.png' WHERE id = 'npc-archer';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen4/diamond-pearl/Cyrus.png'  WHERE id = 'npc-cyrus';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen3/ruby-sapphire/Brendan.png' WHERE id = 'npc-brendan';
UPDATE "user" SET image = 'https://raw.githubusercontent.com/smogon/sprites/master/src/_uncategorized/canonical/trainers/gen3/ruby-sapphire/May.png'    WHERE id = 'npc-may';

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
