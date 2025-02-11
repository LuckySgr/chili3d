// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { I18nKeys } from "chili-core";
import { div, label, setSVGIcon, svg } from "../controls";
import { localize } from "../localize";
import style from "./expander.module.css";

export class Expander extends HTMLElement {
    private _isExpanded = true;
    private readonly expanderIcon: SVGSVGElement;
    private readonly headerPanel = div({ className: style.headerPanel });
    readonly contenxtPanel = div({ className: style.contextPanel });

    constructor(header: I18nKeys) {
        super();
        this.className = style.rootPanel;
        this.expanderIcon = svg({
            icon: this.getExpanderIcon(),
            className: style.expanderIcon,
            onclick: this._handleExpanderClick,
        });
        const text = label({
            textContent: localize(header),
            className: style.headerText,
        });
        this.headerPanel.append(this.expanderIcon, text);
        super.append(this.headerPanel, this.contenxtPanel);
    }

    override appendChild<T extends Node>(node: T): T {
        return this.contenxtPanel.appendChild(node);
    }

    override append(...nodes: Node[]): void {
        this.contenxtPanel.append(...nodes);
    }

    override removeChild<T extends Node>(child: T): T {
        return this.contenxtPanel.removeChild(child);
    }

    addItem(...nodes: Node[]) {
        this.append(...nodes);
        return this;
    }

    private getExpanderIcon() {
        return this._isExpanded ? "icon-angle-down" : "icon-angle-right";
    }

    private readonly _handleExpanderClick = (e: MouseEvent) => {
        e.stopPropagation();
        this._isExpanded = !this._isExpanded;
        setSVGIcon(this.expanderIcon, this.getExpanderIcon());
        this.contenxtPanel.classList.toggle(style.hidden, !this._isExpanded);
    };
}

customElements.define("chili-expander", Expander);
