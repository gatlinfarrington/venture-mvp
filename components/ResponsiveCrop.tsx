import Image from "next/image";

type Props = {
  desktop: string;
  /** When omitted, the desktop image is used at every viewport. */
  phone?: string;
  alt: string;
  /** Desktop intrinsic size (2x). */
  width: number;
  height: number;
  /** Phone intrinsic size (2x). */
  phoneWidth?: number;
  phoneHeight?: number;
  sizes: string;
  quality?: number;
  className?: string;
};

/**
 * Desktop + optional phone marketing crops (see public/design/MARKETING-CROPS.md).
 */
export function ResponsiveCrop({
  desktop,
  phone,
  alt,
  width,
  height,
  phoneWidth,
  phoneHeight,
  sizes,
  quality = 75,
  className,
}: Props) {
  const only = !phone || phone === desktop;
  return (
    <span className={`responsive-crop${className ? ` ${className}` : ""}`}>
      <Image
        className={`responsive-crop-desktop${only ? " responsive-crop-only" : ""}`}
        src={desktop}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        quality={quality}
      />
      {!only ? (
        <Image
          className="responsive-crop-phone"
          src={phone}
          alt=""
          width={phoneWidth ?? width}
          height={phoneHeight ?? height}
          sizes="100vw"
          quality={quality}
          aria-hidden
        />
      ) : null}
    </span>
  );
}
