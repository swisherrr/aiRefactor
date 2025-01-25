# aiRefactor - VS Code Extension

A VS Code extension that uses AI to help improve your code. Powered by Claude 3.5 Sonnet and DistilBERT.

## Features

### 1. AI Code Refactoring
Uses Claude 3.5 Sonnet to refactor selected code with a focus on:
- Readability
- Performance
- Security

### 2. Comment Tone Analysis
Uses DistilBERT to analyze the tone of code comments, helping maintain professional documentation.

## Setup

1. Install the extension
2. Configure your API keys in VS Code settings:
   - `aiCodeRefactorer.anthropicApiKey`: Your Claude API key
   - `aiCodeRefactorer.huggingfaceApiKey`: Your HuggingFace API key

## Usage

1. Select code in your editor
2. Open the aiRefactor panel (View → Command Palette → "Show aiRefactor Panel")
3. Choose an operation:
   - **Refactor with Claude 3.5**: Select an optimization goal and click to refactor
   - **Check Comment Tone**: Analyzes comments for professionalism

## Requirements

- VS Code version 1.85.0 or higher
- Active internet connection
- Valid API keys for:
  - Anthropic (Claude)
  - HuggingFace

## Extension Settings

* `aiCodeRefactorer.anthropicApiKey`: Claude API key
* `aiCodeRefactorer.huggingfaceApiKey`: HuggingFace API key

## Known Issues

- Large code selections may take longer to process
- API rate limits apply based on your subscription level

## Release Notes

### 1.0.0
- Initial release
- Code refactoring with Claude 3.5
- Comment tone analysis with DistilBERT 