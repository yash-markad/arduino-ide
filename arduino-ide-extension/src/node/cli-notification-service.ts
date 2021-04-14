import { inject, injectable } from 'inversify';
import * as grpc from '@grpc/grpc-js';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { NotificationsServiceClient } from './cli-protocol/cc/arduino/cli/notifications/v1/notifications_grpc_pb'
import * as serviceGrpcPb from './cli-protocol/cc/arduino/cli/notifications/v1/notifications_grpc_pb';
import { NotificationServiceServer } from '../common/protocol';
import { GetNotificationsRequest, GetNotificationsResponse, Notification } from './cli-protocol/cc/arduino/cli/notifications/v1/notifications_pb';
import { ConfigServiceImpl } from './config-service-impl';
import { ArduinoDaemonImpl } from './arduino-daemon-impl';

@injectable()
export class CliNotificationService implements BackendApplicationContribution {

    @inject(NotificationServiceServer)
    protected readonly notificationService: NotificationServiceServer;

    @inject(ConfigServiceImpl)
    protected readonly configService: ConfigServiceImpl;

    @inject(ArduinoDaemonImpl)
    protected readonly daemon: ArduinoDaemonImpl;

    onStart(): void {
        const listen = (port: string | number) => {
            const client = this.createClient(port);
            const stream = client.getNotifications(new GetNotificationsRequest());
            stream.on('data', (resp: GetNotificationsResponse) => {
                const notification = resp.getNotification();
                if (notification === Notification.NOTIFICATION_CORE_CHANGED) {
                    this.notificationService.notifyIndexUpdated();
                }
            });
            console.log('Started listening on notifications from the Arduino CLI...');
        };
        this.daemon.ready.then(() => {
            this.configService.getConfiguration().then(() => {
                const { cliConfiguration } = this.configService;
                listen(cliConfiguration!.daemon.port);
            });
        });
    }

    protected createClient(port: string | number): NotificationsServiceClient {
        // https://github.com/agreatfool/grpc_tools_node_protoc_ts/blob/master/doc/grpcjs_support.md#usage
        // @ts-ignore
        const NotificationsServiceClient = grpc.makeClientConstructor(serviceGrpcPb['cc.arduino.cli.notifications.v1.NotificationsService'], 'NotificationsServiceService') as any;
        return new NotificationsServiceClient(`localhost:${port}`, grpc.credentials.createInsecure()) as NotificationsServiceClient;
    }

}
