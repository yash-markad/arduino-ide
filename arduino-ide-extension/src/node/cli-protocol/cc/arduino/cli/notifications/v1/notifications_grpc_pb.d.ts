// package: cc.arduino.cli.notifications.v1
// file: cc/arduino/cli/notifications/v1/notifications.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import {handleClientStreamingCall} from "@grpc/grpc-js/build/src/server-call";
import * as cc_arduino_cli_notifications_v1_notifications_pb from "../../../../../cc/arduino/cli/notifications/v1/notifications_pb";

interface INotificationsServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getNotifications: INotificationsServiceService_IGetNotifications;
}

interface INotificationsServiceService_IGetNotifications extends grpc.MethodDefinition<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest, cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse> {
    path: "/cc.arduino.cli.notifications.v1.NotificationsService/GetNotifications";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest>;
    requestDeserialize: grpc.deserialize<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest>;
    responseSerialize: grpc.serialize<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
    responseDeserialize: grpc.deserialize<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
}

export const NotificationsServiceService: INotificationsServiceService;

export interface INotificationsServiceServer {
    getNotifications: grpc.handleServerStreamingCall<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest, cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
}

export interface INotificationsServiceClient {
    getNotifications(request: cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
    getNotifications(request: cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
}

export class NotificationsServiceClient extends grpc.Client implements INotificationsServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getNotifications(request: cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
    public getNotifications(request: cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse>;
}
