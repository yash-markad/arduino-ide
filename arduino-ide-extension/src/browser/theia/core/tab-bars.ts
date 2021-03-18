import { h, VirtualElement, ElementAttrs, ElementInlineStyle } from '@phosphor/virtualdom';
import { TabBar } from '@phosphor/widgets';
import { Saveable } from '@theia/core/lib/browser/saveable';
import { SideBarRenderData, TabBarRenderer as TheiaTabBarRenderer } from '@theia/core/lib/browser/shell/tab-bars';

export class TabBarRenderer extends TheiaTabBarRenderer {

    createTabClass(data: TabBar.IRenderData<any>): string {
        let className = super.createTabClass(data);
        if (!data.title.closable && Saveable.isDirty(data.title.owner)) {
            className += ' p-mod-closable';
        }
        return className;
    }

    renderBadge(data: SideBarRenderData, isInSidePanel?: boolean): VirtualElement {
        const badge: any = this.getDecorationData(data.title, 'badge')[0];
        if (!badge) {
            return h.div({});
        }
        let value = '';
        if (typeof badge === 'number') {
            value = badge >= 100 ? '99+' : String(badge);
        } else if (typeof badge === 'string') {
            value = badge;
        }
        let style: ElementInlineStyle = {};
        const backgroundColor = this.getDecorationData(data.title, 'backgroundColor')[0];
        if (backgroundColor) {
            style = Object.assign(style, { backgroundColor });
        }
        const attributes: ElementAttrs = isInSidePanel
            ? { className: 'theia-badge-decorator-sidebar', style }
            : { className: 'theia-badge-decorator-horizontal', style };
        return h.div(attributes, value);
    }

}
