import path from "path";
import { ExtendedMyriad, MyriadConfig } from "../../config/Myriad.config.js";
import SchemaModule from "../schema/schema.module.js";
import fs from "fs";
import { pathToFileURL } from "url";
import { moduleLoader } from "../../loaders/module.loader.js";
import MongooseConnectionManager from "../connector/connector.handler.js";

class Myriad {
  private moduleInstances: Map<string, SchemaModule>;
  private connectionManager: MongooseConnectionManager;

  constructor() {
    this.moduleInstances = new Map();
    this.connectionManager = new MongooseConnectionManager();
  }

  static init = async () => {
    const app: ExtendedMyriad = new Myriad();
    app["test"] = "test";
    const config: MyriadConfig = await app.loadConfig();
    await moduleLoader(
      app,
      config.records,
      config.useGlobalUri ? config.globalUri : undefined,
      config.libMode
    );

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
    return (module.default || module) as MyriadConfig;
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
    this.moduleInstances.clear();
    const config: MyriadConfig = await this.loadConfig();
    await moduleLoader(
      this,
      config.records,
      config.useGlobalUri ? config.globalUri : undefined,
      config.libMode
    );
  };
}

export default Myriad;
