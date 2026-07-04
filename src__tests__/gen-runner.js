var fs = require("fs");
var p = "D:/ai/workspace/LoopAgentServer2/src__tests__/api-full-test.js";
var lines = []; function add(line) { lines.push(line); }
add("const http = require(\"http\");");
add("console.log(\"=== API Test Runner ===\\n\");");
