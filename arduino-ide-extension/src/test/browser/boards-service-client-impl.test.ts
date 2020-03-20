import { expect } from 'chai';
import { Container, injectable } from 'inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { MockLogger } from '@theia/core/lib/common/test/mock-logger';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { BoardsService, Board, Port, BoardsPackage, BoardDetails, BoardsServiceClient, AttachedSerialBoard } from '../../common/protocol';
import { BoardsServiceClientImpl } from '../../browser/boards/boards-service-client-impl';

describe('boards-service-client-impl', () => {

    describe('onAvailableBoardsChanged', () => {

        const ESP8266: Port = { protocol: 'serial', address: '/dev/cu.SLAB_USBtoUART' };
        const UNO: AttachedSerialBoard = { name: 'Arduino Uno', fqbn: 'arduino:avr:uno', port: '/dev/cu.usbmodem14501' };
        const MKR1000: AttachedSerialBoard = { name: 'Arduino MKR1000', fqbn: 'arduino:samd:mkr1000', port: '/dev/cu.usbmodem14601' };

        let server: MockBoardsService;
        let client: BoardsServiceClientImpl;
        // let storage: MockStorageService;

        beforeEach(() => {
            const container = init();
            server = container.get(MockBoardsService);
            client = container.get(BoardsServiceClientImpl);
            // storage = container.get(MockStorageService);
            server.setClient(client);
        });

        it('should have no available boards by default', () => {
            expect(client.availableBoards).to.have.length(0);
        });

        it('should be notified when a board is attached', async () => {
            await attach(MKR1000, UNO, ESP8266);
            expect(client.availableBoards).to.have.length(3);
        });

        it('should be notified when a board is detached', async () => {
            await attach(MKR1000, UNO, ESP8266);
            expect(client.availableBoards).to.have.length(3);
            await detach(MKR1000);
            expect(client.availableBoards).to.have.length(2);
        });

        async function detach(...toDetach: Array<Board | Port>): Promise<void> {
            server.detach(...toDetach);
            await Promise.race([
                client.onAttachedBoardsChanged,
                timeout("Have not received an 'onAttachedBoardsChanged' event.")
            ]);
            await Promise.race([
                client.onAvailableBoardsChanged,
                timeout("Have not received an 'onAvailableBoardsChanged' event.")
            ]);
        }

        async function attach(...toAttach: Array<Board | Port>): Promise<void> {
            server.attach(...toAttach);
            await Promise.race([
                client.onAttachedBoardsChanged,
                timeout("Have not received an 'onAttachedBoardsChanged' event.")
            ]);
            await Promise.race([
                client.onAvailableBoardsChanged,
                timeout("Have not received an 'onAvailableBoardsChanged' event.")
            ]);
        }

        function timeout(message: string, timeout: number = 2000): Promise<void> {
            return new Promise<void>((_, reject) => setTimeout(() => reject(new Error(message)), timeout));
        }

    });

});

function init(): Container {
    const container = new Container({ defaultScope: 'Singleton' });
    container.bind(MockBoardsService).toSelf();
    container.bind(MockLogger).toSelf();
    container.bind(ILogger).toService(MockLogger);
    container.bind(MockStorageService).toSelf();
    container.bind(StorageService).toService(MockStorageService);
    container.bind(BoardsServiceClientImpl).toSelf();

    return container;
}

@injectable()
export class MockBoardsService implements BoardsService {

    private client: BoardsServiceClient | undefined;

    boards: Board[] = [];
    ports: Port[] = [];
    details: Map<string, BoardDetails> = new Map();

    reset(): void {
        this.setState({ boards: [], ports: [], silent: true });
    }

    setState({ boards, ports, silent }: { boards: Board[], ports: Port[], silent?: boolean }): void {
        const oldState = { boards: this.boards, ports: this.ports };
        const newState = { boards, ports };
        if (this.client && !silent) {
            this.client.notifyAttachedBoardsChanged({ oldState, newState });
        }
    }

    detach(...toRemove: Array<Board | Port>): void {
        const oldState = { boards: this.boards.slice(), ports: this.ports.slice() };
        for (const what of toRemove) {
            if (Board.is(what)) {
                const index = this.boards.indexOf(what);
                if (index === -1) {
                    throw new Error(`${what} board is not attached. Boards were: ${JSON.stringify(oldState.boards)}`);
                }
                this.boards.splice(index, 1);
                if (AttachedSerialBoard.is(what)) {
                    const portIndex = this.ports.findIndex(({ protocol, address }) => protocol === 'serial' && address === what.port);
                    if (portIndex === -1) {
                        throw new Error(`${what} port is not available. Ports were: ${JSON.stringify(oldState.ports)}`);
                    }
                    this.ports.splice(portIndex, 1);
                }
            } else {
                const index = this.ports.indexOf(what);
                if (index === -1) {
                    throw new Error(`${what} port is not available. Ports were: ${JSON.stringify(oldState.ports)}`);
                }
                this.ports.splice(index, 1);
            }
        }
        const newState = { boards: this.boards, ports: this.ports };
        if (this.client) {
            this.client.notifyAttachedBoardsChanged({ oldState, newState });
        }
    }

    attach(...toAttach: Array<Board | Port>): void {
        const oldState = { boards: this.boards.slice(), ports: this.ports.slice() };
        for (const what of toAttach) {
            if (Board.is(what)) {
                if (AttachedSerialBoard.is(what)) {
                    this.ports.push({ protocol: 'serial', address: what.port });
                }
                this.boards.push(what);
            } else {
                this.ports.push(what);
            }
        }
        const newState = { boards: this.boards, ports: this.ports };
        if (this.client) {
            this.client.notifyAttachedBoardsChanged({ oldState, newState });
        }
    }

    async getAttachedBoards(): Promise<Board[]> {
        return this.boards;
    }

    async getAvailablePorts(): Promise<Port[]> {
        throw this.ports;
    }

    async getBoardDetails(options: { fqbn: string; }): Promise<BoardDetails> {
        const { fqbn } = options;
        const details = this.details.get(fqbn);
        if (details) {
            return details;
        }
        return {
            fqbn,
            configOptions: [],
            requiredTools: []
        };
    }

    getBoardPackage(): Promise<BoardsPackage> {
        throw new Error('Method not implemented.');
    }

    getContainerBoardPackage(): Promise<BoardsPackage> {
        throw new Error('Method not implemented.');
    }

    searchBoards(): Promise<Array<Board & { packageName: string; }>> {
        throw new Error('Method not implemented.');
    }

    install(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    uninstall(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    search(): Promise<BoardsPackage[]> {
        throw new Error('Method not implemented.');
    }

    dispose(): void {
        this.reset();
        this.client = undefined;
    }

    setClient(client: BoardsServiceClient | undefined): void {
        this.client = client;
    }

}

@injectable()
class MockStorageService implements StorageService {

    private store: Map<string, any> = new Map();

    reset(): void {
        this.store.clear();
    }

    async setData<T>(key: string, data: T): Promise<void> {
        this.store.set(key, data);
    }

    async getData<T>(key: string): Promise<T | undefined>;
    async getData<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const data = this.store.get(key);
        return data ? data : defaultValue;
    }

}
