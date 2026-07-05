#!/usr/bin/env python
"""
Validate MCP streamable_http compatibility with QwenPaw's Python SDK.
Uses the same SDK code path as QwenPaw.
"""

import asyncio
import sys
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


async def test_mcp_connection(url: str):
    print(f"\n[TEST] Connecting to MCP: {url}")
    print("=" * 60)

    try:
        async with streamable_http_client(url=url) as (read_stream, write_stream, get_session_id):
            print("[PASS] Transport connection established")

            # Wrap streams in a ClientSession
            async with ClientSession(read_stream, write_stream) as session:
                print(f"  Session type: {type(session).__name__}")

                # initialize
                print("\n[TEST] Calling initialize ...")
                init_result = await session.initialize()
                print(f"[PASS] Server: {init_result.serverInfo.name} v{init_result.serverInfo.version}")
                print(f"  Protocol: {init_result.protocolVersion}")
                print(f"  Capabilities: tools={hasattr(init_result.capabilities, 'tools')}")

                # tools/list
                print("\n[TEST] Calling tools/list ...")
                tools_result = await session.list_tools()
                tools = tools_result.tools
                print(f"[PASS] Got {len(tools)} tools")
                for t in tools[:5]:
                    print(f"  - {t.name}: {t.description[:50]}")
                if len(tools) > 5:
                    print(f"  ... and {len(tools) - 5} more")

                # tools/call
                print("\n[TEST] Calling tools/call: list_projects ...")
                result = await session.call_tool("list_projects", {})
                print(f"[PASS] tools/call succeeded")
                if result.content:
                    for c in result.content:
                        text = getattr(c, 'text', str(c))[:100]
                        print(f"  Result: {text}")

                print("\n" + "=" * 60)
                print("[SUCCESS] All tests passed! QwenPaw compatible.")
                return True

    except Exception as e:
        print(f"\n[FAIL] {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    url = "http://localhost:3000/loop_engineering/mcp"
    success = asyncio.run(test_mcp_connection(url))
    sys.exit(0 if success else 1)
