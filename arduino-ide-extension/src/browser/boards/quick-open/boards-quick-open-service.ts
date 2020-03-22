import * as fuzzy from 'fuzzy';
import { inject, injectable, postConstruct } from 'inversify';
import { CommandContribution, CommandRegistry, Command } from '@theia/core/lib/common/command';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { QuickOpenItem, QuickOpenModel, QuickOpenMode, QuickOpenGroupItem } from '@theia/core/lib/common/quick-open-model';
import {
    QuickOpenOptions,
    QuickOpenContribution,
    QuickOpenHandler,
    QuickOpenHandlerRegistry,
    QuickOpenItemOptions,
    QuickOpenActionProvider,
    QuickOpenService,
    QuickOpenGroupItemOptions
} from '@theia/core/lib/browser/quick-open';
import { BoardsService, Port, Board, ConfigOption } from '../../../common/protocol';
import { CoreServiceClientImpl } from '../../core-service-client-impl';
import { BoardsConfigStore } from '../boards-config-store';
import { BoardsServiceClientImpl, AvailableBoard } from '../boards-service-client-impl';
import { BoardsConfig } from '../boards-config';

@injectable()
export class BoardsQuickOpenService implements QuickOpenContribution, QuickOpenModel, QuickOpenHandler, CommandContribution, KeybindingContribution, Command {

    readonly id = 'arduino-boards-quick-open';
    readonly prefix = '|';
    readonly description = 'Configure Available Boards';
    readonly label: 'Configure Available Boards';

    @inject(QuickOpenService)
    protected readonly quickOpenService: QuickOpenService;

    @inject(BoardsService)
    protected readonly boardsService: BoardsService;

    @inject(BoardsServiceClientImpl)
    protected readonly boardsServiceClient: BoardsServiceClientImpl;

    @inject(BoardsConfigStore)
    protected readonly configStore: BoardsConfigStore;

    @inject(CoreServiceClientImpl)
    protected coreServiceClient: CoreServiceClientImpl;

    protected isOpen: boolean = false;
    protected currentQuery: string = '';
    // Attached boards plus the user's config.
    protected availableBoards: AvailableBoard[] = [];
    // Only for the `selected` one from the `availableBoards`. Note: the `port` of the `selected` is optional.
    protected boardConfigs: ConfigOption[] = [];
    protected allBoards: Board.Detailed[] = []
    protected selectedBoard?: (AvailableBoard & { port: Port });

    // `init` name is used by the `QuickOpenHandler`.
    @postConstruct()
    protected postConstruct(): void {
        this.coreServiceClient.onIndexUpdated(() => this.update(this.availableBoards));
        this.boardsServiceClient.onAvailableBoardsChanged(availableBoards => this.update(availableBoards));
        this.update(this.boardsServiceClient.availableBoards);
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(this, { execute: () => this.open() });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        registry.registerKeybinding({ command: this.id, keybinding: 'ctrlCmd+k ctrlCmd+b' });
    }

    registerQuickOpenHandlers(registry: QuickOpenHandlerRegistry): void {
        registry.registerHandler(this);
    }

    getModel(): QuickOpenModel {
        return this;
    }

    getOptions(): QuickOpenOptions {
        const segments: string[] = [];
        const selectedBoard = BoardsConfig.Config.toString(this.boardsServiceClient.boardsConfig);
        if (selectedBoard) {
            segments.push(`${selectedBoard}`);
        } else {
            segments.push('No board selected')
        }
        if (this.boardConfigs.length) {
            segments.push('Type to filter boards or use the ↓↑ keys to adjust the board settings...');
        } else {
            segments.push('Type to filter boards...');
        }
        const placeholder = segments.join(' ');
        return {
            placeholder,
            fuzzyMatchLabel: {
                enableSeparateSubstringMatching: true
            },
            fuzzyMatchDescription: {
                enableSeparateSubstringMatching: true
            },
            showItemsWithoutHighlight: true,
            onClose: () => this.isOpen = false
        };
    }

    open(): void {
        this.isOpen = true;
        this.quickOpenService.open(this, this.getOptions());
    }

