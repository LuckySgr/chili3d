// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { IConverter, IDisposable, IPropertyChanged } from "chili-core";

export type Key = string | number | symbol;

export class Binding implements IDisposable {
    static #bindings = new WeakMap<IPropertyChanged, Set<Binding>>();
    #cache = new Map<Element, Set<Key>>();

    constructor(
        readonly dataContext: IPropertyChanged,
        readonly path: Key,
        readonly converter?: IConverter
    ) {
        this.cacheBinding(dataContext);
        this.dataContext.onPropertyChanged(this.onPropertyChanged);
    }

    private cacheBinding(dataContext: any) {
        if (Binding.#bindings.has(dataContext)) {
            Binding.#bindings.get(dataContext)!.add(this);
        } else {
            Binding.#bindings.set(dataContext, new Set([this]));
        }
    }

    static removeBindings(dataContext: any) {
        if (Binding.#bindings.has(dataContext)) {
            Binding.#bindings.get(dataContext)!.forEach((binding) => binding.dispose());
            Binding.#bindings.delete(dataContext);
        }
    }

    add<T extends Element, K extends keyof T>(target: T, key: K) {
        if (!this.#cache.has(target)) {
            this.#cache.set(target, new Set());
        }
        this.#cache.get(target)!.add(key);
        this.setValue(target, key);
    }

    remove<T extends Element, K extends keyof T>(target: T, key: K) {
        this.#cache.get(target)?.delete(key);
    }

    private onPropertyChanged = (prop: string) => {
        if (prop === this.path) {
            this.#cache.forEach((key, target) => {
                this.setValue(target, key as any);
            });
        }
    };

    private setValue<T extends Element, K extends keyof T>(target: T, key: K) {
        let value = (this.dataContext as any)[this.path];
        if (this.converter) {
            value = this.converter.convert(value);
        }
        if (value !== target[key]) target[key] = value;
    }

    dispose() {
        this.dataContext.removePropertyChanged(this.onPropertyChanged);
        this.#cache.clear();
    }
}

export function bind<T extends IPropertyChanged>(dataContext: T, path: keyof T, converter?: IConverter) {
    return new Binding(dataContext, path, converter);
}