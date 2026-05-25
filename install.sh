#!/bin/bash
# Install HireHuman MCP Server for Claude Desktop
# Usage: bash install.sh

CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
MCP_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$CONFIG_FILE" ]; then
  mkdir -p "$CONFIG_DIR"
  echo '{"mcpServers":{}}' > "$CONFIG_FILE"
fi

# Check if jq is available
if command -v jq &> /dev/null; then
  TMP=$(mktemp)
  jq --arg dir "$MCP_DIR" '.mcpServers.hirehuman = {"command":"node","args":[$dir + "/mcp-server.js"]}' "$CONFIG_FILE" > "$TMP" && mv "$TMP" "$CONFIG_FILE"
  echo "✅ Added hirehuman MCP server to Claude Desktop config"
  echo "📁 $CONFIG_FILE"
else
  echo "⚠️  jq not found. Add this manually to $CONFIG_FILE:"
  echo ""
  echo '{'
  echo '  "mcpServers": {'
  echo '    "hirehuman": {'
  echo '      "command": "node",'
  echo '      "args": ["'"$MCP_DIR"'/mcp-server.js"]'
  echo '    }'
  echo '  }'
  echo '}'
fi
