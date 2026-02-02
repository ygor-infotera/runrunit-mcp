# Runrun.it MCP Server

A Model Context Protocol (MCP) server for interacting with the Runrun.it API.
https://runrun.it/api/documentation

## Features

- **Get Task**: Retrieve detailed information about a specific task by ID.
- **List Tasks**: Query tasks with filters such as responsible user, project, and status.
- **Get Me**: Fetch information about the currently authenticated user.
- **Strict Typing**: Implemented with strict TypeScript configuration for reliability.
- **Safe Hardware**: environment variable validation using `t3-env` and `zod`.
- **Native Fetch**: Uses native Node.js `fetch` API.

## Prerequisites

- Node.js (v18 or higher recommended)
- Runrun.it API Credentials (App Key and User Token)

## Installation

1. Clone or copy this project to your desired directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment variables. Create a `.env` file in the root directory:
   ```env
   RUNRUNIT_APP_KEY=your_app_key
   RUNRUNIT_USER_TOKEN=your_user_token
   ```

## Usage

### Direct execution (using tsx)

You can run the server directly using `tsx` (useful for development):

```bash
npx tsx src/index.ts
```

### Build and Run

1. Build the project:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   node build/index.js
   ```

## Available Tools

- `get_task({ id: number })`: Returns details for a specific Runrun.it task.
- `list_tasks({ responsible_id?: string, project_id?: number, is_closed?: boolean, limit?: number })`: Lists tasks based on filters.
- `get_me()`: Returns current user information.

## Development

The project uses a strict `tsconfig.json` and `t3-env` for environment variable validation.

- Run type checks: `npx tsc --noEmit`
- Source code is in `src/index.ts` and environment validation in `src/env.ts`.

## Configuration for AI Clients (e.g., Claude Desktop)

To add this MCP server to an AI client like Claude Desktop, add the following to your configuration file (usually `~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "runrunit": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/home/ygor@infotera.LOCAL/html/runrunit/src/index.ts"
      ],
      "env": {
        "RUNRUNIT_APP_KEY": "your_app_key",
        "RUNRUNIT_USER_TOKEN": "your_user_token"
      }
    }
  }
}
```

> [!TIP]
> Make sure to use absolute paths for the command and script. If you have already built the project, you can use `node` with the `build/index.js` path instead of `tsx`.
