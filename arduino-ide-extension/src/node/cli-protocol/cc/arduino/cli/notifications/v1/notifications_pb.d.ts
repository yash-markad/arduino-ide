// package: cc.arduino.cli.notifications.v1
// file: cc/arduino/cli/notifications/v1/notifications.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class GetNotificationsRequest extends jspb.Message { 
    clearFilterList(): void;
    getFilterList(): Array<Notification>;
    setFilterList(value: Array<Notification>): GetNotificationsRequest;
    addFilter(value: Notification, index?: number): Notification;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetNotificationsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetNotificationsRequest): GetNotificationsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetNotificationsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetNotificationsRequest;
    static deserializeBinaryFromReader(message: GetNotificationsRequest, reader: jspb.BinaryReader): GetNotificationsRequest;
}

export namespace GetNotificationsRequest {
    export type AsObject = {
        filterList: Array<Notification>,
    }
}

export class GetNotificationsResponse extends jspb.Message { 
    getNotification(): Notification;
    setNotification(value: Notification): GetNotificationsResponse;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetNotificationsResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetNotificationsResponse): GetNotificationsResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetNotificationsResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetNotificationsResponse;
    static deserializeBinaryFromReader(message: GetNotificationsResponse, reader: jspb.BinaryReader): GetNotificationsResponse;
}

export namespace GetNotificationsResponse {
    export type AsObject = {
        notification: Notification,
    }
}

export enum Notification {
    NOTIFICATION_UNSPECIFIED = 0,
    NOTIFICATION_CORE_CHANGED = 1,
}
