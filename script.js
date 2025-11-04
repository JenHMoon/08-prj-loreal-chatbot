/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user's message
  const message = userInput.value.trim();
  if (!message) return;

  // Show user message in chat
  chatWindow.innerHTML += `<div><strong>You:</strong> ${message}</div>`;

  // Show loading message
  chatWindow.innerHTML += `<div><strong>Assistant:</strong> <em>Thinking...</em></div>`;

  // Clear input
  userInput.value = "";

  try {
    // Call Cloudflare Worker with OpenAI API
    const response = await fetch("https://chatbot.jenmoon279.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful beauty assistant for L'Oréal. You can only answer questions about L'Oréal products, beauty routines, skincare, makeup, haircare, and beauty-related topics. If someone asks about anything unrelated to L'Oréal or beauty, politely decline and redirect them to ask about L'Oréal products or beauty advice.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });
    // If the response is not OK, surface the error text to help debugging
    if (!response.ok) {
      const errorText = await response.text().catch(() => "(no body)");
      console.error("Worker error:", response.status, errorText);
      chatWindow.innerHTML = chatWindow.innerHTML.replace(
        "<div><strong>Assistant:</strong> <em>Thinking...</em></div>",
        `<div><strong>Assistant:</strong> <em>Error ${response.status}: ${errorText}</em></div>`
      );
      return;
    }

    // Parse the response JSON
    const data = await response.json();

    // If Worker returned an error object (some deployments return 200 with error payload), surface it
    if (data && data.error) {
      const msg =
        typeof data.error === "string"
          ? data.error
          : data.error.message || JSON.stringify(data.error);
      console.error("Worker error payload:", data);
      chatWindow.innerHTML = chatWindow.innerHTML.replace(
        "<div><strong>Assistant:</strong> <em>Thinking...</em></div>",
        `<div><strong>Assistant:</strong> <em>${msg}</em></div>`
      );
      return;
    }

    // Validate shape before reading content
    const assistantReply =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

    if (!assistantReply) {
      console.error("Unexpected response shape:", data);
      chatWindow.innerHTML = chatWindow.innerHTML.replace(
        "<div><strong>Assistant:</strong> <em>Thinking...</em></div>",
        `<div><strong>Assistant:</strong> <em>Sorry, unexpected response from server.</em></div>`
      );
      return;
    }

    // Remove loading message and show actual response
    const chatMessages = chatWindow.innerHTML.replace(
      "<div><strong>Assistant:</strong> <em>Thinking...</em></div>",
      `<div><strong>Assistant:</strong> ${assistantReply}</div>`
    );
    chatWindow.innerHTML = chatMessages;
  } catch (error) {
    // Handle any errors
    console.error("Error calling API:", error);
    chatWindow.innerHTML = chatWindow.innerHTML.replace(
      "<div><strong>Assistant:</strong> <em>Thinking...</em></div>",
      "<div><strong>Assistant:</strong> <em>Sorry, there was an error. Please try again.</em></div>"
    );
  }
});
