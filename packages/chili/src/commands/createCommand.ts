// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { Config, GeometryNode, IView, Property, Transaction, XYZ } from "chili-core";
import { ViewUtils } from "chili-vis";
import { MultistepCommand } from "./multistepCommand";

let count = 1;

export abstract class CreateCommand extends MultistepCommand {
    protected override executeMainTask() {
        Transaction.execute(this.document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            let node = this.geometryNode();
            this.document.addNode(node);
            this.document.visual.update();
        });
    }

    protected readonly findPlane = (view: IView, origin: XYZ, point: XYZ | undefined) => {
        if (point === undefined || !Config.instance.dynamicWorkplane) {
            return view.workplane.translateTo(origin);
        } else {
            return ViewUtils.raycastClosestPlane(view, origin, point);
        }
    };

    protected abstract geometryNode(): GeometryNode;
}

export abstract class CreateNodeCommand extends MultistepCommand {
    protected override executeMainTask() {
        Transaction.execute(this.document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            this.document.addNode(this.getNode());
            this.document.visual.update();
        });
    }

    protected abstract getNode(): GeometryNode;
}

export abstract class CreateFaceableCommand extends CreateCommand {
    protected _isFace: boolean = false;
    @Property.define("command.faceable.isFace")
    public get isFace() {
        return this._isFace;
    }
    public set isFace(value: boolean) {
        this.setProperty("isFace", value);
    }
}
