import { renameSync, writeFileSync } from "node:fs";

import { serializeFormaDomPackage } from "./projekty-domow/package";

const outputPath = `${import.meta.dir}/../_docs/_DEMO/projekty-domow.site.json`;
const temporaryPath = `${outputPath}.tmp`;
writeFileSync(temporaryPath, await serializeFormaDomPackage());
renameSync(temporaryPath, outputPath);
console.log("WROTE", outputPath);
