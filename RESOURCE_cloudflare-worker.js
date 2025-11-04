// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.OPENAI_API_KEY; // Make sure to name your secret OPENAI_API_KEY in the Cloudflare Workers dashboard
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    // Explicitly fail fast if the secret isn't bound in this Worker/environment
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration",
          details:
            "Missing OPENAI_API_KEY in this Worker. Bind the secret on the exact Worker you are calling (e.g., 'chatbot').",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Friendly GET response for humans opening the URL in a browser
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          service: "loreal-chatbot-worker",
          status: "ok",
          message:
            "Send a POST request with Content-Type: application/json and a { messages: [...] } array.",
          example_body: {
            messages: [
              {
                role: "user",
                content: "Please recommend a L’Oréal moisturizer.",
              },
            ],
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Only allow POST with JSON body
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method Not Allowed",
          details:
            "Use POST with Content-Type: application/json and a messages array.",
        }),
        { status: 405, headers: corsHeaders }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({
          error: "Unsupported Content-Type",
          expected: "application/json",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse JSON safely
    let userInput;
    try {
      userInput = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
          details: String(err),
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate and enforce messages
    if (!userInput || !Array.isArray(userInput.messages)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: "Body must include { messages: [...] } as an array.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Server-side guardrail: restrict to L’Oréal/beauty topics
    const systemMessage = {
      role: "system",
      content:
        "You are a helpful beauty assistant for L’Oréal. You can only answer questions about L’Oréal products, beauty routines, skincare, makeup, haircare, and beauty-related topics. If asked anything unrelated, politely decline and invite a L’Oréal/beauty question.",
    };

    const messages = [systemMessage, ...userInput.messages];

    const requestBody = {
      model: "gpt-4o",
      messages,
      max_tokens: 300,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: "Upstream OpenAI error",
          status: response.status,
          details: text,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  },
};
