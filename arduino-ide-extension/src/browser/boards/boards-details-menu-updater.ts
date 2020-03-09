import { inject, injectable } from 'inversify';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { MenuModelRegistry, MenuNode } from '@theia/core/lib/common/menu';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { BoardsServiceClientImpl } from './boards-service-client-impl';
import { Board, ConfigOption } from '../../common/protocol';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ArduinoMenus } from '../arduino-frontend-contribution';
import { BoardsConfigStore } from './boards-config-store';

@injectable()
export class BoardsDetailsMenuUpdater implements FrontendApplicationContribution {

    @inject(CommandRegistry)
    protected commandRegistry: CommandRegistry;

    @inject(MenuModelRegistry)
    protected menuRegistry: MenuModelRegistry;

    @inject(BoardsConfigStore)
    protected boardsConfigStore: BoardsConfigStore;

    @inject(BoardsServiceClientImpl)
    protected readonly boardsServiceClient: BoardsServiceClientImpl;

    protected readonly toDisposeOnBoardChange = new DisposableCollection();

    onStart(): void {
        this.boardsServiceClient.onBoardsConfigChanged(({ selectedBoard }) => this.updateMenuActions(selectedBoard));
        this.updateMenuActions(this.boardsServiceClient.boardsConfig.selectedBoard);
    }

    protected async updateMenuActions(selectedBoard: Board | undefined): Promise<void> {
        if (selectedBoard) {
            this.toDisposeOnBoardChange.dispose();
            const { fqbn } = selectedBoard;
            if (fqbn) {
                const configOptions = await this.boardsConfigStore.getConfig(fqbn);
                const boardsConfigMenuPath = [...ArduinoMenus.TOOLS, 'z_boardsConfig']; // `z_` is for ordering.
                for (const { label, option, values } of configOptions.sort(ConfigOption.LABEL_COMPARATOR)) {
                    const menuPath = [...boardsConfigMenuPath, `${option}`];
                    const commands = new Map<string, Disposable>()
                    for (const value of values) {
                        const id = `${fqbn}-${option}--${value.value}`;
                        const command = { id, label: value.label };
                        const selectedValue = value.value;
                        const handler = {
                            execute: () => this.boardsConfigStore.setSelected({ fqbn, option, selectedValue }).then(() => this.updateMenuActions(selectedBoard)),
                            isToggled: () => value.selected
                        };
                        commands.set(id, this.commandRegistry.registerCommand(command, handler));
                    }
                    console.log(label, option);
                    // We cannot dispose submenu entries: https://github.com/eclipse-theia/theia/issues/7299
                    this.menuRegistry.registerSubmenu(menuPath, label);
                    this.toDisposeOnBoardChange.pushAll([
                        ...commands.values(),
                        Disposable.create(() => this.unregisterSubmenu(menuPath)),
                        ...Array.from(commands.keys()).map((commandId, index) => this.menuRegistry.registerMenuAction(menuPath, { commandId, order: String(index) }))
                    ]);
                }
            }
        }
    }

    protected setSelected({ fqbn, option, selectedValue }: { fqbn: string, option: string, selectedValue: string }): void {
        this.boardsConfigStore.setSelected({ fqbn, option, selectedValue }).then(() => (this.menuRegistry as any).fireChanged());
    }

    protected unregisterSubmenu(menuPath: string[]): void {
        if (menuPath.length < 2) {
            throw new Error(`Expected at least two item as a menu-path. Got ${JSON.stringify(menuPath)} instead.`);
        }
        const toRemove = menuPath[menuPath.length - 1];
        const parentMenuPath = menuPath.slice(0, menuPath.length - 1);
        // This is unsafe. Calling `getMenu` with a non-existing menu-path will result in a new menu creation.
        // https://github.com/eclipse-theia/theia/issues/7300
        const parent = this.menuRegistry.getMenu(parentMenuPath);
        const index = parent.children.findIndex(c => c.id === toRemove);
        if (index === -1) {
            throw new Error(`Could not find menu with menu-path: ${JSON.stringify(menuPath)}.`);
        }
        (parent.children as Array<MenuNode>).splice(index, 1);
        (this.menuRegistry as any).fireChanged();
    }

}
