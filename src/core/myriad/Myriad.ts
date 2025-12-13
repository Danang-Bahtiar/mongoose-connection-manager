import path from "path";
import { ExtendedMyriad, MyriadConfig } from "../../config/Myriad.config.js";
import SchemaModule from "../schema/schema.module.js";
import fs from "fs";
import { pathToFileURL } from "url";
import { moduleLoader } from "../../loaders/module.loader.js";
import MongooseConnectionManager from "../connector/connector.handler.js";

// 🎨 Visual Styling Helpers
const style = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
};

const printSectionHeader = (title: string) => {
  console.log(`\n${style.blue}========================================${style.reset}`);
  console.log(`   🚀 ${style.bright}STARTING MODULE: ${title.toUpperCase()}${style.reset}`);
  console.log(`${style.blue}========================================${style.reset}`);
};

class Myriad {
  private moduleInstances: Map<string, SchemaModule>;
  private connectionManager: MongooseConnectionManager;

  constructor() {
    this.moduleInstances = new Map();
    this.connectionManager = new MongooseConnectionManager();
  }

  static init = async () => {
    // 1. Initialize Core
    const app: ExtendedMyriad = new Myriad();

    // 2. Load Configuration
    printSectionHeader("CONFIGURATION");
    const config: MyriadConfig = await app.loadConfig();

    // 3. Database & Modules (The "Body" of Myriad)
    // We pass the styling responsibility to moduleLoader, or wrap it here
    printSectionHeader("SCHEMA & DATABASE ENGINE");
    
    await moduleLoader(
      app,
      config.records,
      config.useGlobalUri ? config.globalUri : undefined,
    );

    // 4. (Optional) Hook for other modules mentioned in your prompt
    // e.g., app.initMiddleware(), app.initSparkLite()...

    // 5. Final Success Message
    console.log(`\n${style.green}========================================${style.reset}`);
    console.log(`   ✨ ${style.bright}SYSTEM INITIALIZATION COMPLETE${style.reset}`);
    console.log(`${style.green}========================================${style.reset}\n`);

    console.log(`[Myriad] Core initialized.`);
    // If you have a port in your config, you can log it here
    // console.log(`Service running on http://localhost:${config.port}`);

    return app;
  };

  static DefineConfig = (config: MyriadConfig): MyriadConfig => {
    return config;
  };

  private loadConfig = async (): Promise<MyriadConfig> => {
    const fullPath = path.resolve(process.cwd(), "myriad.config.js");

    if (!fs.existsSync(fullPath)) {
      throw new Error(`MyriadJS config not found at: ${fullPath}`);
    }

    const module = await import(pathToFileURL(fullPath).href);
    const config = (module.default || module) as MyriadConfig;

    // Log the config result in the requested style
    console.log(`[CONFIG] Loaded configuration from: ${path.basename(fullPath)}`);
    if(config.globalUri) {
        console.log(`[CONFIG] Global Database URI detected.`);
    }
    
    return config;
  };

  public registerModule = (name: string, module: SchemaModule) => {
    this.moduleInstances.set(name, module);
  };

  public getModule = <T extends SchemaModule>(name: string): T | undefined => {
    const module = this.moduleInstances.get(name);
    if (module) {
      return module as T;
    }
    return undefined;
  };

  public getConnectionManager = (): MongooseConnectionManager => {
    return this.connectionManager;
  };

  public reloadModule = async () => {
    printSectionHeader("RELOADING MODULES"); // Visual cue for reload
    this.moduleInstances.clear();
    const config: MyriadConfig = await this.loadConfig();
    await moduleLoader(
      this,
      config.records,
      config.useGlobalUri ? config.globalUri : undefined,
    );
  };
}

export default Myriad;