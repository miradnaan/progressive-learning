# Contributing to Progressive Learning

Thank you for your interest in contributing to **Progressive Learning**! We welcome contributions from developers of all skill levels.

---

## 📋 Code of Conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🛠️ Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/progressive-learning.git
   cd progressive-learning
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Configure your environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local MySQL credentials
   ```
5. **Initialize database schema**:
   ```bash
   npm run init-db
   ```

---

## 🌿 Branching Strategy

- `main` is our production-ready branch.
- Create topic branches following these naming conventions:
  - `feature/<feature-name>` for new features
  - `fix/<bug-description>` for bug fixes
  - `docs/<doc-change>` for documentation updates
  - `refactor/<cleanup-scope>` for code refactoring

```bash
git checkout -b feature/interactive-code-runner
```

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools

*Example:* `feat(quiz): add timer countdown to final exams`

---

## 🚀 Submitting a Pull Request

1. Ensure your code passes syntax and lint checks:
   ```bash
   node --check server.js routes/*.js middleware/*.js config/*.js
   ```
2. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
3. Open a Pull Request on GitHub against `main`.
4. Fill out the PR template with clear context, testing steps, and screenshots (for UI changes).

Thank you for helping make Progressive Learning better!
