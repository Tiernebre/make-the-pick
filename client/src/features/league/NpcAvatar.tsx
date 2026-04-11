import { Avatar, type AvatarProps } from "@mantine/core";

interface NpcAvatarProps extends Omit<AvatarProps, "src" | "alt" | "children"> {
  name: string;
  image: string | null;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function backgroundColorFor(name: string): string {
  const hue = hashName(name) % 360;
  return `hsl(${hue}, 45%, 38%)`;
}

/**
 * Spoofs a Google-profile-style bubble for NPC trainers: full-body Sugimori
 * sprites are cropped to the top of the image so the head lands inside the
 * circle, and the container gets a deterministic background color so the
 * bubble still feels filled when the sprite is narrower than the container.
 */
export function NpcAvatar({ name, image, style, ...rest }: NpcAvatarProps) {
  const background = backgroundColorFor(name);
  return (
    <Avatar
      {...rest}
      src={image ?? undefined}
      alt={name}
      data-npc-avatar-root
      style={{ backgroundColor: background, ...style }}
      styles={{
        image: {
          objectFit: "cover",
          objectPosition: "center top",
        },
      }}
    >
      {initialsOf(name)}
    </Avatar>
  );
}