    onType(
        query: string,
        acceptor: (items: QuickOpenItem<QuickOpenItemOptions>[], actionProvider?: QuickOpenActionProvider) => void): void {

        this.currentQuery = query;
        const shouldFilter = query.trim().length;
        const fuzzyFilter = ({ name }: { name: string }) => shouldFilter ? fuzzy.test(query, name) : true;
        const availableBoards = this.availableBoards.filter(AvailableBoard.hasPort).filter(fuzzyFilter);
        const toAccept: QuickOpenItem<QuickOpenItemOptions>[] = [];

        // Show the selected attached in a different group.
        if (this.selectedBoard) {
            toAccept.push(this.toQuickItem(this.selectedBoard, { groupLabel: 'Selected Board' }));
        }

        // Filter the selected from the attached ones.
        toAccept.push(...availableBoards.filter(board => board !== this.selectedBoard).map((board, i) => {
            let group: QuickOpenGroupItemOptions | undefined = undefined;
            if (i === 0) {
                group = { groupLabel: 'Attached Boards', showBorder: !!this.selectedBoard };
            }
            return this.toQuickItem(board, group);
        }));

        // Show the config only if the `input` is empty.
        if (!query.trim().length) {
            toAccept.push(...this.boardConfigs.map((config, i) => {
                let group: QuickOpenGroupItemOptions | undefined = undefined;
                if (i === 0) {
                    group = { groupLabel: 'Board Settings', showBorder: true };
                }
                return this.toQuickItem(config, group);
            }));
        } else {
            toAccept.push(...this.allBoards.filter(fuzzyFilter).map((board, i) => {
                let group: QuickOpenGroupItemOptions | undefined = undefined;
                if (i === 0) {
                    group = { groupLabel: 'Boards', showBorder: true };
                }
                return this.toQuickItem(board, group);
            }));
        }

        acceptor(toAccept);
    }

    protected async update(availableBoards: AvailableBoard[]): Promise<void> {
        // `selectedBoard` is not an attached board, we need to show the board settings for it (TODO: clarify!)
        const selectedBoard = availableBoards.filter(AvailableBoard.hasPort).find(({ selected }) => selected);
        const [configs, boards] = await Promise.all([
            selectedBoard && selectedBoard.fqbn ? this.configStore.getConfig(selectedBoard.fqbn) : Promise.resolve([]),
            this.boardsService.searchBoards({})
        ]);
        this.allBoards = Board.decorateBoards(selectedBoard, boards)
            .filter(board => !availableBoards.some(availableBoard => Board.sameAs(availableBoard, board)));
        this.availableBoards = availableBoards;
        this.boardConfigs = configs;
        this.selectedBoard = selectedBoard;

        if (this.isOpen) {
            // Hack, to update the state without closing and reopening the quick open widget.
            (this.quickOpenService as any).onType(this.currentQuery);
        }
    }

    protected toQuickItem(item: BoardsQuickOpenService.Item, group?: QuickOpenGroupItemOptions): QuickOpenItem<QuickOpenItemOptions> {
        let options: QuickOpenItemOptions;
        if (AvailableBoard.is(item)) {
            options = {
                label: `${item.name}`,
                description: `on ${Port.toString(item.port)}`,
                run: this.toRun(item)
            };
        } else if (ConfigOption.is(item)) {
            const selected = item.values.find(({ selected }) => selected);
            options = {
                label: `${item.label}${selected ? `: ${selected.label}` : ''}`,
                run: this.toRun(item)
            };
            if (!selected) {
                options.description = 'Not set';
            };
        } else {
            options = {
                label: `${item.name}`,
                description: item.details,
                run: this.toRun(item)
            };
        }
        if (group) {
            return new QuickOpenGroupItem<QuickOpenGroupItemOptions>({ ...options, ...group });
        } else {
            return new QuickOpenItem<QuickOpenItemOptions>(options);
        }
    }

    protected toRun(item: BoardsQuickOpenService.Item): ((mode: QuickOpenMode) => boolean) | undefined {
        let run: (() => void) | undefined = undefined;
        if (AvailableBoard.is(item)) {
            run = () => this.boardsServiceClient.boardsConfig = ({ selectedBoard: item, selectedPort: item.port });
        } else if (ConfigOption.is(item)) {
            run = () => console.log(`Alter the value of '${item.label}' Current is: ${item.values.filter(({ selected }) => selected).map(({ label }) => label)}`);
        } else {
            run = () => console.log(`Select '${item.name}' show the port!.`);
        }
        if (run) {
            return (mode) => {
                if (mode !== QuickOpenMode.OPEN) {
                    return false;
                }
                run!();
                return true;
            }
        }
        return undefined;
    }

}

export namespace BoardsQuickOpenService {
    export type Item = AvailableBoard & { port: Port } | Board.Detailed | ConfigOption;
}
