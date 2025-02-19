// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { GeometryNode, Plane, PlaneAngle, Precision, ShapeMeshData, XYZ, command } from "chili-core";
import { ArcNode } from "../../bodys/arc";
import { Dimension, SnapLengthAtPlaneData } from "../../snap";
import { AngleStep, IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.arc",
    display: "command.arc",
    icon: "icon-arc",
})
export class Arc extends CreateCommand {
    private _planeAngle: PlaneAngle | undefined;

    getSteps(): IStep[] {
        return [
            new PointStep("operate.pickCircleCenter"),
            new LengthAtPlaneStep("operate.pickRadius", this.getRadiusData),
            new AngleStep(
                "operate.pickNextPoint",
                () => this.stepDatas[0].point!,
                () => this.stepDatas[1].point!,
                this.getAngleData,
            ),
        ];
    }

    private readonly getRadiusData = (): SnapLengthAtPlaneData => {
        const { point, view } = this.stepDatas[0];
        return {
            point: () => point!,
            preview: this.circlePreview,
            plane: (p: XYZ | undefined) => this.findPlane(view, point!, p),
            validator: (p: XYZ) => {
                if (p.distanceTo(point!) < Precision.Distance) return false;
                return p.sub(point!).isParallelTo(this.stepDatas[0].view.workplane.normal) === false;
            },
        };
    };

    private readonly getAngleData = () => {
        const [center, p1] = [this.stepDatas[0].point!, this.stepDatas[1].point!];
        const plane = this.stepDatas[1].plane ?? this.findPlane(this.stepDatas[1].view, center, p1);
        const points: ShapeMeshData[] = [this.previewPoint(center), this.previewPoint(p1)];
        this._planeAngle = new PlaneAngle(new Plane(center, plane.normal, p1.sub(center)));
        return {
            dimension: Dimension.D1D2,
            preview: (point: XYZ | undefined) => this.anglePreview(point, center, p1, points),
            plane: () => plane,
            validators: [this.angleValidator(center, plane)],
        };
    };

    private anglePreview(
        point: XYZ | undefined,
        center: XYZ,
        p1: XYZ,
        points: ShapeMeshData[],
    ): ShapeMeshData[] {
        point = point ?? p1;
        this._planeAngle!.movePoint(point);
        const result = [...points];
        if (Math.abs(this._planeAngle!.angle) > Precision.Angle) {
            result.push(
                this.application.shapeFactory.arc(
                    this._planeAngle!.plane.normal,
                    center,
                    p1,
                    this._planeAngle!.angle,
                ).value.mesh.edges!,
            );
        }
        return result;
    }

    private angleValidator(center: XYZ, plane: Plane) {
        return (p: XYZ) =>
            p.distanceTo(center) >= Precision.Distance && !p.sub(center).isParallelTo(plane.normal);
    }

    protected override geometryNode(): GeometryNode {
        const [p0, p1] = [this.stepDatas[0].point!, this.stepDatas[1].point!];
        const plane = this.stepDatas[1].plane ?? this.findPlane(this.stepDatas[1].view, p0, p1);
        this._planeAngle?.movePoint(this.stepDatas[2].point!);
        return new ArcNode(this.document, plane.normal, p0, p1, this._planeAngle!.angle);
    }

    private readonly circlePreview = (end: XYZ | undefined) => {
        const visualCenter = this.previewPoint(this.stepDatas[0].point!);
        if (!end) return [visualCenter];
        const { point, view } = this.stepDatas[0];
        const plane = this.findPlane(view, point!, end);
        return [
            visualCenter,
            this.previewLine(this.stepDatas[0].point!, end),
            this.application.shapeFactory.circle(
                plane.normal,
                point!,
                this.getDistanceAtPlane(plane, point!, end),
            ).value.mesh.edges!,
        ];
    };

    private getDistanceAtPlane(plane: Plane, p1: XYZ, p2: XYZ) {
        let dp1 = plane.project(p1);
        let dp2 = plane.project(p2);
        return dp1.distanceTo(dp2);
    }
}
