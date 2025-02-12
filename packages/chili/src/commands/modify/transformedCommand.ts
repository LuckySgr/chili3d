// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    AsyncController,
    EdgeMeshData,
    GeometryNode,
    LineType,
    Matrix4,
    MeshNode,
    Property,
    PubSub,
    Transaction,
    VisualConfig,
    VisualNode,
    XYZ,
} from "chili-core";
import { MultistepCommand } from "../multistepCommand";

export abstract class TransformedCommand extends MultistepCommand {
    protected models?: VisualNode[];
    protected positions?: number[];

    @Property.define("common.clone")
    get isClone() {
        return this.getPrivateValue("isClone", false);
    }
    set isClone(value: boolean) {
        this.setProperty("isClone", value);
    }

    protected abstract transfrom(p2: XYZ): Matrix4;

    protected transformPreview = (point: XYZ) => {
        const transform = this.transfrom(point);
        const positions = transform.ofPoints(this.positions!);
        return {
            positions: new Float32Array(positions),
            lineType: LineType.Solid,
            color: VisualConfig.defaultEdgeColor,
            groups: [],
        };
    };

    private async ensureSelectedModels() {
        this.models = this.document.selection.getSelectedNodes().filter((x) => x instanceof VisualNode);
        if (this.models.length > 0) return true;

        this.controller = new AsyncController();
        this.models = await this.document.selection.pickNode("prompt.select.models", this.controller, true);

        if (this.models.length > 0) return true;
        if (this.controller.result?.status === "success") {
            PubSub.default.pub("showToast", "toast.select.noSelected");
        }
        return false;
    }

    protected override async canExcute(): Promise<boolean> {
        if (!(await this.ensureSelectedModels())) return false;

        this.positions = this.models!.flatMap((model) => {
            if (model instanceof MeshNode) {
                return model.mesh.position ? model.transform.ofPoints(model.mesh.position) : [];
            } else if (model instanceof GeometryNode) {
                return model.mesh.edges?.positions
                    ? model.transform.ofPoints(model.mesh.edges.positions)
                    : [];
            }
            return [];
        });
        return true;
    }

    protected getTempLineData(start: XYZ, end: XYZ) {
        return EdgeMeshData.from(start, end, VisualConfig.temporaryEdgeColor, LineType.Solid);
    }

    protected executeMainTask(): void {
        Transaction.execute(this.document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            const models = this.isClone ? this.models?.map((x) => x.clone()) : this.models;
            const transform = this.transfrom(this.stepDatas.at(-1)!.point!);

            models?.forEach((x) => {
                x.transform = x.transform.multiply(transform);
            });
            this.document.visual.update();
        });
    }
}
