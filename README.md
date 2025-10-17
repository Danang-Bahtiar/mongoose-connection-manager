# READ ME NOT UPDATED, Module change from Mongoose Connection Manager to MyriadJS.
# READ ME and JSDocs will be updated on next update.

# Mongoose Connection Manager

A lightweight and modular class for managing **multiple MongoDB connections** using Mongoose. Supports easy creation, retrieval, monitoring, and cleanup of named connections.

---

## ✨ Features

- 🔌 Add and store multiple named Mongoose connections
- 📡 Get connection state, active connection count, or MongoDB client
- 🧹 Graceful shutdown on `SIGINT` with auto-close of all connections
- 🧾 Optional detailed connection listing (models, URIs, states)
- ✅ Clean API for integration in larger applications

---

## 📦 Installation

```bash
npm install mongoose-connection-manager
```

## 🚀 Usage
1. Add a new connection
```bash
await mongooseConnectionManager.addConnection("mainDB", "mongodb://localhost:27017/mydb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```
2. Get a connection (to use with models, etc.)
```bash
const conn = mongooseConnectionManager.getConnection("mainDB");
const User = conn.model("User", new mongoose.Schema({ name: String }));
```
3. Get raw MongoDB client
```bash
const client = mongooseConnectionManager.getClient("mainDB");
```
4. Get connection state
```bash
const state = mongooseConnectionManager.getState("mainDB");
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
```
5. List connections
```bash
const names = mongooseConnectionManager.getAllConnections();
// ['mainDB', 'logsDB', ...]

const details = mongooseConnectionManager.getAllConnections(true);
/*
[
  {
    name: 'mainDB',
    state: 1,
    models: ['User'],
    uri: 'localhost/mydb'
  },
  ...
]
*/
```
6. Get active connection count
```bash
const count = mongooseConnectionManager.getActiveConnectionCount();
```
7. Close one or all connections
```bash
await mongooseConnectionManager.closeConnection("mainDB");
await mongooseConnectionManager.closeAllConnections();
💡 All connections are automatically closed when the process receives a SIGINT (e.g., Ctrl+C).
```

## 🧪 Example: Define models with specific connection
```bash
const conn = mongooseConnectionManager.getConnection("mainDB");

const User = conn.model("User", new mongoose.Schema({
  username: String,
  createdAt: { type: Date, default: Date.now }
}));

await User.create({ username: "dan" });
```

## 📚 API Summary
| Method | Description |
| -------|-------------|
| addConnection(name, url, options?) |Creates and stores a new Mongoose connection. |
getConnection(name)|	Retrieves a specific connection.
getClient(name)	|Retrieves the underlying MongoClient instance.
getState(name)	|Returns the readyState of a connection.
getAllConnections(withDetails?)	|Returns names or full details of all connections.
getActiveConnectionCount()	|Returns the number of active connections.
closeConnection(name)	|Closes a specific connection.
closeAllConnections()	|Closes all active connections.