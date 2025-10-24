import { NextApiRequest, NextApiResponse } from 'next'
import * as fs from 'fs'
import * as path from 'path'
import { errorLog } from 'src/libs/utils/logger'

/**
 * Image proxy API to handle Notion's expiring signed URLs
 * 
 * Usage: /api/image-proxy?url=https://notion-image-url
 * 
 * This proxies Notion images through our server to:
 * 1. Bypass CORS issues
 * 2. Cache images (Next.js handles caching automatically)
 * 3. Avoid expired presigned URL issues
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL parameter' })
  }

  // Unwrap nested/encoded proxy URLs. Some images may already have been
  // proxied (e.g. /api/image-proxy?url=%2Fapi%2Fimage-proxy%3Furl%3Dhttps%3A...) so
  // we iteratively decode and extract the innermost `url=` value until we
  // recover an absolute http(s) URL. Includes safeguards (max iterations)
  // and diagnostic logs to help with debugging nested encodings.
  const unwrapUrl = (input: string) => {
    let cur = String(input)
    const maxRounds = 12

    for (let round = 0; round < maxRounds; round++) {
      // If we already have an absolute URL, stop
      if (/^https?:\/\//i.test(cur)) {
        console.log(`[image-proxy] unwrap: got absolute url at round ${round}`)
        break
      }

      // Normalize plus signs (common in query strings as spaces)
      const plusNormalized = cur.replace(/\+/g, ' ')

      // Try to decode; if decodeURIComponent fails, stop further decoding
      let decoded: string
      try {
        decoded = decodeURIComponent(plusNormalized)
      } catch (e) {
        // If decoding throws, keep the current string and stop iterating
        console.log('[image-proxy] unwrap: decodeURIComponent failed at round', round, e && (e as Error).message)
        break
      }

      // If decoded contains a nested proxy with ?url= (possibly multiple levels),
      // extract the last occurrence (unwrap from the inside-out)
      const lastQuestionUrl = decoded.lastIndexOf('?url=')
      const lastAmpUrl = decoded.lastIndexOf('&url=')
      const lastUrlIndex = Math.max(lastQuestionUrl, lastAmpUrl)
      if (lastUrlIndex !== -1) {
        const candidate = decoded.substring(lastUrlIndex + 5)
        if (candidate && candidate !== cur) {
          cur = candidate
          console.log('[image-proxy] unwrap: extracted after last url= at round', round)
          continue
        }
      }

      // If decoded includes /api/image-proxy and a first ?url=, try extracting after that
      const proxyIndex = decoded.indexOf('/api/image-proxy')
      const firstUrlParam = decoded.indexOf('?url=')
      if (proxyIndex !== -1 && firstUrlParam !== -1) {
        const candidate = decoded.substring(firstUrlParam + 5)
        if (candidate && candidate !== cur) {
          cur = candidate
          console.log('[image-proxy] unwrap: extracted after first ?url= at round', round)
          continue
        }
      }

      // If decode made progress (different string), continue to next round
      if (decoded !== cur) {
        cur = decoded
        console.log('[image-proxy] unwrap: decoding progressed at round', round)
        continue
      }

      // No progress made; stop
      break
    }

    // As a final attempt, repeatedly decode until we either get an http(s) URL
    // or reach a small iteration bound.
    for (let i = 0; i < 6 && !/^https?:\/\//i.test(cur); i++) {
      try {
        cur = decodeURIComponent(cur)
        if (/^https?:\/\//i.test(cur)) break
      } catch (e) {
        break
      }
    }

    return cur
  }

  const finalUrl = unwrapUrl(url)
  console.log('[image-proxy] received url=', url)
  console.log('[image-proxy] finalUrl=', finalUrl)

  // Fallback: if unwrapping didn't produce an absolute URL, try to find an
  // embedded https substring (possibly percent-encoded) and decode from there.
  let resolvedUrl = finalUrl
  if (!/^https?:\/\//i.test(resolvedUrl)) {
    const idx = url.toString().search(/https?:/i)
    if (idx !== -1) {
      let candidate = url.toString().substring(idx)
      for (let i = 0; i < 6 && !/^https?:\/\//i.test(candidate); i++) {
        try {
          candidate = decodeURIComponent(candidate)
        } catch (e) {
          break
        }
      }
      if (/^https?:\/\//i.test(candidate)) {
        resolvedUrl = candidate
      }
    }
  }

  console.log('[image-proxy] resolvedUrl=', resolvedUrl)

  // Heuristic: if the resolved URL looks like a partial presigned S3 URL
  // (for example it contains X-Amz-Algorithm but is missing X-Amz-Signature),
  // try to recover additional X-Amz parameters from the original raw input
  // (sometimes params are split across encoded layers). This is a best-effort
  // recovery and should only be used for diagnostics / retry; it may not
  // restore a valid signature if the input is truncated.
  try {
    if (resolvedUrl.includes('X-Amz-Algorithm') && !resolvedUrl.includes('X-Amz-Signature')) {
      const raw = String(url)
      let decodedRaw = raw
      try {
        decodedRaw = decodeURIComponent(raw)
      } catch (e) {
        // ignore decode errors and fall back to raw
      }

      // Find all X-Amz-...= tokens in the decoded raw input
      const amzMatches = decodedRaw.match(/(X-Amz-[A-Za-z0-9_-]+=[^&\s]+)/g)
      if (amzMatches && amzMatches.length) {
        try {
          const u = new URL(resolvedUrl)
          const existing = new Set(Array.from(u.searchParams.keys()))

          for (const token of amzMatches) {
            const [k, ...rest] = token.split('=')
            const v = rest.join('=')
            if (!existing.has(k)) {
              u.searchParams.append(k, v)
            }
          }

          const merged = u.toString()
          console.log('[image-proxy] heuristic: merged additional X-Amz params into resolvedUrl')
          resolvedUrl = merged
        } catch (e) {
          console.log('[image-proxy] heuristic merge failed', e && (e as Error).message)
        }
      }
    }
  } catch (e) {
    // swallow heuristic errors to avoid masking the original problem
    console.log('[image-proxy] heuristic step error', e && (e as Error).message)
  }

  // Validate that it's a Notion/AWS URL for security
  if (!resolvedUrl.includes('amazonaws.com') && !resolvedUrl.includes('notion')) {
    return res.status(403).json({ error: 'URL not allowed' })
  }

  try {
    // Fetch the image from Notion with retry logic
    let imageResponse
    let lastError

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
  imageResponse = await fetch(resolvedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NotionImageProxy/1.0)',
          },
        })

        if (imageResponse.ok) {
          break
        }

        lastError = new Error(`HTTP ${imageResponse.status}`)
        
        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
        }
      } catch (err) {
        lastError = err
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
        }
      }
    }

    if (!imageResponse || !imageResponse.ok) {
      const err = lastError || new Error('Failed to fetch image')
      // Record error to disk for later inspection
      try {
        const logDir = path.resolve(process.cwd(), 'logs')
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
        const logFile = path.join(logDir, 'image-proxy-errors.jsonl')
        // Masking helper for sensitive query params
        const maskPresigned = (urlStr: any) => {
          try {
            const u = new URL(String(urlStr))
            for (const key of Array.from(u.searchParams.keys())) {
              if (/^X-Amz-/i.test(key) || /signature|token|credential/i.test(key)) {
                u.searchParams.set(key, '[redacted]')
              }
            }
            return u.toString()
          } catch (e) {
            try {
              return String(urlStr).slice(0, 2000)
            } catch { return '' }
          }
        }
        const record = {
          timestamp: new Date().toISOString(),
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          receivedUrl: String(url).slice(0, 2000),
          rawRequestUrl: String(req.url).slice(0, 2000),
          finalUrl: finalUrl?.slice ? finalUrl.slice(0, 2000) : finalUrl,
          resolvedUrl: resolvedUrl?.slice ? resolvedUrl.slice(0, 2000) : resolvedUrl,
          maskedResolvedUrl: maskPresigned(resolvedUrl),
          status: imageResponse ? imageResponse.status : null,
          message: err instanceof Error ? err.message : String(err),
          userAgent: req.headers['user-agent'],
        }
        fs.appendFileSync(logFile, JSON.stringify(record) + '\n')
      } catch (fsErr) {
        errorLog('[image-proxy] failed to write error log', fsErr)
      }

      throw err
    }

    // Get the image buffer
    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Set aggressive cache headers (cache for 1 year)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000')
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=31536000')
    res.setHeader('Content-Length', imageBuffer.byteLength)

    // Send the image
    res.status(200).send(Buffer.from(imageBuffer))
  } catch (error) {
    console.error('Error proxying image:', error)

    // Write a persistent record for production debugging
    try {
      const logDir = path.resolve(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
      const logFile = path.join(logDir, 'image-proxy-errors.jsonl')
      const maskPresigned = (urlStr: any) => {
        try {
          const u = new URL(String(urlStr))
          for (const key of Array.from(u.searchParams.keys())) {
            if (/^X-Amz-/i.test(key) || /signature|token|credential/i.test(key)) {
              u.searchParams.set(key, '[redacted]')
            }
          }
          return u.toString()
        } catch (e) {
          try {
            return String(urlStr).slice(0, 2000)
          } catch { return '' }
        }
      }

      const record = {
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        receivedUrl: String(url).slice(0, 2000),
        rawRequestUrl: String(req.url).slice(0, 2000),
        finalUrl: finalUrl?.slice ? finalUrl.slice(0, 2000) : finalUrl,
        resolvedUrl: resolvedUrl?.slice ? resolvedUrl.slice(0, 2000) : resolvedUrl,
        maskedResolvedUrl: maskPresigned(resolvedUrl),
        message: error instanceof Error ? error.message : String(error),
        stack: error && (error as any).stack ? String((error as any).stack).slice(0, 2000) : undefined,
        userAgent: req.headers['user-agent'],
      }
      fs.appendFileSync(logFile, JSON.stringify(record) + '\n')
    } catch (fsErr) {
      errorLog('[image-proxy] failed to write error log', fsErr)
    }
    // Try to notify admin via Slack webhook (best-effort, non-blocking)
    try {
      const slackWebhook = process.env.SLACK_WEBHOOK
      if (slackWebhook) {
        try {
          // local masking helper (don't leak presigned tokens)
          const maskPresignedLocal = (uStr: any) => {
            try {
              const uu = new URL(String(uStr))
              for (const k of Array.from(uu.searchParams.keys())) {
                if (/^X-Amz-/i.test(k) || /signature|token|credential/i.test(k)) {
                  uu.searchParams.set(k, '[redacted]')
                }
              }
              return uu.toString()
            } catch (e) {
              try { return String(uStr).slice(0, 2000) } catch { return '' }
            }
          }

          const rawRequestUrl = String(req.url).slice(0, 2000)
          const maskedResolved = maskPresignedLocal(resolvedUrl)
          const slackBody = {
            text: `:warning: image-proxy failed\n• requested: ${rawRequestUrl}\n• resolved: ${maskedResolved}\n• message: ${error instanceof Error ? error.message : String(error)}`
          }
          // fire-and-forget
          fetch(slackWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackBody),
          }).catch((e) => console.log('[image-proxy] slack notify failed', e && (e as Error).message))
        } catch (e) {
          console.log('[image-proxy] slack notify error', e && (e as Error).message)
        }
      }
    } catch (e) {
      console.log('[image-proxy] slack notify outer error', e && (e as Error).message)
    }

    // Return a lightweight placeholder SVG instead of 500 to improve UX
    try {
      const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' role='img' aria-label='Image unavailable'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-family='-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' font-size='18'>Image unavailable</text></svg>`
      res.setHeader('Content-Type', 'image/svg+xml')
      // Short cache to allow quick retries (10 minutes)
      res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600')
      return res.status(200).send(placeholderSvg)
    } catch (e) {
      // Final fallback: JSON 500 if sending SVG fails
      return res.status(500).json({ error: 'Failed to proxy image', details: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}

// Disable body parser for this API route (we're handling binary data)
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
}
