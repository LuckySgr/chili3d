// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { GeometryNode, Precision, XYZ, command } from "chili-core";
import { EllipseNode } from "../../bodys/ellipse";
import { LengthAtAxisSnapData, SnapLengthAtPlaneData } from "../../snap";
import { IStep, LengthAtAxisStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateFaceableCommand } from "../createCommand";

@command({
    name: "create.ellipse",
    display: "command.ellipse",
    icon: "icon-ellipse",
})
export class Ellipse extends CreateFaceableCommand {
    getSteps(): IStep[] {
        let centerStep = new PointStep("operate.pickCircleCenter");
        let radiusStepX = new LengthAtPlaneStep("operate.pickRadius", this.getRadius1Data);
        let radiusStepY = new LengthAtAxisStep("operate.pickRadius", this.getRadius2Data);
        return [centerStep, radiusStepX, radiusStepY];
    }

    private readonly getRadius1Data = (): SnapLengthAtPlaneData => {
        const point = this.stepDatas[0].point!;
        return {
            point: () => point,
            preview: this.previewCircle,
            plane: (tmp: XYZ | undefined) => this.findPlane(this.stepDatas[0].view, point, tmp),
            validator: this.validatePoint,
        };
    };

    private readonly validatePoint = (point: XYZ) => {
        const center = this.stepDatas[0].point!;
        if (point.distanceTo(center) < Precision.Distance) return false;
        const plane = this.findPlane(this.stepDatas[0].view, center, point);
        return point.sub(center).isParallelTo(plane.normal) === false;
    };

    protected previewCircle = (end: XYZ | undefined) => {
        const p1 = this.previewPoint(this.stepDatas[0].point!);
        if (end === undefined) return [p1];

        const p2 = this.previewPoint(end);
        const plane = this.findPlane(this.stepDatas[0].view, this.stepDatas[0].point!, end);
        const circle = this.application.shapeFactory.circle(
            plane.normal,
            this.stepDatas[0].point!,
            end.distanceTo(this.stepDatas[0].point!),
        );
        return [p1, p2, circle.value.mesh.edges!];
    };

    private readonly getRadius2Data = (): LengthAtAxisSnapData => {
        const point = this.stepDatas[0].point!;
        const plane = this.stepDatas[1].plane!;
        const direction = plane.normal.cross(this.stepDatas[1].point!.sub(point)).normalize()!;
        return {
            point: point,
            preview: this.ellipsePreview,
            direction,
            validator: this.validatePoint,
        };
    };

    protected override geometryNode(): GeometryNode {
        const [p0, p1, p2] = [this.stepDatas[0].point!, this.stepDatas[1].point!, this.stepDatas[2].point!];
        const plane = this.stepDatas[1].plane!;
        const d1 = plane.projectDistance(p0, p1);
        const d2 = plane.projectDistance(p0, p2);
        const body = new EllipseNode(this.document, plane.normal, p0, p1.sub(p0), d1, d2 > d1 ? d1 : d2);
        return body;
    }

    private readonly ellipsePreview = (point: XYZ | undefined) => {
        if (!point) return this.previewCircle(this.stepDatas[1].point);

        const center = this.previewPoint(this.stepDatas[0].point!);
        return [center, this.previewPoint(this.stepDatas[1].point!), this.createEllipse(point).mesh.edges!];
    };

    private createEllipse(p2: XYZ) {
        const p0 = this.stepDatas[0].point!;
        const p1 = this.stepDatas[1].point!;
        const plane = this.stepDatas[1].plane!;

        const d1 = plane.projectDistance(p0, p1);
        const d2 = plane.projectDistance(p0, p2);
        return this.application.shapeFactory.ellipse(plane.normal, p0, p1.sub(p0), d1, d2 > d1 ? d1 : d2)
            .value;
    }
}
