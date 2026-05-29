import React from "react";

interface PictureProps {
  src: string; // Đường dẫn ảnh WebP
  srcSet?: string; // Danh sách các kích thước ảnh WebP (Responsive)
  fallbackSrc: string; // Đường dẫn ảnh PNG/JPG
  fallbackSrcSet?: string; // Danh sách các kích thước ảnh PNG/JPG (Responsive)
  sizes?: string; // Thuộc tính xác định kích thước hiển thị thực tế trên màn hình
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  style?: React.CSSProperties;
  onError?: () => void;
}

export function Picture({
  src,
  fallbackSrc,
  alt,
  className,
  width,
  height,
  loading,
  decoding,
  fetchPriority,
  srcSet,
  fallbackSrcSet,
  sizes,
  style,
  onError,
}: PictureProps) {
  const aspectStyle: React.CSSProperties = (width && height) 
    ? { aspectRatio: `${width} / ${height}`, objectFit: 'cover' } 
    : {};

  return (
    <picture>
      <source srcSet={srcSet || src} type="image/webp" sizes={sizes} />
      <img
        src={fallbackSrc}
        srcSet={fallbackSrcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        className={className}
        style={{ ...aspectStyle, ...style }}
        onError={onError}
      />
    </picture>
  );
}