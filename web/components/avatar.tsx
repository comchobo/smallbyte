import Image from "next/image";

const tones = ["#e8d27a", "#e9eddf", "#f1e6f6", "#e4edf7"];

export function Avatar({ seed }: { seed: string }) {
  let hash = 0;
  for (const character of seed)
    hash = (Math.imul(hash, 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  return (
    <span
      className="illustrated-avatar"
      style={{ backgroundColor: tones[hash % tones.length] }}
    >
      <Image
        src="/avatar.svg"
        width={80}
        height={80}
        alt=""
        className="avatar-art"
      />
    </span>
  );
}
