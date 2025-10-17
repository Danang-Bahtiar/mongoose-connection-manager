import { Connection, Model, Schema } from "mongoose";

class SchemaModule {
  protected model: Model<any>;

  constructor(connection: Connection, modelName: string, modelSchema: Schema) {
    this.model = connection.models[modelName]
      ? connection.models[modelName]
      : connection.model(modelName, modelSchema);
  }
}

export default SchemaModule;
