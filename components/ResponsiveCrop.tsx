import Image from "next/image";

type Props = {
  desktop: string;
  phone: string;
  alt: string;
  /** Desktop intrinsic size (2x). */
  width: number;
  height: number;
  /** Phone intrinsic size (2x). Defaults to 3:4 1200×1600. */
  phoneWidth?: number;
  phoneHeight?: number;
  sizes: string;
  quality?: number;
  className?: string;
};

/**
 * Desktop + phone marketing crops (see public/design/MARKETING-CROPS.md).
 * Phone frame shown at max-width 600px via CSS; both are next/image optimized.
 */
export function ResponsiveCrop({
  desktop,
  phone,
  alt,
  width,
  height,
  phoneWidth = 1200,
  phoneHeight = 1600,
  sizes,
  quality = 75,
  className,
}: Props) {
  return (
    <span className={`responsive-crop${className ? ` ${className}` : ""}`}>
      <Image
        className="responsive-crop-desktop"
        src={desktop}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        quality={quality}
      />
      <Image
        className="responsive-crop-phone"
        src={phone}
        alt=""
        width={phoneWidth}
        height={phoneHeight}
        sizes="100vw"
        quality={quality}
        aria-hidden
      />
    </span>
  );
}
