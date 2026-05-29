import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  url: string;
  type?: "website" | "article";
  canonical?: string;
  robots?: string;
  keywords?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: string;
  preloadImage?: string;
  preloadImageSrcSet?: string;
  preloadImageSizes?: string;
}

export function SEOHead({
  title,
  description,
  image,
  imageWidth = 1200,
  imageHeight = 630,
  url,
  type = "website",
  canonical,
  robots = "index, follow",
  keywords,
  publishedTime,
  modifiedTime,
  locale = "vi_VN",
  preloadImage,
  preloadImageSrcSet,
  preloadImageSizes,
}: SEOHeadProps) {
  const canonicalUrl = canonical ?? url;
  const siteName = "SCMD Pro";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <meta
        name="keywords"
        content={keywords || "quản lý an ninh, tuần tra bảo vệ, scmd pro, b2b saas"}
      />
      <link rel="canonical" href={canonicalUrl} />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {preloadImage && (
        <link
          rel="preload"
          as="image"
          href={preloadImage}
          imageSrcSet={preloadImageSrcSet}
          imageSizes={preloadImageSizes}
          // @ts-ignore - fetchpriority is a newer attribute
          fetchPriority="high"
        />
      )}

      <meta name="application-name" content={siteName} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <meta name="theme-color" content="#3B82F6" />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={locale} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content={String(imageWidth)} />}
      {image && <meta property="og:image:height" content={String(imageHeight)} />}
      {image && <meta property="og:image:alt" content={title} />}

      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@scmdpro" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {image && <meta name="twitter:image:alt" content={title} />}
    </Helmet>
  );
}
