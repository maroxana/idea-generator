// Handles the Buttondown subscription form.
// Returns true to allow the POST to Buttondown (loaded in a popup window),
// or false to block obvious bot submissions caught by the honeypot field.
function handleSubscribe() {
  const form = document.querySelector(".signup-form");
  const honeypot = form ? form.querySelector('input[name="hp"]') : null;
  const message = document.getElementById("formMessage");

  if (honeypot && honeypot.value.trim() !== "") {
    // Honeypot filled: almost certainly a bot. Silently block.
    if (message) {
      message.textContent = "";
    }
    return false;
  }

  window.open("https://buttondown.com/roxmarie209", "popupwindow");

  if (message) {
    message.textContent = "Almost there — check your inbox to confirm your subscription.";
    message.classList.add("is-success");
  }

  return true;
}
