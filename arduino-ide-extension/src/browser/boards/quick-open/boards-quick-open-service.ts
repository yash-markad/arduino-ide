import { inject, injectable, postConstruct } from 'inversify';
import { CommandContribution, CommandRegistry, Command } from '@theia/core/lib/common/command';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { QuickOpenItem, QuickOpenModel, QuickOpenMode } from '@theia/core/lib/common/quick-open-model';
import { QuickOpenOptions, QuickOpenContribution, QuickOpenHandler, QuickOpenHandlerRegistry, QuickOpenItemOptions, QuickOpenActionProvider, QuickOpenService } from '@theia/core/lib/browser/quick-open';
import { BoardsService, Port, Board } from '../../../common/protocol';
import { BoardsServiceClientImpl, AvailableBoard } from '../boards-service-client-impl';

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

    protected currentLookFor: string = '';
    protected availableBoards: AvailableBoard[] = [];

    // `init` name is used by the `QuickOpenHandler`.
    @postConstruct()
    protected postConstruct(): void {
        this.availableBoards = this.boardsServiceClient.availableBoards;
        this.boardsServiceClient.onAvailableBoardsChanged(availableBoards => this.availableBoards = availableBoards);
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
        const placeholder = 'Board name to search.';
        return {
            placeholder,
            fuzzyMatchLabel: {
                enableSeparateSubstringMatching: true
            },
            fuzzyMatchDescription: {
                enableSeparateSubstringMatching: true
            },
            showItemsWithoutHighlight: true
        };
    }

    open(): void {
        this.quickOpenService.open(this, this.getOptions());
    }

    onType(
        query: string,
        acceptor: (items: QuickOpenItem<QuickOpenItemOptions>[], actionProvider?: QuickOpenActionProvider) => void): void {

        if (query.trim().length) {
            this.boardsService.searchBoards({ query }).then(boards => {
                const { selectedBoard } = this.boardsServiceClient.boardsConfig;
                acceptor(Board.decorateBoards(selectedBoard, boards).map(this.toQuickItem.bind(this)));
            });
        } else {
            // const selected = this.availableBoards.find(({ selected }) => selected);

            acceptor(this.availableBoards.filter(AvailableBoard.hasPort).map(this.toQuickItem.bind(this)));
        }
    }

    protected toQuickItem(item: BoardsQuickOpenService.Item): QuickOpenItem<QuickOpenItemOptions> {
        if (AvailableBoard.is(item)) {
            return new QuickOpenItem<QuickOpenItemOptions>({
                label: `${item.name}`,
                description: `on ${Port.toString(item.port)}`,
                run: this.toRun(item)
            });
        } else {
            return new QuickOpenItem<QuickOpenItemOptions>({
                label: `${item.name}`,
                description: item.details,
                run: this.toRun(item)
            });
        }
    }

    protected toRun(item: BoardsQuickOpenService.Item): ((mode: QuickOpenMode) => boolean) | undefined {
        let run: (() => void) | undefined = undefined;
        if (AvailableBoard.is(item)) {
            run = () => this.boardsServiceClient.boardsConfig = ({ selectedBoard: item, selectedPort: item.port });
        } else {

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

    // protected open(items: QuickOpenItem | QuickOpenItem[], placeholder: string): void {
    //     this.quickOpenService.open(this.getModel(Array.isArray(items) ? items : [items]), this.getOptions(placeholder));
    // }

    // protected getOptions(placeholder: string, fuzzyMatchLabel: boolean = true, onClose: (canceled: boolean) => void = () => { }): QuickOpenOptions {
    //     return QuickOpenOptions.resolve({
    //         placeholder,
    //         fuzzyMatchLabel,
    //         fuzzySort: false,
    //         onClose
    //     });
    // }

    // getModel(items: QuickOpenItem | QuickOpenItem[]): QuickOpenModel {
    //     return {
    //         onType(_: string, acceptor: (items: QuickOpenItem[]) => void): void {
    //             acceptor(Array.isArray(items) ? items : [items]);
    //         }
    //     };
    // }

}

export namespace BoardsQuickOpenService {
    export type Item = AvailableBoard & { port: Port } | Board.Detailed
}
