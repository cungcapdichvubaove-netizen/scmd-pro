import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "article";
  canonical?: string;
  robots?: string;
  keywords?: string;
}

export function SEOHead({
  title,
  description,
  image,
  url,
  type = "website",
  canonical,
  robots = "index, follow",
  keywords,
}: SEOHeadProps) {
  const canonicalUrl = canonical || url;

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

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
