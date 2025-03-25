// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { GeometryNode, MathUtils, Plane, Property, XYZ, command } from "chili-core";
import { ViewUtils } from "chili-vis";
import { RectNode } from "../../bodys";
import { SnapLengthAtPlaneData, SnapResult } from "../../snap";
import { IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

export interface RectData {
    plane: Plane;
    dx: number;
    dy: number;
    p1: XYZ;
    p2: XYZ;
}

export namespace RectData {
    export function get(atPlane: Plane, start: XYZ, end: XYZ): RectData {
        let plane = new Plane(start, atPlane.normal, atPlane.xvec);
        let vector = end.sub(start);
        let dx = vector.dot(plane.xvec);
        let dy = vector.dot(plane.yvec);
        return { plane, dx, dy, p1: start, p2: end };
    }
}

export abstract class RectCommandBase extends CreateCommand {
    protected getSteps(): IStep[] {
        return [
            new PointStep("operate.pickFistPoint"),
            new LengthAtPlaneStep("operate.pickNextPoint", this.nextSnapData),
        ];
    }

    private readonly nextSnapData = (): SnapLengthAtPlaneData => {
        const { point, view } = this.stepDatas[0];
        return {
            point: () => point!,
            preview: this.previewRect,
            plane: (tmp: XYZ | undefined) => this.findPlane(view, point!, tmp),
            validator: this.handleValid,
            prompt: (snaped: SnapResult) => {
                let data = this.rectDataFromTemp(snaped.point!);
                return `${data.dx.toFixed(2)}, ${data.dy.toFixed(2)}`;
            },
        };
    };

    private readonly handleValid = (end: XYZ) => {
        const data = this.rectDataFromTemp(end);
        return data !== undefined && !MathUtils.anyEqualZero(data.dx, data.dy);
    };

    protected previewRect = (end: XYZ | undefined) => {
        if (end === undefined) return [this.meshPoint(this.stepDatas[0].point!)];
        const { plane, dx, dy } = this.rectDataFromTemp(end);
        return [
            this.meshPoint(this.stepDatas[0].point!),
            this.meshPoint(end),
            this.meshCreatedShape("rect", plane, dx, dy),
        ];
    };

    protected rectDataFromTemp(point: XYZ): RectData {
        const [p1, p2] = [this.stepDatas[0].point!, point];
        const plane = ViewUtils.raycastClosestPlane(this.stepDatas[0].view, p1, p2);
        return RectData.get(plane, p1, p2);
    }

    protected rectDataFromTwoSteps() {
        let rect: RectData;
        if (this.stepDatas[1].plane) {
            rect = RectData.get(this.stepDatas[1].plane, this.stepDatas[0].point!, this.stepDatas[1].point!);
        } else {
            rect = this.rectDataFromTemp(this.stepDatas[1].point!);
        }
        return rect;
    }
}

@command({
    name: "create.rect",
    display: "command.rect",
    icon: "icon-rect",
})
export class Rect extends RectCommandBase {
    @Property.define("command.faceable.isFace")
    public get isFace() {
        return this.getPrivateValue("isFace", false);
    }
    public set isFace(value: boolean) {
        this.setProperty("isFace", value);
    }

    protected override geometryNode(): GeometryNode {
        const { plane, dx, dy } = this.rectDataFromTwoSteps();
        const node = new RectNode(this.document, plane, dx, dy);
        node.isFace = this.isFace;
        return node;
    }
}
