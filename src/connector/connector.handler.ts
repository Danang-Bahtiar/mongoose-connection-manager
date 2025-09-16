import mongoose, { Connection, ConnectOptions } from "mongoose";

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
            await this.closeAllConnections();
            console.log("\x1b[33m[INFO]\x1b[0m All connections closed. Exiting...");
            process.exit(0);
        });
    }

    /**
     * Creates and stores a new database connection.
     *
     * @param name - The name for the connection.
     * @param url - The MongoDB connection URL.
     * @param options - Optional Mongoose connection options.
     * @returns A Promise that resolves when the connection is added (or warned if already exists).
     */
    public addConnection = async (name: string, url: string, options: ConnectOptions = {}): Promise<void> => {
        if (this.Connections.has(name)) {
            console.log(`\x1b[33m[WARNING]\x1b[0m Connection "${name}" already exists.`);
            return;
        }

        try {
            // mongoose.createConnection returns a Promise<Connection> in recent versions
            // but the event listeners are attached to the Connection object itself.
            // We'll await the connection to ensure it's ready before storing.
            const conn: Connection = await mongoose.createConnection(url, options).asPromise();

            conn.on("connected", () => {
                console.log(`\x1b[32m[INFO]\x1b[0m Connection "${name}" established successfully.`);
            });

            conn.on("error", (err: Error) => {
                console.log(`\x1b[31m[ERROR]\x1b[0m Connection "${name}" error: ${err.message}`);
            });

            conn.on("disconnected", () => {
                console.log(`\x1b[33m[INFO]\x1b[0m Connection "${name}" disconnected.`);
                this.Connections.delete(name); // Remove from map when disconnected
            });

            this.Connections.set(name, conn);
        } catch (error: any) { // Catch any type of error
            console.log(`\x1b[31m[ERROR]\x1b[0m Failed to create connection "${name}": ${error.message}`);
        }
    };

    /**
     * Retrieves an existing database connection by name.
     *
     * @param name - The name of the connection.
     * @returns The Mongoose connection object, or `undefined` if not found.
     */
    public getConnection = (name: string): Connection | undefined => {
        if (!this.Connections.has(name)) {
            console.log(`\x1b[31m[ERROR]\x1b[0m Connection "${name}" not found.`);
            return undefined;
        }
        return this.Connections.get(name);
    };

    // /**
    //  * Retrieves the underlying MongoDB client object for a connection.
    //  *
    //  * @param name - The name of the connection.
    //  * @returns The MongoDB client object, or `undefined` if the connection is not found.
    //  */
    // public getClient = (name: string): MongoClient | undefined => {
    //     const connection = this.getConnection(name);
    //     // connection.getClient() returns the underlying MongoClient instance
    //     return connection ? connection.getClient() : undefined;
    // };

    /**
     * Retrieves the connection state.
     *
     * @param name - The name of the connection.
     * @returns The readyState of the connection (0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting).
     */
    public getState = (name: string): number => {
        const connection = this.getConnection(name);
        return connection ? connection.readyState : 0; // Default to 0 (disconnected) if connection not found
    };

    /**
     * Returns the number of active connections.
     * @returns The count of active connections.
     */
    public getActiveConnectionCount(): number {
        return this.Connections.size;
    }

    /**
     * Returns a list of connection names or detailed information.
     * @param withDetails - If true, returns an array of objects with connection details.
     * @returns An array of connection names (strings) or an array of connection detail objects.
     */
    public getAllConnections(withDetails: false): string[];
    public getAllConnections(withDetails: true): { name: string; state: number; models: string[]; uri: string; }[];
    public getAllConnections(withDetails: boolean = false): string[] | { name: string; state: number; models: string[]; uri: string; }[] {
        if (!withDetails) {
            return Array.from(this.Connections.keys());
        }

        const result: { name: string; state: number; models: string[]; uri: string; }[] = [];
        for (const [name, conn] of this.Connections.entries()) {
            result.push({
                name,
                state: conn.readyState,
                models: conn.modelNames(),
                uri: conn.host + '/' + conn.name // conn.name is the database name
            });
        }
        return result;
    }


    /**
     * Closes a specific database connection.
     *
     * @param name - The name of the connection.
     * @returns A Promise that resolves when the connection is closed.
     */
    public closeConnection = async (name: string): Promise<void> => {
        const connection = this.getConnection(name);
        if (connection) {
            await connection.close();
            // The 'disconnected' event listener will handle deleting from the map
            console.log(`\x1b[32m[INFO]\x1b[0m Connection "${name}" closed successfully.`);
        } else {
            console.log(`\x1b[33m[WARNING]\x1b[0m Attempted to close non-existent connection "${name}".`);
        }
    };

    /**
     * Closes all database connections managed by this instance.
     * @returns A Promise that resolves when all connections are closed.
     */
    public closeAllConnections = async (): Promise<void> => {
        const connectionPromises: Promise<void>[] = [];
        for (const [name, conn] of this.Connections.entries()) {
            connectionPromises.push(conn.close()
                .then(() => console.log(`\x1b[32m[INFO]\x1b[0m Connection "${name}" closed.`))
                .catch((error: any) => console.error(`\x1b[31m[ERROR]\x1b[0m Error closing connection "${name}": ${error.message}`))
            );
        }
        await Promise.allSettled(connectionPromises); // Use allSettled to wait for all to finish, even if some fail
        this.Connections.clear(); // Clear the map after attempting to close all
    };
}

const mongooseConnectionManager: MongooseConnectionManager = new MongooseConnectionManager();

export default mongooseConnectionManager;