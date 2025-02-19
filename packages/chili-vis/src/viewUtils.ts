// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { CameraType, IView, Plane, Ray, XYZ } from "chili-core";

export class ViewUtils {
    static rayFromEye(view: IView, point: XYZ) {
        const cameraPosition = view.cameraPosition;
        const vector = point.sub(cameraPosition);
        if (view.cameraType === CameraType.orthographic) {
            const direction = view.direction();
            const dot = vector.dot(direction);
            const location = point.sub(direction.multiply(dot));
            return new Ray(location, direction);
        } else {
            return new Ray(cameraPosition, vector);
        }
    }

    static directionAt(view: IView, point: XYZ) {
        const cameraPosition = view.cameraPosition;
        const vector = point.sub(cameraPosition);
        if (view.cameraType === CameraType.orthographic) {
            return view.direction();
        } else {
            return vector;
        }
    }

    static raycastClosestPlane(view: IView, start: XYZ, end: XYZ): Plane {
        const ray = ViewUtils.rayFromEye(view, end);
        const planes = [
            new Plane(start, XYZ.unitZ, XYZ.unitX),
            new Plane(start, XYZ.unitX, XYZ.unitY),
            new Plane(start, XYZ.unitY, XYZ.unitZ),
        ];

        const distances = planes.map((p) => p.intersect(ray)?.distanceTo(start));
        let result: [Plane, number | undefined] = [planes[0], distances[0]];
        for (let i = 1; i < distances.length; i++) {
            if (distances[i] === undefined) continue;

            if (result[1] === undefined || Math.abs(distances[i]!) < Math.abs(result[1])) {
                result = [planes[i], distances[i]];
            }
        }

        return result[0];
    }
}
