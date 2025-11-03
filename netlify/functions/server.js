import { createRequestHandler } from '@remix-run/node';
import { installGlobals } from '@remix-run/node';

installGlobals();

// Import the server build
let build;

try {
  build = await import('../../build/server/index.js');
} catch (error) {
  console.error('Failed to load server build:', error);
  throw error;
}

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || 'production',
});

export default async function netlifyHandler(event, context) {
  // Convert Netlify event to Web Request
  const url = new URL(event.rawUrl);
  
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: new Headers(event.headers),
    body: event.body && event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64').toString() 
      : event.body,
  });

  try {
    const response = await handler(request, {});
    
    // Convert Web Response to Netlify response
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await response.text();

    return {
      statusCode: response.status,
      headers,
      body,
    };
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}

