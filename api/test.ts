import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    message: 'API function is working',
    path: req.url,
    method: req.method
  });
}
