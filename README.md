# 📦 ParcelPilot

### Smart Delivery Assistant for Delivery Partners

ParcelPilot is a mobile application designed to help delivery partners manage multiple parcels, customer information, and delivery statuses more efficiently.

The idea came from a real-world problem shared by a friend who works in a courier office. While delivering many parcels every day, it can become difficult to remember which customer belongs to which parcel, especially when customers miss calls and call back later.

ParcelPilot was built to make this process simpler.

---

## 🚀 Problem

Delivery partners may handle dozens of parcels every day.

Some common problems include:

* Managing many customer phone numbers
* Remembering which parcel belongs to which customer
* Customers missing calls and calling back later
* Manually entering parcel information
* Tracking delivered and returned parcels
* Keeping track of daily deliveries

---

## 💡 Solution

ParcelPilot provides a simple mobile workspace where delivery partners can:

📷 Scan parcel labels
🔍 Extract customer information
📦 Manage active parcels
☎️ Quickly open the customer's phone number in the default dialer
✅ Mark parcels as delivered
↩️ Mark parcels as returned
📅 Automatically manage daily parcels
📊 View delivery history and statistics

---

## ✨ Features

### 📷 Parcel Scanner

Scan a parcel label using the phone camera.

The application extracts information such as:

* Customer name
* Mobile number
* Delivery address
* Tracking ID / Parcel ID

The extracted information can be reviewed and edited before saving.

---

### 📦 Parcel Management

Manage all active parcels for the current day.

Each parcel contains:

* Parcel image
* Customer name
* Mobile number
* Address
* Tracking ID
* Delivery status

---

### ☎️ Quick Calling

Each parcel has a call button.

When pressed, ParcelPilot opens the phone's default dialer with the customer's number ready to call.

The application does not make the call directly.

---

### ✅ Delivery Status

Parcels can be marked as:

* 🟡 Pending
* 🟢 Delivered
* 🔴 Returned

---

### 📅 Daily Parcel Management

ParcelPilot follows a daily workflow.

At the beginning of a new day:

* The active parcel section starts fresh.
* Previous day's parcels are moved to history.
* Previous data remains available through the history section.

---

### 📊 7-Day History

View delivery activity from the previous seven days.

History includes:

* Date
* Delivered parcels
* Returned parcels

---

### 👤 Profile & Statistics

The profile section allows the delivery partner to manage their profile.

Statistics include:

* Total delivered parcels
* Total returned parcels
* Delivery performance

The profile information can also be edited.

---

## 🛠️ Tech Stack

| Technology              | Purpose                        |
| ----------------------- | ------------------------------ |
| React Native            | Mobile application             |
| Expo                    | Development & Android build    |
| JavaScript / TypeScript | Application logic              |
| Expo Camera             | Parcel scanning                |
| OCR                     | Parcel information extraction  |
| Local Storage           | Parcel and history persistence |
| React Navigation        | Application navigation         |
| Android                 | Target platform                |

---

## 📱 Application Flow

```text
Open ParcelPilot
       ↓
Dashboard
       ↓
Scan Parcel
       ↓
Capture Parcel Label
       ↓
Extract Information
       ↓
Review & Edit
       ↓
Save Parcel
       ↓
Active Packages
       ↓
Call Customer / Deliver / Return
       ↓
Daily History
```

---

## 🎯 Target Users

ParcelPilot is designed primarily for:

* Courier delivery partners
* E-commerce delivery personnel
* Local courier services
* Small delivery businesses
* Independent delivery workers

---

## 🏗️ Project Structure

```text
ParcelPilot/
│
├── assets/
├── components/
├── screens/
├── navigation/
├── services/
├── utils/
├── hooks/
│
├── App.js
├── package.json
├── app.json
└── eas.json
```

---

## ⚙️ Installation

### Prerequisites

Make sure you have:

* Node.js
* npm
* Expo
* Android phone or Android emulator

### Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### Navigate to the project

```bash
cd ParcelPilot
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npx expo start
```

You can then open the application using Expo Go on an Android device.

---

## 📱 Build Android APK

Install EAS CLI:

```bash
npm install -g eas-cli
```

Login to Expo:

```bash
eas login
```

Configure the project:

```bash
eas build:configure
```

Build the Android APK:

```bash
eas build --platform android --profile preview
```

After the build completes, download and install the APK on an Android device.

---

## 🔐 Privacy

ParcelPilot is designed as a prototype/MVP and stores parcel information locally on the device.

Do not use real customer information when testing or sharing the application publicly.

---

## 🔮 Future Improvements

Possible future versions could include:

* 🤖 Improved AI-powered parcel understanding
* 📍 Delivery route optimization
* ☁️ Cloud synchronization
* 👥 Multi-delivery-partner accounts
* 📊 Advanced delivery analytics
* 🌐 Multi-language support
* 🔔 Delivery reminders
* 📦 Barcode and QR-code scanning
* 📞 Improved caller-to-parcel matching

---

## 📸 Screenshots

Add your application screenshots here:

```text
Dashboard
Scanner
Extracted Data
Parcel Details
History
Profile
```

Example:

```markdown
![Dashboard](screenshots/dashboard.png)
![Scanner](screenshots/scanner.png)
![Parcel Details](screenshots/parcel-details.png)
![History](screenshots/history.png)
![Profile](screenshots/profile.png)
```

---

## 🎥 Demo

Add your project demonstration video here.

```text
Demo Video: YOUR_VIDEO_LINK
```

---

## 📥 APK

If you have a public APK download link:

```text
Download ParcelPilot APK:
YOUR_APK_LINK
```

---

## 👨‍💻 Developer

**Mohammed Irfan**

Built as a practical mobile application based on a real-world delivery problem.

---

## ⭐ Feedback

ParcelPilot is an evolving project.

If you have suggestions, ideas, or feedback, feel free to open an issue or start a discussion.

---

## 📄 License

This project is currently intended for educational and prototype purposes.
