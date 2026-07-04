const { PrismaClient } = require("@prisma/client");
(async () => {
  const client = new PrismaClient();
  try {
    console.log("Connecting to database...");
    await client.$connect();
    console.log("Connected!");

    // Count agents
    const count = await client.agent.count();
    console.log("Agent count:", count);

    await client.$disconnect();
    console.log("\nDatabase test passed!");
  } catch(e) {
    console.error("Database error:", e.message.substring(0, 500));
  } finally {
    await client.$disconnect().catch(() => {});
  }
})();
