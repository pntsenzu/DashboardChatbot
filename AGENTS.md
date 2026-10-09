# AGENTS.md — OpenCode Agent Instructions

Welcome to the Senzu Dashboard Chatbot Workspace!

## Overview
This workspace configures the OpenCode Agent for constructing and managing the **Senzu Chatbot UI Dashboard**.

## Project Specification Reference
- Data API Specification: [data-api.html](./data-api.html)
- UI Design Specification: [ui-design-spec.html](./ui-design-spec.html)

## Installed Skills
- `senzu-data-api`: RPC endpoint specification, 37 functions, types, and server-side client rules.
- `senzu-ui-design-spec`: HSL CSS tokens, typography scale, NextAuth Google provider setup, hairline borders.
- `github-automation`: GitHub CLI commands, commit conventions, git push instructions.
- `google-sheets-testlog`: Read test logs from Google Sheets, interpret PASS/FAIL results, apply code fixes.

## MCP Servers
- `github`: GitHub API via `@modelcontextprotocol/server-github`
- `fetch`: HTTP fetch via `@modelcontextprotocol/server-fetch`
- `filesystem`: Local filesystem access
- `google-sheets`: Google Sheets & Drive API via `mcp-google-sheets` (Python/uvx, Service Account auth)

## OpenCode Commands
- Run `opencode` CLI directly in this directory to start coding or maintaining the project.
