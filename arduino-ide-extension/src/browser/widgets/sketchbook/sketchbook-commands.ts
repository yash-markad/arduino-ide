import { Command } from '@theia/core/lib/common/command';

export namespace SketchbookCommands {

    export const OPEN: Command = {
        id: 'arduino-sketchbook--open-sketch',
        label: 'Open Sketch',
        iconClass: 'fa fa-play-circle'
    };

    export const OPEN_NEW_WINDOW: Command = {
        id: 'arduino-sketchbook--open-sketch-new-window',
        label: 'Open Sketch in New Window',
        iconClass: 'fa fa-check'
    };

}
