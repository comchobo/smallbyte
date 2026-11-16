import Image from "next/image";

export function Logo() {
  return (
    <Image
      className="brand-logo"
      src="/logo.svg"
      alt="smallbyte"
      width={127}
      height={27}
    />
  );
}
