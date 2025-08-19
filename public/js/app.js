// app.js
window.addEventListener("load", async () => {
  // ... your existing code (unchanged)

  /**
   * Newsletter form handling
   */
  function initNewsletterForm() {
    const form = document.querySelector(".newsletter-form");
    if (!form) return;

    const input = form.querySelector('input[name="email"]');
    const button = form.querySelector("button");

    // Create a temporary message element
    const message = document.createElement("div");
    message.style.fontSize = "0.875rem";
    message.style.marginTop = "10px";
    form.appendChild(message);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = input.value.trim();
      if (!email) return;

      button.disabled = true;
      message.textContent = "";
      message.style.color = "#fff";

      try {
        const response = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          message.textContent = "✅ You're subscribed!";
          message.style.color = "#22c55e"; // green
          input.value = "";

          setTimeout(() => {
            message.textContent = "";
          }, 4000);
        } else {
          const data = await response.json();
          message.textContent = data.error || "❌ Something went wrong.";
          message.style.color = "#f43f5e"; // red
        }
      } catch (error) {
        console.error("Newsletter Error:", error);
        message.textContent = "❌ Network issue. Try again.";
        message.style.color = "#f43f5e";
      }

      button.disabled = false;
    });
  }

  // Init the newsletter form once footer is loaded
  initNewsletterForm();
});
