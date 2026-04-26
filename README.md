# 🩸 Glucose Checker — Alexa Skill for FreeStyle Libre

An unofficial Alexa skill to read blood glucose values from your **FreeStyle Libre 2/3** sensor via your **LibreLinkUp** account.

> ⚠️ **Disclaimer**: This skill is for informational purposes only and is not a certified medical device. Do not use it for clinical decisions. The LibreLink APIs are unofficial and may change without notice.

---

## 🎙️ Voice Commands

| You say | Response |
|---|---|
| *"Alexa, open glucose"* | Opens the skill |
| *"Alexa, ask glucose my blood sugar"* | Current value + trend |
| *"Alexa, ask glucose the history"* | Average, min, max over last few hours |

---

## 📋 Prerequisites

- Free **Amazon Developer** account → [developer.amazon.com](https://developer.amazon.com)
- **LibreLinkUp** account with a connected FreeStyle Libre sensor
- **Node.js** installed on your computer

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/TheSminx/glucose-checker.git
cd glucose-checker
```

### 2. Install dependencies

```bash
cd lambda
npm install
```

### 3. Add your credentials

Open `lambda/index.js` and edit lines 5-6:

```javascript
var LIBRE_EMAIL    = process.env.LIBRE_EMAIL    || 'your-email@example.com';
var LIBRE_PASSWORD = process.env.LIBRE_PASSWORD || 'your-password';
```

### 4. Create the ZIP file

**Mac/Linux:**
```bash
cd lambda
zip -r ../lambda.zip .
```

**Windows (PowerShell):**
```powershell
cd lambda
Compress-Archive -Path * -DestinationPath ..\lambda.zip
```

### 5. Create the Skill on Amazon Developer Console

1. Go to [developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask)
2. Click **"Create Skill"**
3. Name: `Glucose Checker`
4. Primary language: **Italian (IT)** (or your preferred language)
5. Model: **Custom**
6. Hosting: **Alexa-hosted (Node.js)**
7. Click **"Create Skill"**

### 6. Upload the Interaction Model

1. Go to **JSON Editor** in the left menu
2. Select all (`Cmd+A`), delete
3. Paste the contents of `skill-package/interactionModels/custom/it-IT.json`
4. Click **"Save Model"** → **"Build Model"**

### 7. Upload the Code

1. Go to the **"Code"** tab at the top
2. Open `index.js`, select all (`Cmd+A`), delete
3. Paste the contents of `lambda/index.js`
4. Open `package.json` and replace with the contents of `lambda/package.json`
5. Click **"Save"** → **"Deploy"**

### 8. Test the Skill

1. Go to the **"Test"** tab
2. Set to **"Development"**
3. Type: `open glucose`

---

## 📁 Project Structure

```
glucose-checker/
├── lambda/
│   ├── index.js          # Main Lambda code
│   └── package.json      # Node.js dependencies
├── skill-package/
│   ├── skill.json
│   └── interactionModels/
│       └── custom/
│           └── it-IT.json  # Italian interaction model
└── README.md
```

---

## 🔧 Troubleshooting

### The skill doesn't respond
- Make sure the **Deploy** was successful
- Double-check your LibreLink credentials

### 403 Error
- LibreLink may have updated their minimum required version
- Open `lambda/index.js` and update the `version` field in the `getHeaders` function
- The currently required version is `4.16.0`

### "No sensor connected"
- Make sure your sensor is active in the LibreLinkUp app
- Make sure you have accepted the Terms of Service in the app

---

## ☕ Buy Me a Coffee

If this skill helped you, consider buying me a coffee! It helps me keep the project updated when LibreLink changes their APIs.

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.me/EdoardoSmimmo)

---

## 🤝 Contributing

Pull requests are welcome! If LibreLink updates their APIs and the skill stops working, please open an Issue.

---

## 📄 License

MIT — Free for personal use. Not for commercial use.
