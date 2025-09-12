from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import base64, time

app = Flask(__name__)

# Initialize OpenAI client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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"
)

# Retry helper function
def ask_openai_with_retry(func, retries=3, delay=2):
    for attempt in range(retries):
        try:
            return func()
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(delay)  # wait before retrying
            else:
                raise e

@app.route("/")
def welcome():
    return render_template("welcome.html")

@app.route("/chat")
def chat_page():
    return render_template("chat.html")

@app.route("/ask", methods=["POST"])
def ask():
    user_message = request.json.get("message")

    def request_func():
        return client.chat.completions.create(
            model="tngtech/deepseek-r1t2-chimera:free",
            messages=[{"role": "user", "content": user_message}]
        )

    try:
        response = ask_openai_with_retry(request_func)
        answer = response.choices[0].message.content
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"answer": f"API request failed: {str(e)}"}), 500

@app.route("/ask_image", methods=["POST"])
def ask_image():
    file = request.files.get("image")
    caption = request.form.get("caption", "Please solve this problem from the image.")

    if not file:
        return jsonify({"answer": "No image uploaded"}), 400

    # Convert image to base64
    image_bytes = file.read()
    base64_img = base64.b64encode(image_bytes).decode("utf-8")

    # Detect correct MIME type (png, jpg, etc.)
    import mimetypes
    mime_type = mimetypes.guess_type(file.filename)[0] or "image/png"
    image_url = f"data:{mime_type};base64,{base64_img}"

    def request_func():
        return client.chat.completions.create(
            model="tngtech/deepseek-r1t2-chimera:free",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": caption},
                        {"type": "image_url", "image_url": image_url}
                    ],
                }
            ],
        )

    try:
        response = ask_openai_with_retry(request_func)
        answer = response.choices[0].message.content
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"answer": f"API request failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
