import { MongoMemoryReplSet } from "mongodb-memory-server";
import fs from "node:fs";
const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: "meridian" } });
fs.writeFileSync("/tmp/uri.txt", rs.getUri().replace("/?", "/meridian?"));
console.log("ready");
setInterval(() => {}, 60000);
