# Contributing to Thought Graph

First off, thank you for considering contributing to Thought Graph!

## Where to start

*   **Issues:** Check the issue tracker for open issues. For new features or bug reports, please open an issue to discuss it before submitting a pull request.
*   **Pull Requests:** When submitting a pull request, please ensure your changes are covered by tests, and the CI pipeline passes. Include a clear description of the problem you are solving.

## Development Setup

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```
2.  Start the core MCP Server in dev mode:
    ```bash
    npm run dev
    ```
3.  In a separate terminal, start the Visualizer:
    ```bash
    cd visualizer
    npm install
    npm run dev
    ```

## Code Style

This project uses standard TypeScript/React conventions. Ensure you run the linter and TypeScript compiler to catch errors before committing via:
```bash
npm run build
npm test
```
