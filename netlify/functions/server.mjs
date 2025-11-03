import { createRequestHandler } from '@remix-run/node';
import { installGlobals } from '@remix-run/node';

installGlobals();

// Cache the handler
let handler;

async function getHandler() {
  if (!handler) {
    // Import the server build
    const build = await import('../../build/server/index.js');
    
    handler = createRequestHandler({
      build,
      mode: process.env.NODE_ENV || 'production',
    });
  }
  return handler;
}

export const handler = async function(event, context) {
  const requestHandler = await getHandler();
  
  // Convert Netlify event to Remix request
  const url = new URL(event.rawUrl);
  
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: new Headers(event.headers),
    body: event.body && event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64').toString() 
      : event.body,
  });

  try {
    const response = await requestHandler(request, {});
    
    // Convert Remix response to Netlify response
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};

