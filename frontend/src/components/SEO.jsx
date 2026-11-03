import { Helmet } from 'react-helmet-async'

const BASE_URL = 'https://studdybuddy.a5x.in'
const DEFAULT_IMAGE = `${BASE_URL}/studdybuddy-logo.png`

/**
 * SEO component — sets unique title, description, canonical, OG tags per route
 * Usage: <SEO title="..." description="..." path="/resources" />
 */
export default function SEO({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
}) {
  const fullTitle = title
    ? `${title} — Studdy Buddy`
    : 'Studdy Buddy – Robotics, IoT & AI Courses for Students'

  const metaDesc = description ||
    'Studdy Buddy by A5X Industries — structured Robotics, IoT, AI/ML and Embedded Systems courses for school students, with expert mentors, doubt resolution and peer community.'

  const canonical = `${BASE_URL}${path}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {noindex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
      }
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:site_name" content="Studdy Buddy — A5X Industries" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
