<div align="center">
  <img src="assets/mac_icon.png" alt="Sonar Code Editor Icon" width="80" height="80" />
  <h1>🤝 Contributing to Sonar Code Editor</h1>
</div>

First off, thank you for considering contributing to **Sonar Code Editor**! We welcome contributions from everyone. Whether it's a bug fix, new feature, or documentation update, your help is appreciated.

---

## 🛠️ How to Contribute

### 🍴 1.⃣ Fork the Repository

Click the **"Fork"** button at the top right of this repository's page to create a copy of the project in your own GitHub account. **Please base your changes on the `development` branch.**

### 💻 2.⃣ Clone Your Fork

Clone the forked repository to your local machine and checkout the `development` branch:

```bash
git clone https://github.com/rkvishwa/Sonar-Code-Editor.git
cd Sonar-Code-Editor
git checkout development
```

### 🌱 3.⃣ Create a Branch

Create a new branch for your feature or bugfix **based on the `development` branch**:

```bash
git checkout -b feature/your-feature-name
```

_(Use `bugfix/` or `fix/` prefix for bug fixes)_

### 🛠️ 4.0 Make Your Changes

Make the necessary code changes. Ensure your code follows the existing style and conventions of the project.

**If you are working on an issue:**

- Before starting, comment on the issue stating that you are working on it. This helps avoid duplicate work by others.

### 📝 5.0 Commit Your Changes

Commit your changes with a clear and descriptive commit message:

```bash
git add .
git commit -m "feat: concise description of your feature #<issue_number>"
```

_Always include the issue number (e.g., `#12`) in your commit message if your changes address a specific issue._

### 🚀 6.0 Push to Your Fork

Push the changes up to your repository:

```bash
git push origin feature/your-feature-name
```

### 🔄 7.0 Create a Pull Request (PR)

1. Go to the original Sonar Code Editor repository on GitHub.
2. Click on the **Pull Requests** tab, then the **New Pull Request** button.
3. Click the link to **compare across forks**.
4. Select your fork and branch on the right side.
5. Provide a clear title and detailed description for your PR.
6. **Always target your PR to the `development` branch.**

- The `main` branch is stable and only receives tested changes.
- If you open a PR to `main`, it will be closed and you will be asked to re-target it to `development`.

7. Click **Create Pull Request**.

All testing and review will happen in the `development` branch. Only after successful testing will changes be merged into `main`.

We will review your PR as soon as possible. Thank you for your contribution! 🎉 🎉
