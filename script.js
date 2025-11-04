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
    const response = await fetch(
      "https://chatbot.jenmoon279.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    // Parse the response
    const data = await response.json();

    // Get the assistant's reply from the response
    const assistantReply = data.choices[0].message.content;

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
