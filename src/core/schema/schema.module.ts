// core/schema/schema.module.ts
import { Connection, Model, Schema } from "mongoose";

export interface ServiceResponse<T> {
  status: "success" | "error";
  data: T | any[];
}

class SchemaModule<T = any> {
  protected model: Model<T>;
  protected primaryKey: string;

  constructor(
    connection: Connection,
    modelName: string,
    modelSchema: Schema,
    // We still need this so 'update' knows which field to query!
    primaryKey: string = "_id" 
  ) {
    this.model = connection.models[modelName]
      ? (connection.models[modelName] as Model<T>)
      : connection.model<T>(modelName, modelSchema);
    
    this.primaryKey = primaryKey;
  }

  /**
   * 1. LOAD SNAPSHOT
   * Called ONLY when the server starts or Memoria crashes.
   * Dumps the entire DB into Memory.
   */
  public loadSnapshot = async (): Promise<T[]> => {
       return await this.model.find({});
  }

  /**
   * 2. CREATE
   * Called when a new player joins or a new guild is made.
   */
  public create = async (
    data: Partial<T>,
    validationFn?: (data: any) => any[] | true
  ): Promise<ServiceResponse<T>> => {
    if (validationFn) {
      const errors = validationFn(data);
      if (Array.isArray(errors) && errors.length > 0) {
        return { status: "error", data: errors };
      }
    }

    try {
      const newItem = new this.model(data);
      await newItem.save();
      return { status: "success", data: newItem };
    } catch (error: any) {
      return { status: "error", data: [error.message || error] };
    }
  };

  /**
   * 3. UPDATE
   * Called periodically (Auto-Save) or on Logout.
   * NEEDS primaryKey to know WHO to update.
   */
  public update = async (
    id: string,
    updateData: Partial<T>
  ): Promise<ServiceResponse<T>> => {
    try {
      // We need 'this.primaryKey' here to dynamically target 'playerId' or 'serverId'
      const filter = { [this.primaryKey]: id } as any; 

      const updatedItem = await this.model.findOneAndUpdate(
        filter,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedItem
        ? { status: "success", data: updatedItem }
        : { status: "error", data: ["Item not found!"] };
    } catch (error: any) {
      return { status: "error", data: [error.message || error] };
    }
  };

  /**
   * 4. DELETE
   */
  public delete = async (id: string): Promise<ServiceResponse<T>> => {
    try {
      const deletedItem = await this.model.findOneAndDelete({
        [this.primaryKey]: id,
      } as any);

      return deletedItem
        ? { status: "success", data: deletedItem }
        : { status: "error", data: ["Item not found!"] };
    } catch (error: any) {
      return { status: "error", data: [error.message || error] };
    }
  };
}

export default SchemaModule;