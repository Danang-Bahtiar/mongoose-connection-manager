// loaders/module.loader.ts
import { ExtendedMyriad, RecordConfig } from "../config/Myriad.config.js";
import { glob } from "glob";
import path from "path";
export const moduleLoader = async (
  app: ExtendedMyriad,
  records: RecordConfig[],
  globalUri?: string,
  isLibraryMode = false
) => {
  console.log(`[Myriad] Initializing ${isLibraryMode ? "Library" : "Main"} Mode...`);

  const availableModules = new Map<string, any>();

  if (!isLibraryMode) {
    // --- DISCOVERY PHASE ---
    const searchPath = path.resolve(process.cwd(), "./src/modules");
    const moduleDir = path.join(searchPath, "/**/*.{module.ts,module.js}").replace(/\\/g, "/");
    const files = await glob(moduleDir);

    for (const file of files) {
      const filePath = `file://${file.replace(/\\/g, "/")}`;
      const moduleFile = await import(`${filePath}?update=${Date.now()}`);
      const ModuleClass = moduleFile.default;
      availableModules.set(ModuleClass.name.toLowerCase(), ModuleClass);
      console.log(`[Myriad] Discovered Blueprint: ${ModuleClass.name}`);
    }
  }

  // --- CONSTRUCTION PHASE ---
  for (const record of records) {
    const name = globalUri ? "globalDB" : record.name;
    const uri = globalUri ?? record.uri;
    if (!uri) {
      console.warn(`[Myriad] Skipped module '${record.modelModule}' — no database URI.`);
      continue;
    }

    const connection = app.getConnectionManager().getOrCreateConnection(name, uri);

    const ModuleClass = isLibraryMode
      ? record.modelModule
      : availableModules.get(record.modelModule.toLowerCase());

    if (!ModuleClass) {
      console.warn(`[WARN] Module '${record.modelModule}' not found.`);
      continue;
    }

    const instance = new ModuleClass(connection, record.modelName, record.modelSchema);
    app[record.modelModule] = instance;
    app.registerModule(name, instance);

    console.log(`  ✔️  Initialized & Registered: ${name} (as ${record.modelModule})`);
  }
};
