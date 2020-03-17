import { injectable, inject } from 'inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { MessageService } from '@theia/core/lib/common/message-service';
import { LocalStorageService } from '@theia/core/lib/browser/storage-service';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { RecursiveRequired } from '../../common/types';
import { BoardsServiceClient, AttachedBoardsChangeEvent, BoardInstalledEvent, AttachedSerialBoard, Board, Port, BoardUninstalledEvent } from '../../common/protocol';
import { BoardsConfig } from './boards-config';

@injectable()
export class BoardsServiceClientImpl implements BoardsServiceClient, FrontendApplicationContribution {

    @inject(ILogger)
    protected logger: ILogger;

    @inject(MessageService)
    protected messageService: MessageService;

    @inject(LocalStorageService)
    protected storageService: LocalStorageService;

    protected readonly onBoardInstalledEmitter = new Emitter<BoardInstalledEvent>();
    protected readonly onBoardUninstalledEmitter = new Emitter<BoardUninstalledEvent>();
    protected readonly onAttachedBoardsChangedEmitter = new Emitter<AttachedBoardsChangeEvent>();
    protected readonly onSelectedBoardsConfigChangedEmitter = new Emitter<BoardsConfig.Config>();
    protected readonly onAvailableBoardsChangedEmitter = new Emitter<AvailableBoard[]>();

    /**
     * Used for the auto-reconnecting. Sometimes, the attached board gets disconnected after uploading something to it.
     * It happens with certain boards on Windows. For example, the `MKR1000` boards is selected on post `COM5` on Windows,
     * perform an upload, the board automatically disconnects and reconnects, but on another port, `COM10`.
     * We have to listen on such changes and auto-reconnect the same board on another port.
     * See: https://arduino.slack.com/archives/CJJHJCJSJ/p1568645417013000?thread_ts=1568640504.009400&cid=CJJHJCJSJ
     */
    protected latestValidBoardsConfig: RecursiveRequired<BoardsConfig.Config> | undefined = undefined;
    protected _boardsConfig: BoardsConfig.Config = {};
    protected _attachedBoards: Board[] = []; // This does not contain the `Unknown` boards. They're visible from the available ports only.
    protected _availablePorts: Port[] = [];
    protected _availableBoards: AvailableBoard[] = [];

    /**
     * Event when the state of the attached/detached boards has changed. For instance, the user have detached a physical board.
     */
    readonly onBoardsChanged = this.onAttachedBoardsChangedEmitter.event;
    readonly onBoardInstalled = this.onBoardInstalledEmitter.event;
    readonly onBoardUninstalled = this.onBoardUninstalledEmitter.event;
    /**
     * Unlike `onBoardsChanged` this even fires when the user modifies the selected board in the IDE.\
     * This even also fires, when the boards package was not available for the currently selected board,
     * and the user installs the board package. Note: installing a board package will set the `fqbn` of the
     * currently selected board.\
     * This even also emitted when the board package for the currently selected board was uninstalled.
     */
    readonly onBoardsConfigChanged = this.onSelectedBoardsConfigChangedEmitter.event;
    readonly onAvailableBoardsChanged = this.onAvailableBoardsChangedEmitter.event;

    async onStart(): Promise<void> {
        return this.loadState();
    }

    /**
     * When the FE connects to the BE, the BE stets the known boards and ports.\
     * This is a DI workaround for not being able to inject the service into the client.
     */
    init({ attachedBoards, availablePorts }: { attachedBoards: Board[], availablePorts: Port[] }): void {
        this._attachedBoards = attachedBoards;
        this._availablePorts = availablePorts;
        this.reconcileAvailableBoards().then(() => this.tryReconnect());
    }

    notifyAttachedBoardsChanged(event: AttachedBoardsChangeEvent): void {
        this.logger.info('Attached boards and available ports changed: ', JSON.stringify(event));
        const { detached } = AttachedBoardsChangeEvent.diff(event);
        const { selectedPort, selectedBoard } = this.boardsConfig;
        this.onAttachedBoardsChangedEmitter.fire(event);
        // Dynamically unset the port if is not available anymore. A port can be "detached" when unplugging a board.
        if (detached.ports.some(port => Port.equals(selectedPort, port))) {
            this.boardsConfig = {
                selectedBoard,
                selectedPort: undefined
            };
        }
        this._attachedBoards = event.newState.boards;
        this._availablePorts = event.newState.ports;
        this.reconcileAvailableBoards().then(() => this.tryReconnect());
    }

