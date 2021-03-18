import { injectable } from 'inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { MonitorServiceClient, MonitorError, MonitorRead } from '../../common/protocol/monitor-service';

@injectable()
export class MonitorServiceClientImpl implements MonitorServiceClient {

    protected readonly onReadEmitter = new Emitter<MonitorRead>();
    protected readonly onErrorEmitter = new Emitter<MonitorError>();
    readonly onError = this.onErrorEmitter.event;
    readonly onRead = this.onReadEmitter.event;

    notifyError(error: MonitorError): void {
        this.onErrorEmitter.fire(error);
    }

    notifyRead(event: MonitorRead): void {
        this.onReadEmitter.fire(event);
    }

}
