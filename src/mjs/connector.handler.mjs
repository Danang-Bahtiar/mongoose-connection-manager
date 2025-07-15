import mongoose from "mongoose"

/**
 * Handles multiple MongoDB connections using a Map.
 */
class MongooseConnectionManager {
    constructor() {
        /**
         * Stores database connections with their respective names.
         * @type {Map<string, import('mongoose').Connection>}
         */
        this.Connections = new Map();

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
     * @param {string} name - The name for the connection.
     * @param {string} url - The MongoDB connection URL.
     * @param {object} [options] - Optional Mongoose connection options.
     * @returns {Promise<void>} - No return value.
     */
    addConnection = async (name, url, options = {}) => {
        if (this.Connections.has(name)) {
            console.log(`\x1b[33m[WARNING]\x1b[0m Connection "${name}" already exists.`);
            return;
        }

        try {
            const conn = mongoose.createConnection(url, options);

            conn.on("connected", () => {
                console.log(`\x1b[32m[INFO]\x1b[0m Connection "${name}" established successfully.`);
            });

            conn.on("error", (err) => {
                console.log(`\x1b[31m[ERROR]\x1b[0m Connection "${name}" error: ${err.message}`);
            });

            conn.on("disconnected", () => {
                console.log(`\x1b[33m[INFO]\x1b[0m Connection "${name}" disconnected.`);
                this.Connections.delete(name);
            });

            this.Connections.set(name, conn);
        } catch (error) {
            console.log(`\x1b[31m[ERROR]\x1b[0m Failed to create connection "${name}": ${error.message}`);
        }
    };

    /**
     * Retrieves an existing database connection by name.
     * 
     * @param {string} name - The name of the connection.
     * @returns {import('mongoose').Connection | undefined} - The Mongoose connection object, or `undefined` if not found.
     */
    getConnection = (name) => {
        if (!this.Connections.has(name)) {
            console.log(`\x1b[31m[ERROR]\x1b[0m Connection "${name}" not found.`);
            return undefined;
        }
        return this.Connections.get(name);
    };

    /**
     * Retrieves details about a connection.
     * 
     * @param {string} name - The name of the connection.
     * @returns {import('mongodb').MongoClient | undefined} - The MongoDB client object.
     */
    getClient = (name) => {
        const connection = this.getConnection(name);
        return connection ? connection.getClient() : undefined;
    };

    /**
     * Retrieves the connection state.
     * 
     * @param {string} name - The name of the connection.
     * @returns {number} - The readyState of the connection.
     */
    getState = (name) => {
        const connection = this.getConnection(name);
        return connection ? connection.readyState : 0;
    };

    getActiveConnectionCount() {
        return this.Connections.size;
    }

    getAllConnections(withDetails = false) {
        if (!withDetails) {
            return Array.from(this.Connections.keys());
        }

        const result = [];
        for (const [name, conn] of this.Connections.entries()) {
            result.push({
                name,
                state: conn.readyState, // 0 = disconnected, 1 = connected, etc.
                models: conn.modelNames(),
                uri: conn.host + '/' + conn.name
            });
        }
        return result;
    }


    /**
     * Closes a specific database connection.
     * 
     * @param {string} name - The name of the connection.
     */
    closeConnection = async (name) => {
        const connection = this.getConnection(name);
        if (connection) {
            await connection.close();
            this.Connections.delete(name);
            console.log(`\x1b[32m[INFO]\x1b[0m Connection "${name}" closed successfully.`);
        }
    };

    /**
     * Closes all database connections.
     */
    closeAllConnections = async () => {
        for (const [name, conn] of this.Connections.entries()) {
            await conn.close();
            console.log(`\x1b[32m[INFO]\x1b[0m Connection "${name}" closed.`);
        }
        this.Connections.clear();
    };

}

const mongooseConnectionManager = new MongooseConnectionManager();

export default mongooseConnectionManager;