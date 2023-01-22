// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { Quaternion, XYZ } from "chili-shared";
import { Model, ModelGroup, property } from "chili-core";
import { PubSub } from "../pubsub";
import { DocumentObject } from "../documentObject";

export abstract class ModelObject extends DocumentObject {
    private _name: string;
    private _location: XYZ;
    private _rotate: Quaternion;
    private _visible: boolean;
    private _parent: ModelGroup | undefined;
    readonly createdTime: number;

    constructor(readonly id: string, name: string) {
        super();
        this._name = name;
        this._visible = true;
        this._location = XYZ.zero;
        this._rotate = { x: 0, y: 0, z: 0, w: 1 };
        this.createdTime = Date.now();
    }

    @property("name")
    get name() {
        return this._name;
    }

    set name(value: string) {
        this.setProperty("name", value);
    }

    @property("model.location")
    get location() {
        return this._location;
    }

    set location(value: XYZ) {
        if (this.setProperty("location", value)) this.handlePositionChanged();
    }

    @property("model.rotate")
    get rotate() {
        return this._rotate;
    }

    set rotate(value: Quaternion) {
        if (this.setProperty("rotate", value)) this.handleRotateChanged();
    }

    get visible() {
        return this._visible;
    }

    set visible(value: boolean) {
        if (this.setProperty("visible", value)) {
            PubSub.default.pub("visibleChanged", this);
        }
    }

    get parent() {
        return this._parent;
    }

    set parent(value: ModelGroup | undefined) {
        if (this._parent === value) return;
        this._parent?.removeChild(this);
        value?.addChild(this);
        let oldParent = this._parent;
        this.setProperty("parent", value);
        PubSub.default.pub("parentChanged", this, oldParent, value);
    }

    protected abstract handlePositionChanged(): void;
    protected abstract handleRotateChanged(): void;
}

export namespace ModelObject {
    export function isGroup(model: ModelObject): model is ModelGroup {
        return (model as ModelGroup).children !== undefined;
    }
    export function isModel(model: ModelObject): model is Model {
        return (model as Model).body !== undefined;
    }
}