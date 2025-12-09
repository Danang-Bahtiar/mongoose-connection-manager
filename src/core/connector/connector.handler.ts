import mongoose, { Connection, ConnectOptions } from "mongoose";

// 🎨 Shared Styling Helpers (Consistent with ModuleLoader)
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

/**
 * Handles multiple MongoDB connections using a Map.
 */
class MongooseConnectionManager {
  /**
   * Stores database connections with their respective names.
   * @type {Map<string, Connection>}
   */
  private Connections: Map<string, Connection>;

  constructor() {
    this.Connections = new Map<string, Connection>();

    // Close all connections on process exit
    process.on("SIGINT", async () => {
      console.log(`\n${style.yellow}[DB-SYS] ⚠️  SIGINT Received. Initiating shutdown sequence...${style.reset}`);
      await this.closeAllConnections();
      console.log(`${style.red}[DB-SYS] 🛑 System Halted.${style.reset}`);
      process.exit(0);
    });
  }

  /**
   * Creates and stores a new database connection.
   */
  public addConnection = async (
    name: string,
    url: string,
    options: ConnectOptions = {}
  ): Promise<void> => {
    const paddedName = name.padEnd(15, " ");

    if (this.Connections.has(name)) {
      console.log(
        `   ${style.yellow}[WARN] Connection "${paddedName}" already exists. Skipping.${style.reset}`
      );
      return;
    }

    try {
      // Create the connection promise
      const conn: Connection = await mongoose
        .createConnection(url, options)
        .asPromise();

      // --- EVENT LISTENERS (Formatted Logs) ---
      
      conn.on("connected", () => {
        console.log(
          `   ${style.green}⚡ [LINK ESTABLISHED]${style.reset} :: ${style.bright}${paddedName}${style.reset}`
        );
      });

      conn.on("error", (err: Error) => {
        console.log(
          `   ${style.red}💥 [LINK ERROR]      ${style.reset} :: ${style.bright}${paddedName}${style.reset} >> ${err.message}`
        );
      });

      conn.on("disconnected", () => {
        console.log(
            `   ${style.yellow}🔌 [LINK SEVERED]    ${style.reset} :: ${style.bright}${paddedName}${style.reset}`
        );
        this.Connections.delete(name);
      });

      // Store successfully
      this.Connections.set(name, conn);

    } catch (error: any) {
      console.log(
        `   ${style.red}❌ [FATAL ERROR]     ${style.reset} :: Failed to connect "${paddedName}" >> ${error.message}`
      );
    }
  };

  /**
   * Retrieves an existing database connection by name.
   */
  public getConnection = (name: string): Connection | undefined => {
    if (!this.Connections.has(name)) {
      // Optional: Only log this if you are debugging, otherwise it might spam console
      // console.log(`${style.red}[ERR] Connection "${name}" not found.${style.reset}`);
      return undefined;
    }
    return this.Connections.get(name);
  };

  /**
   * Retrieves the connection state.
   * 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
   */
  public getState = (name: string): number => {
    const connection = this.getConnection(name);
    return connection ? connection.readyState : 0; 
  };

  /**
   * Returns the number of active connections.
   */
  public getActiveConnectionCount(): number {
    return this.Connections.size;
  }

  /**
   * Returns a list of connection names or detailed information.
   */
  public getAllConnections(withDetails: false): string[];
  public getAllConnections(
    withDetails: true
  ): { name: string; state: string; models: string[]; uri: string }[]; // Changed state to string for readability
  public getAllConnections(
    withDetails: boolean = false
  ):
    | string[]
    | { name: string; state: string; models: string[]; uri: string }[] {
    
    if (!withDetails) {
      return Array.from(this.Connections.keys());
    }

    // Helper to convert Mongoose state number to String
    const stateMap = ["DISCONNECTED", "CONNECTED", "CONNECTING", "DISCONNECTING"];

    const result: {
      name: string;
      state: string;
      models: string[];
      uri: string;
    }[] = [];

    for (const [name, conn] of this.Connections.entries()) {
      result.push({
        name,
        state: stateMap[conn.readyState] || "UNKNOWN",
        models: conn.modelNames(),
        uri: `${conn.host}/${conn.name}`, 
      });
    }
    return result;
  }

  /**
   * Helper: Gets existing or creates new.
   */
  public getOrCreateConnection = async (
    name: string,
    url: string,
    options: ConnectOptions = {}
  ): Promise<Connection | undefined> => {
    if (this.Connections.has(name)) {
      return this.Connections.get(name);
    } 
    
    // Logic simplified: Just add, then get.
    await this.addConnection(name, url, options);
    return this.Connections.get(name);
  };

  /**
   * Closes a specific database connection.
   */
  public closeConnection = async (name: string): Promise<void> => {
    const connection = this.getConnection(name);
    const paddedName = name.padEnd(15, " ");

    if (connection) {
      await connection.close();
      // Logging handled by 'disconnected' event listener usually, but we can double confirm here if needed
    } else {
      console.log(
        `   ${style.yellow}[WARN] Cannot close "${paddedName}": Connection not found.${style.reset}`
      );
    }
  };

  /**
   * Closes all database connections managed by this instance.
   */
  public closeAllConnections = async (): Promise<void> => {
    const connectionPromises: Promise<void>[] = [];
    
    console.log(`${style.dim}   [DB-SYS] Closing all active connections...${style.reset}`);

    for (const [name, conn] of this.Connections.entries()) {
      connectionPromises.push(
        conn
          .close()
          .then(() => {
             // Let the event listener handle the log
          })
          .catch((error: any) =>
            console.error(
              `   ${style.red}[ERROR] Closing "${name}": ${error.message}${style.reset}`
            )
          )
      );
    }
    
    await Promise.allSettled(connectionPromises);
    this.Connections.clear();
    console.log(`${style.dim}   [DB-SYS] Connection pool cleared.${style.reset}`);
  };
}

export default MongooseConnectionManager;