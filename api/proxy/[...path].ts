import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configurable upstream base URL
const UPSTREAM_BASE = process.env.ML_UPSTREAM_BASE || 'http://34.124.200.4:8000';

// Headers to omit (hop-by-hop headers)
const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length', // Let fetch set this automatically
]);

/**
 * Proxy endpoint that forwards requests from HTTPS frontend to HTTP ML backend
 * Frontend calls: /api/proxy/<any-path-and-params>
 * Forwards to: http://34.124.200.4:8000/<any-path-and-params>
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure we always return JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  // Extract the path and query string from the catch-all route
  const path = Array.isArray(req.query.path) 
    ? req.query.path.join('/') 
    : req.query.path || '';
  
  // Reconstruct query string
  const queryParams = new URLSearchParams();
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== 'path' && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, String(v)));
      } else {
        queryParams.set(key, String(value));
      }
    }
  });
  
  const queryString = queryParams.toString();
  const upstreamPath = queryString 
    ? `${path}?${queryString}` 
    : path;
  
  // Construct upstream URL, handling trailing slashes
  const baseUrl = UPSTREAM_BASE.endsWith('/') ? UPSTREAM_BASE.slice(0, -1) : UPSTREAM_BASE;
  const upstreamUrl = upstreamPath 
    ? `${baseUrl}/${upstreamPath}` 
    : baseUrl;
  
  // Log request
  console.log(`[proxy] ${req.method} ${upstreamUrl}`);
  
  try {
    // Prepare headers - omit hop-by-hop headers
    const headers: HeadersInit = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lowerKey) && value !== undefined) {
        if (Array.isArray(value)) {
          headers[key] = value.join(', ');
        } else {
          headers[key] = value;
        }
      }
    });
    
    // Prepare request options
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };
    
    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      const contentType = headers['content-type'] || headers['Content-Type'] || '';
      
      // If body is already a string/buffer, use it directly
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        fetchOptions.body = req.body;
      } else if (contentType.includes('application/json') || contentType === '') {
        // For JSON or unknown content type, stringify the body
        fetchOptions.body = JSON.stringify(req.body);
      } else {
        // For other content types, try to convert to string
        fetchOptions.body = String(req.body);
      }
    }
    
    // Forward request to upstream
    const upstreamResponse = await fetch(upstreamUrl, fetchOptions);
    
    // Get response body as buffer (binary safe)
    const responseBody = await upstreamResponse.arrayBuffer();
    
    // Get content type
    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    
    // Log response
    console.log(`[proxy] ${req.method} ${upstreamUrl} -> ${upstreamResponse.status}`);
    
    // Set response headers
    upstreamResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Omit hop-by-hop headers from response
      if (!HOP_BY_HOP_HEADERS.has(lowerKey)) {
        res.setHeader(key, value);
      }
    });
    
    // Set status and send response
    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(responseBody));
    
  } catch (error) {
    console.error('[proxy] error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(502).json({
      error: 'Proxy error',
      message: errorMessage,
    });
  }
}
