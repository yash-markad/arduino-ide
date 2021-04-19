import { inject, injectable } from 'inversify';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { MenuModelRegistry } from '@theia/core/lib/common/menu';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/browser/preferences/preference-service';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { MainMenuManager } from '../../../common/main-menu-manager';
import { ArduinoPreferences } from '../../arduino-preferences';
import { SketchbookWidget } from './sketchbook-widget';
import { ArduinoMenus } from '../../menu/arduino-menus';
import { SketchbookTree } from './sketchbook-tree';
import { SketchbookCommands } from './sketchbook-commands';

@injectable()
export class SketchbookWidgetContribution extends AbstractViewContribution<SketchbookWidget> implements FrontendApplicationContribution {

    @inject(ArduinoPreferences)
    protected readonly arduinoPreferences: ArduinoPreferences;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(MainMenuManager)
    protected readonly mainMenuManager: MainMenuManager;

    constructor() {
        super({
            widgetId: 'arduino-sketchbook-widget',
            widgetName: 'Sketchbook',
            defaultWidgetOptions: {
                area: 'left',
                rank: 1
            },
            toggleCommandId: 'arduino-sketchbook-widget:toggle',
            toggleKeybinding: 'CtrlCmd+Shift+B'
        });
    }

    onStart(): void {
        this.arduinoPreferences.onPreferenceChanged(({ preferenceName }) => {
            if (preferenceName === 'arduino.sketchbook.showAllFiles') {
                this.mainMenuManager.update();
            }
        });
    }

    async initializeLayout(): Promise<void> {
        return this.openView() as Promise<any>;
    }

    registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);
        registry.registerCommand({ id: 'arduino-sketchbook--show-sketch-files' }, {
            execute: () => this.preferenceService.set('arduino.sketchbook.showAllFiles', true, PreferenceScope.User),
            isEnabled: () => !this.arduinoPreferences['arduino.sketchbook.showAllFiles'],
            isVisible: () => !this.arduinoPreferences['arduino.sketchbook.showAllFiles']
        });
        registry.registerCommand({ id: 'arduino-sketchbook--hide-sketch-files' }, {
            execute: () => this.preferenceService.set('arduino.sketchbook.showAllFiles', false, PreferenceScope.User),
            isEnabled: () => this.arduinoPreferences['arduino.sketchbook.showAllFiles'],
            isVisible: () => this.arduinoPreferences['arduino.sketchbook.showAllFiles']
        });
        registry.registerCommand(SketchbookCommands.OPEN, {
            execute: () => console.log('open sketch'),
            isEnabled: (arg) => SketchbookTree.SketchDirNode.is(arg),
            isVisible: (arg) => SketchbookTree.SketchDirNode.is(arg),
        });
        registry.registerCommand(SketchbookCommands.OPEN_NEW_WINDOW, {
            execute: () => console.log('open sketch in new window'),
            isEnabled: (arg) => SketchbookTree.SketchDirNode.is(arg),
            isVisible: (arg) => SketchbookTree.SketchDirNode.is(arg),
        });
    }

    registerMenus(registry: MenuModelRegistry): void {
        super.registerMenus(registry);
        registry.registerMenuAction(ArduinoMenus.FILE__ADVANCED_SUBMENU, {
            commandId: 'arduino-sketchbook--show-sketch-files',
            label: 'Show sketch files',
            order: '2'
        });
        registry.registerMenuAction(ArduinoMenus.FILE__ADVANCED_SUBMENU, {
            commandId: 'arduino-sketchbook--hide-sketch-files',
            label: 'Hide sketch files',
            order: '2'
        });
    }

}
