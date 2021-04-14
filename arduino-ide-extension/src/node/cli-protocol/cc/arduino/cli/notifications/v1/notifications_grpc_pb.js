// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// This file is part of arduino-cli.
//
// Copyright 2020 ARDUINO SA (http://www.arduino.cc/)
//
// This software is released under the GNU General Public License version 3,
// which covers the main part of arduino-cli.
// The terms of this license can be found at:
// https://www.gnu.org/licenses/gpl-3.0.en.html
//
// You can be released from the requirements of the above licenses by purchasing
// a commercial license. Buying such a license is mandatory if you want to
// modify or otherwise use the software for commercial activities involving the
// Arduino software without disclosing the source code of your own applications.
// To purchase a commercial license, send an email to license@arduino.cc.
//
'use strict';
var cc_arduino_cli_notifications_v1_notifications_pb = require('../../../../../cc/arduino/cli/notifications/v1/notifications_pb.js');

function serialize_cc_arduino_cli_notifications_v1_GetNotificationsRequest(arg) {
  if (!(arg instanceof cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest)) {
    throw new Error('Expected argument of type cc.arduino.cli.notifications.v1.GetNotificationsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cc_arduino_cli_notifications_v1_GetNotificationsRequest(buffer_arg) {
  return cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cc_arduino_cli_notifications_v1_GetNotificationsResponse(arg) {
  if (!(arg instanceof cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse)) {
    throw new Error('Expected argument of type cc.arduino.cli.notifications.v1.GetNotificationsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cc_arduino_cli_notifications_v1_GetNotificationsResponse(buffer_arg) {
  return cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var NotificationsServiceService = exports['cc.arduino.cli.notifications.v1.NotificationsService'] = {
  getNotifications: {
    path: '/cc.arduino.cli.notifications.v1.NotificationsService/GetNotifications',
    requestStream: false,
    responseStream: true,
    requestType: cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsRequest,
    responseType: cc_arduino_cli_notifications_v1_notifications_pb.GetNotificationsResponse,
    requestSerialize: serialize_cc_arduino_cli_notifications_v1_GetNotificationsRequest,
    requestDeserialize: deserialize_cc_arduino_cli_notifications_v1_GetNotificationsRequest,
    responseSerialize: serialize_cc_arduino_cli_notifications_v1_GetNotificationsResponse,
    responseDeserialize: deserialize_cc_arduino_cli_notifications_v1_GetNotificationsResponse,
  },
};

