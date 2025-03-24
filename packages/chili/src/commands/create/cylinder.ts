// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { GeometryNode, Plane, Precision, XYZ, command } from "chili-core";
import { CylinderNode } from "../../bodys";
import { LengthAtAxisSnapData, SnapLengthAtPlaneData } from "../../snap";
import { IStep, LengthAtAxisStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.cylinder",
    display: "command.cylinder",
    icon: "icon-cylinder",
})
export class Cylinder extends CreateCommand {
    protected override getSteps(): IStep[] {
        let centerStep = new PointStep("operate.pickCircleCenter");
        let radiusStep = new LengthAtPlaneStep("operate.pickRadius", this.getRadiusData);
        let third = new LengthAtAxisStep("operate.pickNextPoint", this.getHeightStepData);
        return [centerStep, radiusStep, third];
    }

    private readonly getRadiusData = (): SnapLengthAtPlaneData => {
        const { point, view } = this.stepDatas[0];
        return {
            point: () => point!,
            preview: this.circlePreview,
            plane: (tmp: XYZ | undefined) => this.findPlane(view, point!, tmp),
            validator: (p: XYZ) => {
                if (p.distanceTo(point!) < Precision.Distance) return false;
                const plane = this.findPlane(view, point!, p);
                return p.sub(point!).isParallelTo(plane.normal) === false;
            },
        };
    };

    private readonly circlePreview = (point: XYZ | undefined) => {
        if (!point) return [this.previewPoint(this.stepDatas[0].point!)];

        const start = this.stepDatas[0].point!;
        const plane = this.findPlane(this.stepDatas[0].view, start, point);
        return [
            this.previewPoint(this.stepDatas[0].point!),
            this.previewLine(start, point),
            this.application.shapeFactory.circle(plane.normal, start, plane.projectDistance(start, point))
                .value.mesh.edges!,
        ];
    };

    private readonly getHeightStepData = (): LengthAtAxisSnapData => {
        return {
            point: this.stepDatas[0].point!,
            direction: this.stepDatas[1].plane!.normal,
            preview: this.previewCylinder,
            validator: (p: XYZ) => {
                return Math.abs(this.getHeight(this.stepDatas[1].plane!, p)) > 0.001;
            },
        };
    };

    private readonly previewCylinder = (end: XYZ | undefined) => {
        if (!end) {
            return this.circlePreview(this.stepDatas[1].point);
        }

        const plane = this.stepDatas[1].plane!;
        const radius = plane.projectDistance(this.stepDatas[0].point!, this.stepDatas[1].point!);
        const height = this.getHeight(plane, end);

        return [
            this.previewPoint(this.stepDatas[0].point!),
            this.application.shapeFactory.cylinder(
                height < 0 ? plane.normal.reverse() : plane.normal,
                this.stepDatas[0].point!,
                radius,
                Math.abs(height),
            ).value.mesh.edges!,
        ];
    };

    protected override geometryNode(): GeometryNode {
        const plane = this.stepDatas[1].plane!;
        const radius = plane.projectDistance(this.stepDatas[0].point!, this.stepDatas[1].point!);
        const dz = this.getHeight(plane, this.stepDatas[2].point!);
        return new CylinderNode(
            this.document,
            dz < 0 ? plane.normal.reverse() : plane.normal,
            this.stepDatas[0].point!,
            radius,
            Math.abs(dz),
        );
    }

    private getHeight(plane: Plane, point: XYZ): number {
        return point.sub(this.stepDatas[0].point!).dot(plane.normal);
    }
}
