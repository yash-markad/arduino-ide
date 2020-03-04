import { inject, injectable } from 'inversify';
import { notEmpty } from '@theia/core/lib/common/objects';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { MenuModelRegistry } from '@theia/core/lib/common/menu';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { BoardsServiceClientImpl } from './boards-service-client-impl';
import { BoardsService, BoardPackage, BoardDetails, Board, ConfigOption } from '../../common/protocol';
import { LocalStorageService, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ArduinoMenus } from '../arduino-frontend-contribution';

@injectable()
export class BoardsDetailsMenuUpdater implements FrontendApplicationContribution {

    @inject(CommandRegistry)
    protected commandRegistry: CommandRegistry;

    @inject(MenuModelRegistry)
    protected menuRegistry: MenuModelRegistry;

    @inject(BoardsService)
    protected readonly boardsService: BoardsService;

    @inject(BoardsServiceClientImpl)
    protected readonly boardsServiceClient: BoardsServiceClientImpl;

    @inject(LocalStorageService)
    protected readonly storageService: LocalStorageService;

    protected readonly toDisposeOnBoardChange = new DisposableCollection();

    onStart(): void {
        this.boardsServiceClient.onBoardInstalled(({ pkg }) => this.getAllBoardDetails(pkg));
        this.boardsServiceClient.onBoardsConfigChanged(({ selectedBoard }) => this.updateMenuActions(selectedBoard));
        this.updateMenuActions(this.boardsServiceClient.boardsConfig.selectedBoard);
    }

    protected async getAllBoardDetails(pkg: BoardPackage): Promise<BoardDetails[]> {
        return await Promise.all(pkg.boards.map(({ fqbn }) => fqbn)
            .filter(notEmpty)
            .map(fqbn => this.boardsService.getBoardDetails({ fqbn })));
    }

    protected async updateMenuActions(selectedBoard: Board | undefined): Promise<void> {
        if (selectedBoard) {
            this.toDisposeOnBoardChange.dispose();
            const { fqbn } = selectedBoard;
            if (fqbn) {
                const configOptions = await this.getConfigOptions(fqbn);
                const boardsConfigMenuPath = [...ArduinoMenus.TOOLS, 'z_boardsConfig']; // `z_` is for ordering.
                for (const { label, option, values } of configOptions.sort(ConfigOption.LABEL_COMPARATOR)) {
                    const menuPath = [...boardsConfigMenuPath, `${label}`];
                    const commands = new Map<string, Disposable>()
                    for (const value of values) {
                        const id = `${fqbn}-${option}--${value.value}`;
                        const command = { id, label: value.label };
                        const handler = {
                            execute: () => console.log('executing', id),
                            isVisible: () => true,
                            isEnabled: () => true
                        };
                        commands.set(id, this.commandRegistry.registerCommand(command, handler));
                    }
                    this.toDisposeOnBoardChange.pushAll([
                        ...commands.values(),
                        this.menuRegistry.registerSubmenu(menuPath, label),
                        ...Array.from(commands.keys()).map((commandId, index) => this.menuRegistry.registerMenuAction(menuPath, { commandId, order: String(index) }))
                    ]);
                }
                console.log(this.commandRegistry.commandIds);
            }
        }
    }

    protected async getConfigOptions(fqbn: string): Promise<ConfigOption[]> {
        const key = this.getStorageKey(fqbn);
        let configOptions = await this.storageService.getData<ConfigOption[] | undefined>(key, undefined);
        if (configOptions) {
            // return configOptions;
        }
        const details = await this.boardsService.getBoardDetails({ fqbn })
        configOptions = details.configOptions;
        await this.storageService.setData(key, configOptions);
        return configOptions;
    }

    protected getStorageKey(fqbn: string): string {
        return `.arduinoProIDE-configOptions-${fqbn}`;
    }

}
