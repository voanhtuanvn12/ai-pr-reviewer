## Contributing

[fork]: https://github.com/voanhtuanvn12/my-pr-reviewer/fork
[pr]: https://github.com/voanhtuanvn12/my-pr-reviewer/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Issues and PRs

If you have suggestions for how this project could be improved, or want to report a bug, open an issue! We'd love all and any contributions. If you have questions, too, we'd love to hear them.

We'd also love PRs. If you're thinking of a large PR, we advise opening up an issue first to talk about it, though! Look at the links below if you're not sure how to open a PR.

## Submitting a pull request

1. [Fork][fork] and clone the repository.
2. Configure and install the dependencies: `npm install`.
3. Make sure the tests pass on your machine: `npm test`, note: these tests also apply the linter, so there's no need to lint separately.
4. Create a new branch: `git checkout -b my-branch-name`.
5. Make your change, add tests, and make sure the tests still pass.
6. Build the project: `npm run build`.
7. Push to your fork and [submit a pull request][pr].
8. Pat yourself on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write and update tests.
- Keep your changes as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).
- Follow the existing code style and conventions.
- Update documentation when necessary.

Work in Progress pull requests are also welcome to get feedback early on, or if there is something blocking you.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/my-pr-reviewer.git
cd my-pr-reviewer

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Testing Your Changes

Before submitting a pull request, please ensure:

1. All tests pass: `npm test`
2. The project builds successfully: `npm run build`
3. Your code follows the project's style guidelines
4. You've added tests for new functionality
5. Documentation has been updated if necessary

### Reporting Issues

When reporting issues, please include:

1. Your operating system and version
2. Node.js version
3. Steps to reproduce the issue
4. Expected vs actual behavior
5. Any error messages or logs
6. Screenshots if applicable

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