    protected async tryReconnect(): Promise<boolean> {
        if (this.latestValidBoardsConfig && !this.canUploadTo(this.boardsConfig)) {
            for (const board of this.availableBoards) {
                if (this.latestValidBoardsConfig.selectedBoard.fqbn === board.fqbn
                    && this.latestValidBoardsConfig.selectedBoard.name === board.name
                    && Port.sameAs(this.latestValidBoardsConfig.selectedPort, board.port)) {

                    this.boardsConfig = this.latestValidBoardsConfig;
                    return true;
                }
            }
            // If we could not find an exact match, we compare the board FQBN-name pairs and ignore the port, as it might have changed.
            // See documentation on `latestValidBoardsConfig`.
            for (const board of this.availableBoards) {
                if (this.latestValidBoardsConfig.selectedBoard.fqbn === board.fqbn
                    && this.latestValidBoardsConfig.selectedBoard.name === board.name) {

                    this.boardsConfig = {
                        ...this.latestValidBoardsConfig,
                        selectedPort: board.port
                    };
                    return true;
                }
            }
        }
        return false;
    }

    notifyBoardInstalled(event: BoardInstalledEvent): void {
        this.logger.info('Board installed: ', JSON.stringify(event));
        this.onBoardInstalledEmitter.fire(event);
        const { selectedBoard } = this.boardsConfig;
        const { installedVersion, id } = event.pkg;
        if (selectedBoard) {
            const installedBoard = event.pkg.boards.find(({ name }) => name === selectedBoard.name);
            if (installedBoard && (!selectedBoard.fqbn || selectedBoard.fqbn === installedBoard.fqbn)) {
                this.logger.info(`Board package ${id}[${installedVersion}] was installed. Updating the FQBN of the currently selected ${selectedBoard.name} board. [FQBN: ${installedBoard.fqbn}]`);
                this.boardsConfig = {
                    ...this.boardsConfig,
                    selectedBoard: installedBoard
                };
            }
        }
    }

    notifyBoardUninstalled(event: BoardUninstalledEvent): void {
        this.logger.info('Board uninstalled: ', JSON.stringify(event));
        this.onBoardUninstalledEmitter.fire(event);
        const { selectedBoard } = this.boardsConfig;
        if (selectedBoard && selectedBoard.fqbn) {
            const uninstalledBoard = event.pkg.boards.find(({ name }) => name === selectedBoard.name);
            if (uninstalledBoard && uninstalledBoard.fqbn === selectedBoard.fqbn) {
                this.logger.info(`Board package ${event.pkg.id} was uninstalled. Discarding the FQBN of the currently selected ${selectedBoard.name} board.`);
                const selectedBoardWithoutFqbn = {
                    name: selectedBoard.name
                    // No FQBN
                };
                this.boardsConfig = {
                    ...this.boardsConfig,
                    selectedBoard: selectedBoardWithoutFqbn
                };
            }
        }
    }

    set boardsConfig(config: BoardsConfig.Config) {
        this.logger.info('Board config changed: ', JSON.stringify(config));
        this._boardsConfig = config;
        if (this.canUploadTo(this._boardsConfig)) {
            this.latestValidBoardsConfig = this._boardsConfig;
        }
        this.saveState().finally(() => {
            this.onSelectedBoardsConfigChangedEmitter.fire(this._boardsConfig);
            this.reconcileAvailableBoards();
        });
    }

    get boardsConfig(): BoardsConfig.Config {
        return this._boardsConfig;
    }

    /**
     * `true` if the `config.selectedBoard` is defined; hence can compile against the board. Otherwise, `false`.
     */
    canVerify(
        config: BoardsConfig.Config | undefined = this.boardsConfig,
        options: { silent: boolean } = { silent: true }): config is BoardsConfig.Config & { selectedBoard: Board } {

        if (!config) {
            return false;
        }

        if (!config.selectedBoard) {
            if (!options.silent) {
                this.messageService.warn('No boards selected.', { timeout: 3000 });
            }
            return false;
        }

        return true;
    }

    /**
     * `true` if `canVerify`, the board has an FQBN and the `config.selectedPort` is also set, hence can upload to board. Otherwise, `false`.
     */
    canUploadTo(
        config: BoardsConfig.Config | undefined = this.boardsConfig,
        options: { silent: boolean } = { silent: true }): config is RecursiveRequired<BoardsConfig.Config> {

        if (!this.canVerify(config, options)) {
            return false;
        }

        const { name } = config.selectedBoard;
        if (!config.selectedPort) {
            if (!options.silent) {
                this.messageService.warn(`No ports selected for board: '${name}'.`, { timeout: 3000 });
            }
            return false;
        }

        if (!config.selectedBoard.fqbn) {
            if (!options.silent) {
                this.messageService.warn(`The FQBN is not available for the selected board ${name}. Do you have the corresponding core installed?`, { timeout: 3000 });
            }
            return false;
        }

        return true;
    }

    get availableBoards(): AvailableBoard[] {
        return this._availableBoards;
    }

