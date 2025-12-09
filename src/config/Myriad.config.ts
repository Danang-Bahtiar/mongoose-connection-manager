import {  Schema } from "mongoose"
import Myriad from "../core/myriad/Myriad.js";
import SchemaModule from "../core/schema/schema.module.js";

export interface ExtendedMyriad extends Myriad {
  [key: string]: SchemaModule | any;
}

export interface MyriadConfig{
    useGlobalUri: boolean,
    globalUri?: string,
    libMode: boolean,
    records: RecordConfig[]
}

export interface RecordConfig {
    name: string,
    uri?: string,
    modelName: string,
    modelSchema: Schema,
    moduleName: string,
    modelModule: string | any
}
