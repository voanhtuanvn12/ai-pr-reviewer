# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **GitHub Action Support**: The AI PR Reviewer can now be used as a GitHub Action
  - New `action.yml` metadata file with comprehensive input/output configuration
  - Dedicated `src/action.ts` entry point for GitHub Actions workflow
  - Support for multiple AI providers (Copilot, OpenAI, Anthropic)
  - Configurable review levels (high, medium, low) 
  - File exclusion patterns for filtering review scope
  - Action outputs for CI/CD integration
  - Comprehensive error handling and logging
  - Action summary with review statistics and findings

### Enhanced
- **Dual Mode Operation**: Project now supports both GitHub App and GitHub Action deployment
- **Build System**: Updated `tsup.config.ts` to build both Probot app and GitHub Action
- **Documentation**: Added GitHub Action usage examples and configuration guide
- **Workflow Examples**: Created sample workflows for both internal and external usage

### Technical
- Added `@actions/core` and `@actions/github` dependencies
- Created dual build configuration (ESM for Probot, CJS for Action)
- Implemented robust file filtering and context extraction for Actions
- Added action-specific error handling and output formatting

## [1.0.0] - 2025-07-10

### Added
- **AI-Powered Code Review**: Intelligent analysis using GitHub Copilot integration
- **Context-Aware Analysis**: 10 lines of context before/after changes for better AI understanding
- **Re-review Capabilities**: Trigger new reviews on demand with comment keywords
- **Incremental Reviews**: Only analyze new changes since last review
- **Multiple Review Types**: Security, performance, bugs, style, best practices
- **Interactive Comments**: Responds to `@bot review`, `re-review`, `review again`
- **Robust JSON Parsing**: Handles malformed AI responses with fallback extraction
- **GitHub Integration**: Full GitHub API integration for PR management

### Features
- Probot-based GitHub App architecture
- Multi-language support with automatic detection
- Configurable review prompts and rules
- Docker containerization support
- Comprehensive logging and debugging
- Webhook event handling for PR lifecycle
- Review comment management and formatting