    protected async reconcileAvailableBoards(): Promise<void> {
        const attachedBoards = this._attachedBoards;
        const availablePorts = this._availablePorts;
        const boardsConfig = this.boardsConfig;
        const currentAvailableBoards = this._availableBoards;
        const availableBoards: AvailableBoard[] = [];

        const availableBoardPorts = availablePorts.filter(Port.isBoardPort);
        const attachedSerialBoards = attachedBoards.filter(AttachedSerialBoard.is);
        for (const boardPort of availableBoardPorts) {
            let state = AvailableBoard.State.incomplete; // Initial pessimism.
            let board = attachedSerialBoards.find(({ port }) => Port.sameAs(boardPort, port));
            if (board) {
                state = AvailableBoard.State.recognized;
            } else {
                // If the selected board is not recognized because it is a 3rd party board: https://github.com/arduino/arduino-cli/issues/623
                // We still want to show it without the red X in the boards toolbar: https://github.com/arduino/arduino-pro-ide/issues/198#issuecomment-599355836
                const lastSelectedBoard = await this.getLastSelectedBoardOnPort(boardPort);
                if (lastSelectedBoard) {
                    board = {
                        ...lastSelectedBoard,
                        port: Port.toString(boardPort)
                    };
                    state = AvailableBoard.State.guessed;
                }
            }
            if (!board) {
                availableBoards.push({ name: 'Unknown', port: boardPort, state });
            } else {
                const selected = BoardsConfig.Config.sameAs(boardsConfig, board);
                availableBoards.push({ ...board, state, selected, port: boardPort });
            }
        }

        const sortedAvailableBoards = availableBoards.sort(AvailableBoard.COMPARATOR);
        let hasChanged = sortedAvailableBoards.length !== currentAvailableBoards.length;
        if (!hasChanged) {
            for (let i = 0; i < sortedAvailableBoards.length; i++) {
                hasChanged = AvailableBoard.COMPARATOR(sortedAvailableBoards[i], currentAvailableBoards[i]) !== 0;
                if (hasChanged) {
                    break;
                }
            }
        }
        if (hasChanged) {
            this._availableBoards = sortedAvailableBoards;
            this.onAvailableBoardsChangedEmitter.fire(this._availableBoards);
        }
    }

    async getLastSelectedBoardOnPort(port: Port | string | undefined): Promise<Board | undefined> {
        if (!port) {
            return undefined;
        }
        const key = this.getLastSelectedBoardOnPortKey(port);
        return this.storageService.getData<Board>(key);
    }

    protected async saveState(): Promise<void> {
        // We save the port with the selected board name/FQBN, to be able to guess a better board name.
        // Required when the attached board belongs to a 3rd party boards package, and neither the name, nor
        // the FQBN can be retrieved with a `board list` command.
        // https://github.com/arduino/arduino-cli/issues/623
        const { selectedBoard, selectedPort } = this.boardsConfig;
        if (selectedBoard && selectedPort) {
            const key = this.getLastSelectedBoardOnPortKey(selectedPort);
            await this.storageService.setData(key, selectedBoard);
        }
        await this.storageService.setData('latest-valid-boards-config', this.latestValidBoardsConfig);
    }

    protected getLastSelectedBoardOnPortKey(port: Port | string): string {
        // TODO: we lose the port's `protocol` info (`serial`, `network`, etc.) here if the `port` is a `string`.
        return `last-selected-board-on-port-${typeof port === 'string' ? port : Port.toString(port)}`;
    }

    protected async loadState(): Promise<void> {
        const storedValidBoardsConfig = await this.storageService.getData<RecursiveRequired<BoardsConfig.Config>>('latest-valid-boards-config');
        if (storedValidBoardsConfig) {
            this.latestValidBoardsConfig = storedValidBoardsConfig;
            if (this.canUploadTo(this.latestValidBoardsConfig)) {
                this.boardsConfig = this.latestValidBoardsConfig;
            }
        }
    }

}

/**
 * Representation of a ready-to-use board configured on the FE. An available board is not
 * necessarily recognized by the CLI (e.g.: it is a 3rd party board) or correctly configured, but
 * it has the selected board and a associated port.
 */
export interface AvailableBoard extends Board {
    readonly state: AvailableBoard.State;
    readonly selected?: boolean;
    readonly port: Port;
}

export namespace AvailableBoard {

    export enum State {
        /**
         * Retrieved from the CLI via the `board list` command.
         */
        'recognized',
        /**
         * Guessed the name/FQBN of the board from the available board ports (3rd party).
         */
        'guessed',
        /**
         * We do not know anything about this board, probably a 3rd party. The user has not selected a board for this port yet.
         */
        'incomplete'
    }

    export const COMPARATOR = (left: AvailableBoard, right: AvailableBoard) => {
        let result = left.name.localeCompare(right.name);
        if (result !== 0) {
            return result;
        }
        if (left.fqbn && right.fqbn) {
            result = left.name.localeCompare(right.name);
            if (result !== 0) {
                return result;
            }
        }
        if (left.port && right.port) {
            result = Port.compare(left.port, right.port);
            if (result !== 0) {
                return result;
            }
        }
        if (!!left.selected && !right.selected) {
            return -1;
        }
        if (!!right.selected && !left.selected) {
            return 1;
        }
        return left.state - right.state;
    }
}
