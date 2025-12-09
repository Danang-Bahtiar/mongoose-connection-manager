// loaders/module.loader.ts
import { ExtendedMyriad, RecordConfig } from "../config/Myriad.config.js";
import { glob } from "glob";
import path from "path";

// 🎨 Simple styling helpers (No dependencies)
const style = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

export const moduleLoader = async (
  app: ExtendedMyriad,
  records: RecordConfig[],
  globalUri?: string,
  isLibraryMode = false
) => {
  // console.log(
  //   `\n${style.bright}${style.cyan}[Myriad] 🚀 Initializing ${
  //     isLibraryMode ? "Library" : "Main"
  //   } Mode...${style.reset}\n`
  // );

  const availableModules = new Map<string, any>();

  // --- 1. DISCOVERY PHASE ---
  if (!isLibraryMode) {
    const searchPath = path.resolve(process.cwd(), "./src/modules");
    console.log(
      `${style.dim}   Mapping directory: ${searchPath}${style.reset}`
    );

    const moduleDir = path
      .join(searchPath, "/**/*.{module.ts,module.js}")
      .replace(/\\/g, "/");
    const files = await glob(moduleDir);

    if (files.length === 0) {
      console.log(
        `${style.yellow}   [WARN] No module files found in scan.${style.reset}`
      );
    }

    for (const file of files) {
      const filePath = `file://${file.replace(/\\/g, "/")}`;
      // Add timestamp to bust cache if needed, though usually not needed in prod
      const moduleFile = await import(`${filePath}?update=${Date.now()}`);
      const ModuleClass = moduleFile.default;

      availableModules.set(ModuleClass.name.toLowerCase(), ModuleClass);
      // Clean, indented log for discovery
      console.log(
        `   ${style.blue}├─ 🔍 Discovered:${style.reset} ${ModuleClass.name}`
      );
    }
    console.log(""); // Empty line for separation
  }

  // --- 2. CONSTRUCTION PHASE ---
  for (const record of records) {
    const name = globalUri ? "globalDB" : record.name;
    const uri = globalUri ?? record.uri;

    // ALIGNMENT: Pad the names so the status messages line up perfectly
    const formattedModel = record.modelName.padEnd(15, " ");
    const formattedModule = record.modelModule.padEnd(20, " ");

    if (!uri) {
      console.warn(
        `${style.yellow}   [SKIP] ${formattedModel} :: No Database URI provided.${style.reset}`
      );
      continue;
    }

    const connection = await app
      .getConnectionManager()
      .getOrCreateConnection(name, uri);

    const ModuleClass = isLibraryMode
      ? record.modelModule
      : availableModules.get(record.modelModule.toLowerCase());

    if (!ModuleClass) {
      console.warn(
        `${style.red}   [FAIL] ${formattedModel} :: Module '${record.modelModule}' not found.${style.reset}`
      );
      continue;
    }

    // Instantiate
    const instance = new ModuleClass(
      connection,
      record.modelName,
      record.modelSchema
    );
    app[record.modelName] = instance;
    app.registerModule(record.name, instance);

    // SUCCESS LOG
    console.log(
      `   ${style.green}✔️  READY${style.reset}  ::  ${style.bright}${formattedModel}${style.reset}  [${style.dim}${formattedModule}${style.reset}]`
    );
  }

  console.log(
    `\n${style.dim}   --- Initialization Complete ---${style.reset}\n`
  );
};
