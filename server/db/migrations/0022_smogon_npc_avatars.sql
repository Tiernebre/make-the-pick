-- Point NPC profile images at raw Smogon trainer sprites from
-- https://github.com/smogon/sprites, served through raw.githubusercontent.com.
-- Prefers canonical (ripped game) trainer sprites where available and falls
-- back to noncanonical (reconstructed) sprites for post-gen4 characters that
-- Smogon only ships in that directory.
--
-- The following NPCs are intentionally left on their Bulbapedia Sugimori URLs:
-- Professors Elm, Rowan, Sycamore, and Magnolia have no trainer sprite in the
-- Smogon repo at all, and Jessie and James are anime-only — the Smogon set
-- only contains in-game trainer classes, so there is no pixel sprite to
-- migrate to for these six.

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
