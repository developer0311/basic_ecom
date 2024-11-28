document.addEventListener("DOMContentLoaded", () => {
    const sendOtpButton = document.getElementById("sendOtpButton");
    const emailInput = document.getElementById("email");
    const messageDiv = document.getElementById("message");

    // Handle OTP request
    sendOtpButton.addEventListener("click", async () => {
        const email = emailInput.value.trim();

        if (!email) {
            messageDiv.innerHTML = `<div class="alert alert-danger">Please enter a valid email.</div>`;
            return;
        }

        try {
            const response = await fetch("/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                messageDiv.innerHTML = `<div class="alert alert-success">OTP sent successfully to ${email}!</div>`;
            } else {
                messageDiv.innerHTML = `<div class="alert alert-danger">${data.error || "Failed to send OTP."}</div>`;
            }
        } catch (err) {
            console.error("Error sending OTP:", err);
            messageDiv.innerHTML = `<div class="alert alert-danger">Something went wrong. Please try again later.</div>`;
        }
    });
});
