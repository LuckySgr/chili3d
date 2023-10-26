// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { CollectionAction, CollectionChangedArgs, ObservableCollection } from "chili-core";
import { Props, setProps } from "../controls";

export interface ItemsProps extends Props {
    sources: ObservableCollection<any>;
    template: (item: any) => HTMLDivElement;
}

export class ItemsElement extends HTMLElement {
    #itemMap = new Map<any, HTMLElement>();
    constructor(readonly props: ItemsProps) {
        super();
        setProps(props, this);
        this.append(...this.#mapItems(props.sources.items));
    }

    connectedCallback() {
        this.props.sources.onCollectionChanged(this.#onCollectionChanged);
    }

    disconnectedCallback() {
        this.props.sources.removeCollectionChanged(this.#onCollectionChanged);
    }

    #onCollectionChanged = (args: CollectionChangedArgs) => {
        if (args.action === CollectionAction.add) {
            this.append(...this.#mapItems(args.items));
        } else if (args.action === CollectionAction.remove) {
            this.#removeItem(args.items);
        } else if (args.action === CollectionAction.move) {
            this.#moveItem(args.from, args.to);
        } else if (args.action === CollectionAction.replace) {
            this.#replaceItem(args.item, args.items);
        } else {
            throw new Error("Unknown collection action");
        }
    };

    #moveItem(from: number, to: number) {
        let item1 = this.children.item(from);
        let item2 = this.children.item(to);
        if (item1 && item2) this.insertBefore(item1, item2);
    }

    #replaceItem(item: any, items: any[]) {
        let child = this.#itemMap.get(item);
        if (child) {
            items.forEach((item) => {
                let e = this.props.template(item);
                this.#itemMap.set(item, e);
                this.insertBefore(e, child!);
            });
            this.#removeItem([item]);
        }
    }

    #mapItems(items: any[]) {
        return items.map((item) => {
            if (this.#itemMap.has(item)) return this.#itemMap.get(item)!;
            let e = this.props.template(item);
            this.#itemMap.set(item, e);
            return e;
        });
    }

    #removeItem(items: any[]) {
        items.forEach((item) => {
            if (this.#itemMap.has(item)) {
                this.removeChild(this.#itemMap.get(item)!);
                this.#itemMap.delete(item);
            }
        });
    }
}

customElements.define("chili-items", ItemsElement);
