import { injectable } from 'inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { MonitorServiceClient, MonitorError } from '../../common/protocol/monitor-service';

@injectable()
export class MonitorServiceClientImpl implements MonitorServiceClient {

    protected readonly onReadEmitter = new Emitter<{ message: string }>();
    protected readonly onErrorEmitter = new Emitter<MonitorError>();
    readonly onError = this.onErrorEmitter.event;
    readonly onRead = this.onReadEmitter.event;

    notifyError(error: MonitorError): void {
        this.onErrorEmitter.fire(error);
    }

    notifyRead({ message }: { message: string }): void {
        this.onReadEmitter.fire({ message });
    }

}
