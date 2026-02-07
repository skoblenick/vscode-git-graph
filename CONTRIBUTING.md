# Contributing to Git Graph

Thank you for taking the time to contribute!

The following are a set of guidelines for contributing to vscode-git-graph.

## Code of Conduct

This project and everyone participating in it is governed by the [Git Graph Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by [opening an issue](https://github.com/skoblenick/vscode-git-graph/issues) on this repository.

## How Can I Contribute?

### Reporting Bugs

Raise a bug you've found to help us improve!

Check the [open bugs](https://github.com/skoblenick/vscode-git-graph/issues?q=is%3Aissue+is%3Aopen+label%3A"bugs") to see if it's already being resolved. If it is, give the issue a thumbs up, and help provide additional context if the issue author was unable to provide some details.

If the bug hasn't previously been reported, please follow these steps:
1. Raise an issue using the "Bug Report" template. [Create Bug Report](https://github.com/skoblenick/vscode-git-graph/issues/new?labels=bug&template=bug-report.md&title=)
2. Complete the template, providing information for all of the required sections.
3. Click "Submit new issue"

We will respond promptly, and get it resolved as quickly as possible.

### Feature Requests

Suggest a new feature for this extension! We want to make Git Graph an even more useful tool in Visual Studio Code, so any suggestions you have are greatly appreciated.

Check the [open feature requests](https://github.com/skoblenick/vscode-git-graph/issues?q=is%3Aissue+is%3Aopen+label%3A"feature+request") to see if your idea is already under consideration or on its way. If it is, give the issue a thumbs up so it will be higher prioritised.

If your feature hasn't previously been suggested, please follow these steps:
1. Raise an issue using the "Feature Request" template. [Create Feature Request](https://github.com/skoblenick/vscode-git-graph/issues/new?labels=feature+request&template=feature-request.md&title=)
2. Follow the template as you see appropriate, it's only meant to be a guide.
3. Click "Submit new issue"

We will respond promptly, and your request will be prioritised according to community interest and project goals.

### Improvements

Suggest an improvement to existing functionality of this extension! We want to make Git Graph an even more useful tool in Visual Studio Code, so any improvements you have are greatly appreciated.

Check the [open improvements](https://github.com/skoblenick/vscode-git-graph/issues?q=is%3Aissue+is%3Aopen+label%3A"improvement") to see if your improvement is already under consideration or on its way. If it is, give the issue a thumbs up so it will be higher prioritised.

If your improvement hasn't previously been suggested, please follow these steps:
1. Raise an issue using the "Improvement" template. [Create Improvement](https://github.com/skoblenick/vscode-git-graph/issues/new?labels=improvement&template=improvement.md&title=)
2. Follow the template as you see appropriate, it's only meant to be a guide.
3. Click "Submit new issue"

We will respond promptly, and your request will be prioritised according to community interest and project goals.

### Contributing To Development

If you're interested in helping contribute, either:
* Find an open issue you'd like to work on, and comment on it. Once the code owner has responded with some background information and initial ideas, it will be assigned to you to work on.
* Raise an issue describing the feature you'd like to work on, mentioning that you'd like to implement it. Once it has been responded to by the code owner, it has been confirmed as a suitable feature of Git Graph and it will be assigned to you to work on.

Step 1: To set up your development environment, please follow these steps:

**Using devbox (recommended):**
1. Install [devbox](https://www.jetpack.io/devbox) if not already installed.
2. Run `devbox install && devbox shell` to enter the development environment.
3. Run `pnpm install` to install dependencies.

**Without devbox:**
1. Install [Node.js](https://nodejs.org/en/) (20.x or later) if not already installed.
2. Install pnpm: `corepack enable && corepack prepare pnpm@9.0.0 --activate`

Then:
1. Clone the [vscode-git-graph](https://github.com/skoblenick/vscode-git-graph) repo on GitHub.
2. Open the repo in Visual Studio Code.
3. In the Visual Studio Code terminal, run `pnpm install` to automatically download all of the required Node.js dependencies.
4. Install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension if it is not already installed.
5. Create and checkout a branch for the issue you're going to work on.

Step 2: Review the [Architecture Documentation](docs/ARCHITECTURE.md), so you have a general understanding of the structure of the codebase.

Step 3: To compile the code, run the appropriate pnpm script in the Visual Studio Code terminal as follows:
* `pnpm compile`: Compiles both front and backend code
* `pnpm compile-src`: Compiles the backend code only
* `pnpm compile-web`: Compiles the frontend code with esbuild minification.
* `pnpm compile-web-debug`: Compiles the frontend code without minification.

_Note: When you first open the codebase, you'll need to run `pnpm compile-src` so that the types defined by the backend are made available for the frontend to use, otherwise there will be a number of type errors in the frontend code. Similarly, if you make a change to the backend types that you also want to use in the frontend via the GG namespace, you'll need to run `pnpm compile-src` before they can be used._

Step 4: To run the test suite:
* Run `pnpm test` to execute all tests.

Step 5: To quickly test your changes:
* Pressing F5 launches the Extension Development Host in a new window, overriding the installed version of Git Graph with the version compiled in Step 3. You can:
    * Use the extension to test your changes
    * View the Webview Developer Tools by running the Visual Studio Code command `Developer: Open Webview Developer Tools`. This allows you to:
        * View the front end JavaScript console
        * View and modify the CSS rules (temporarily)
        * View and modify the DOM tree (temporarily)
        * If you ran `pnpm compile-web-debug` in Step 3, you can also add breakpoints to the compiled frontend JavaScript.
* Switching back to the Visual Studio Code window that you were in (from Step 3), you can:
    * Add breakpoints to the backend TypeScript
    * Restart the Extension Development Host
    * Stop the Extension Development Host

Step 6: To do a complete test of your changes:
1. Install Visual Studio Code Extensions CLI: `pnpm add -g @vscode/vsce` if it is not already installed.
2. Change the version of the extension defined in `package.json` on line 4 to an alpha release, for example `1.13.0-alpha.0`. You should increment the alpha version each time you package a modified version of the extension. _Make sure you don't commit the version number with your changes._
3. Run the pnpm script `pnpm package-and-install` in the Visual Studio Code terminal. This will compile and package the extension into a `vsix` file, and then install it.
4. Restart Visual Studio Code, and verify that you have the correct alpha version installed.
5. Test out the extension, it will behave exactly the same as a published release.

Step 7: Raise a pull request once you've completed development, we'll have a look at it.

#### Style Guide

The required style is produced by running "Format Document" in Visual Studio Code.
