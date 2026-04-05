declare namespace NodeJS {
    export interface ProcessEnv {
        CLIENT_TOKEN: string;
        CLIENT_ID: string;
    }
}declare module "uuid";
declare type CanvasRenderingContext2D = import("@napi-rs/canvas").SKRSContext2D;
