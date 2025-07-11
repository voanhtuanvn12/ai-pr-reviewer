# AI PR Reviewer 🤖

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue.svg)](https://github.com/features/actions)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![GitHub release](https://img.shields.io/github/release/tuan-vo/my-pr-reviewer.svg)](https://github.com/tuan-vo/my-pr-reviewer/releases)
[![GitHub stars](https://img.shields.io/github/stars/tuan-vo/my-pr-reviewer.svg)](https://github.com/tuan-vo/my-pr-reviewer/stargazers)

> An intelligent GitHub Action that provides automated code review for Pull Requests using AI

## ✨ Features

- 🤖 **AI-Powered Reviews**: Leverages advanced AI models to analyze code changes
- 📝 **Context-Aware Analysis**: Reviews code with comprehensive context understanding
- 🔄 **Multi-Provider Support**: Works with GitHub Copilot, OpenAI, and Anthropic
- 💬 **Inline Comments**: Provides detailed feedback directly on code lines
- 🎯 **Smart Filtering**: Focuses on meaningful changes and respects exclusion patterns
- ⚡ **Fast & Efficient**: Quick analysis without overwhelming noise
- 🛡️ **Security-First**: Secure handling of tokens and API keys

> **⚠️ Current Limitation**: This version currently only supports **GitHub Copilot API**. OpenAI and Anthropic integrations are planned for future releases.

## 🚀 Quick Start

Add this workflow to your repository at `.github/workflows/ai-pr-review.yml`:

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    name: AI Code Review
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: AI PR Review
        uses: tuan-vo/my-pr-reviewer@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'copilot'
```

### 💬 Comment-Triggered Reviews (Optional)

You can also set up the action to run when users comment on PRs. Add this additional workflow:

```yaml
name: AI PR Review on Comment

on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    if: github.event.issue.pull_request && contains(github.event.comment.body, '/review')
    name: AI Code Review on Comment
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: AI PR Review
        uses: tuan-vo/my-pr-reviewer@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'copilot'
```

**How it works:**
- Users can comment `/review` on any PR to trigger a new review
- The action only runs on pull requests (not regular issues)
- Useful for re-reviewing after addressing previous feedback

### Combined Workflow (Recommended)

For the most comprehensive setup, combine both automatic and comment-triggered reviews:

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    name: AI Code Review
    if: |
      github.event_name == 'pull_request' || 
      (github.event_name == 'issue_comment' && 
       github.event.issue.pull_request && 
       contains(github.event.comment.body, '/review'))
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: AI PR Review
        uses: tuan-vo/my-pr-reviewer@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'copilot'
```

## 🎯 Trigger Events

The action can be triggered by the following events:

### Automatic Triggers
- `pull_request.opened` - When a new PR is created
- `pull_request.synchronize` - When new commits are pushed to the PR
- `pull_request.reopened` - When a PR is reopened

### Manual Triggers
- `issue_comment.created` - When someone comments `/review` on a PR
- Custom keywords: `/review`, `/ai-review`, `@ai review` (configurable)

### Event Configuration Examples

**Automatic only:**
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

**Comment-triggered only:**
```yaml
on:
  issue_comment:
    types: [created]
```

**Both automatic and manual:**
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]
```

## 📋 Configuration

### Required Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token for API access | `${{ github.token }}` |

### Optional Inputs

| Input | Description | Default | Options |
|-------|-------------|---------|---------|
| `ai-provider` | AI service provider | `copilot` | `copilot` (others coming soon) |
| `review-level` | Review thoroughness | `medium` | `low`, `medium`, `high` |
| `exclude-patterns` | Files to exclude from review | `*.md,*.txt,*.json,package-lock.json` | Comma-separated patterns |
| `copilot-token` | GitHub Copilot API token | - | Required for Copilot |
| `openai-api-key` | OpenAI API key | - | Not yet implemented |
| `anthropic-api-key` | Anthropic API key | - | Not yet implemented |

### Outputs

| Output | Description |
|--------|-------------|
| `suggestions-count` | Number of review suggestions generated |
| `review-status` | Review completion status (`success`, `failed`, `skipped`) |

## 🔧 AI Provider Setup

> **📌 Note**: Currently only GitHub Copilot is implemented. OpenAI and Anthropic support is coming soon!

### GitHub Copilot (Currently Supported)

```yaml
- name: AI PR Review
  uses: tuan-vo/my-pr-reviewer@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ai-provider: 'copilot'
    # copilot-token: ${{ secrets.COPILOT_TOKEN }}  # Optional - GitHub token may be sufficient
```

**Setup:**
1. GitHub token is usually sufficient for Copilot API access
2. If needed, get a GitHub Copilot token from your GitHub settings
3. Add it as `COPILOT_TOKEN` in your repository secrets

### OpenAI (Coming Soon)

```yaml
- name: AI PR Review
  uses: tuan-vo/my-pr-reviewer@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ai-provider: 'openai'
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

**Setup:**
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it as `OPENAI_API_KEY` in your repository secrets

### Anthropic Claude (Coming Soon)

```yaml
- name: AI PR Review
  uses: tuan-vo/my-pr-reviewer@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ai-provider: 'anthropic'
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Setup:**
1. Get an API key from [Anthropic](https://console.anthropic.com/)
2. Add it as `ANTHROPIC_API_KEY` in your repository secrets

## 📚 Usage Examples

### Basic Configuration

```yaml
name: AI PR Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tuan-vo/my-pr-reviewer@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
name: AI PR Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: AI PR Review
        uses: tuan-vo/my-pr-reviewer@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'openai'
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          review-level: 'high'
          exclude-patterns: '*.md,*.txt,*.json,package-lock.json,*.yaml,*.yml,dist/*'
          
      - name: Review Results
        run: |
          echo "Review completed with ${{ steps.ai-review.outputs.suggestions-count }} suggestions"
          echo "Status: ${{ steps.ai-review.outputs.review-status }}"
```

### Conditional Reviews

```yaml
name: Smart AI Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false
    steps:
      - uses: actions/checkout@v4
      - uses: tuan-vo/my-pr-reviewer@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'copilot'
          review-level: ${{ github.event.pull_request.base.ref == 'main' && 'high' || 'medium' }}
```

## 🎛️ Review Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `low` | Basic syntax and obvious issues | Quick feedback, large PRs |
| `medium` | Balanced review with good coverage | Most PRs, default setting |
| `high` | Comprehensive analysis | Critical code, main branch |

## 🚫 Exclusion Patterns

Customize which files to skip:

```yaml
exclude-patterns: |
  *.md,*.txt,*.json,
  package-lock.json,yarn.lock,
  dist/*,build/*,
  **/*.min.js,
  **/*.test.js,**/*.spec.js
```

## 🔒 Security & Privacy

- All API keys are handled securely through GitHub Secrets
- No code is stored or transmitted beyond the review process
- Review comments are posted directly to your PR
- All network requests use HTTPS encryption

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/tuan-vo/my-pr-reviewer.git
cd my-pr-reviewer

# Install dependencies
npm install

# Build the action
npm run build
```

### Testing

```bash
# Run tests
npm test

# Build and test
npm run build && npm test
```

### Project Structure

```
src/
├── action.ts                    # Main action entry point
├── helpers/
│   └── getFileLanguage.ts      # Programming language detection
├── service/
│   ├── ai/
│   │   ├── codeReviewer.ts     # AI integration logic
│   │   ├── interfaces/         # Type definitions
│   │   └── prompts/           # AI prompts
│   └── github/
│       ├── reviewComments.ts   # GitHub API integration
│       └── ...                # Other GitHub services
└── types/                      # TypeScript type definitions
```

## 📊 Performance

- **Average review time**: 10-30 seconds per PR
- **Supported file types**: JavaScript, TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby, C++, Swift, Kotlin, and more
- **Maximum file size**: 1MB per file (configurable)
- **PR size limit**: 50 files per PR (configurable)
- **Context window**: 10 lines before/after changes for better AI understanding
- **Concurrent reviews**: Supports multiple PRs simultaneously

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -am 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Submit a pull request

For more details, see our [Contributing Guide](CONTRIBUTING.md).

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](https://github.com/tuan-vo/my-pr-reviewer/issues) to report bugs or request features:

- **Bug Report**: Use the bug report template
- **Feature Request**: Use the feature request template
- **Discussion**: Use [GitHub Discussions](https://github.com/tuan-vo/my-pr-reviewer/discussions) for questions and ideas

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/tuan-vo/my-pr-reviewer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tuan-vo/my-pr-reviewer/discussions)
- **Documentation**: Check the [examples](examples/) directory
- **Email**: tuan.vo.dev@gmail.com (for security issues or urgent matters)

## 🏆 Acknowledgments

- Built with [GitHub Actions](https://github.com/features/actions)
- Powered by AI models from GitHub Copilot (with OpenAI and Anthropic support coming soon)
- Inspired by the developer community's need for better code review tools
- Special thanks to all contributors and users who help improve this project

---

<div align="center">
  <strong>Happy Coding! 🚀</strong>
  <br>
  <sub>Made with ❤️ by <a href="https://github.com/tuan-vo">@tuan-vo</a></sub>
</div>