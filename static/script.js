// Constants
const TYPING_TEXT = "Bot is typing...";

// Load chat history on page load
window.onload = function () {
    let savedChat = JSON.parse(localStorage.getItem("chatHistory")) || [];
    savedChat.forEach(msg => addMessage(msg.sender, msg.text, false));
};

// Send text message
async function sendMessage() {
    let input = document.getElementById("user-input");
    let message = input.value.trim();
    if (message === "") return;

    addMessage("user", message);
    saveMessage("user", message);
    input.value = "";

    // Add typing placeholder
    let typingDiv = addMessage("bot", TYPING_TEXT);

    try {
        let response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) throw new Error("Network error");

        let data = await response.json();
        typingDiv.remove();
        addMessage("bot", data.answer);
        saveMessage("bot", data.answer);
        speak(data.answer);
    } catch (err) {
        typingDiv.remove();
        addMessage("bot", "⚠️ Error: Unable to connect to server.");
    }
}

// Handle image upload
document.getElementById("image-input").addEventListener("change", sendImage);

async function sendImage() {
    let fileInput = document.getElementById("image-input");
    let caption = document.getElementById("user-input").value.trim(); // take caption from text input
    if (!fileInput.files[0]) {
        alert("Please select an image first!");
        return;
    }

    // Show uploaded message with caption
    let displayText = "[Uploaded Image]" + (caption ? `: ${caption}` : "");
    addMessage("user", displayText);
    saveMessage("user", displayText);
    document.getElementById("user-input").value = ""; // clear input

    // Typing placeholder
    let typingDiv = addMessage("bot", TYPING_TEXT);

    try {
        let formData = new FormData();
        formData.append("image", fileInput.files[0]);
        if (caption) formData.append("caption", caption); // send caption along with image

        let response = await fetch("/ask_image", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Image upload failed");

        let data = await response.json();
        typingDiv.remove();
        addMessage("bot", data.answer);
        saveMessage("bot", data.answer);
        speak(data.answer);
    } catch (err) {
        typingDiv.remove();
        addMessage("bot", "⚠️ Error: Image upload failed.");
    }
}


// Add message to chat box
function addMessage(sender, text, scroll = true) {
    let chat = document.querySelector("#chat");

    let div = document.createElement("div");
    div.className = sender === "user" ? "user-msg" : "bot-msg";

    let prefix = sender === "user" ? "👤: " : "🚀: ";
    div.textContent = prefix + text;

    chat.appendChild(div);
    if (scroll) scrollToBottom();
    return div; // return element (useful for typing placeholder)
}

// Save chat in localStorage
function saveMessage(sender, text) {
    let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
    history.push({ sender, text });
    localStorage.setItem("chatHistory", JSON.stringify(history));
}

// Clear chat history
function clearChat() {
    localStorage.removeItem("chatHistory");
    let msgs = document.querySelectorAll(".user-msg, .bot-msg");
    msgs.forEach(m => m.remove());
    alert("Chat history cleared!");
}

// Voice input
function startListening() {
    let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        document.getElementById("user-input").value = transcript;
        // sendMessage();
    };
}

// Text-to-Speech
let isSpeaking = false;

function speak(text) {
    window.speechSynthesis.cancel(); // stop old speech
    let speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    isSpeaking = true;
    window.speechSynthesis.speak(speech);

    speech.onend = () => {
        isSpeaking = false;
    };
}

// Stop TTS on key press
document.addEventListener("keydown", () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
    }
});

// Exit button → back to welcome page
function exitChat() {
    window.location.href = "/";
}

// Open/close side menu
function openMenu() {
    document.getElementById("mySidemenu").style.width = "20dvw";
}
function closeMenu() {
    document.getElementById("mySidemenu").style.width = "0";
}

// Scroll handling
const scrollBtn = document.createElement("button");
scrollBtn.textContent = "↓";
scrollBtn.id = "scrollBtn";
scrollBtn.style.cssText = `
    position: fixed; bottom: 75px; right: 23px;
    display: none; padding: 10px 15px; 
    background: #333; color: white; border: none; border-radius: 28px;
    cursor: pointer; font-size: 14px; z-index: 1000;
`;
document.body.appendChild(scrollBtn);
scrollBtn.onclick = scrollToBottom;

function scrollToBottom() {
    let chat = document.querySelector("#chat");
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
}

// Auto scroll on page load
window.addEventListener("load", scrollToBottom);

// Show button only when user scrolls up
document.querySelector("#chat").addEventListener("scroll", function () {
    let chat = this;
    if (chat.scrollHeight - chat.scrollTop > chat.clientHeight + 100) {
        scrollBtn.style.display = "block";
    } else {
        scrollBtn.style.display = "none";
    }
});

// Enter key as "Send"
document.getElementById("user-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});
