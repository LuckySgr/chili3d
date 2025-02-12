// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

export type PointLike = { x: number; y: number; z: number };

export class BoundingBox {
    constructor(
        public min: PointLike,
        public max: PointLike,
    ) {}

    static isValid(box: BoundingBox) {
        return box.min.x <= box.max.x && box.min.y <= box.max.y && box.min.z <= box.max.z;
    }

    static expandByPoint(box: BoundingBox, point: PointLike) {
        const { min, max } = box;
        min.x = Math.min(min.x, point.x);
        min.y = Math.min(min.y, point.y);
        min.z = Math.min(min.z, point.z);
        max.x = Math.max(max.x, point.x);
        max.y = Math.max(max.y, point.y);
        max.z = Math.max(max.z, point.z);
    }

    static fromNumbers(points: ArrayLike<number>): BoundingBox {
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };

        for (let i = 0; i < points.length; i += 3) {
            const x = points[i];
            const y = points[i + 1];
            const z = points[i + 2];

            min.x = Math.min(min.x, x);
            min.y = Math.min(min.y, y);
            min.z = Math.min(min.z, z);
            max.x = Math.max(max.x, x);
            max.y = Math.max(max.y, y);
            max.z = Math.max(max.z, z);
        }
        return new BoundingBox(min, max);
    }

    static fromPoints(points: PointLike[]): BoundingBox {
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };

        for (const point of points) {
            min.x = Math.min(min.x, point.x);
            min.y = Math.min(min.y, point.y);
            min.z = Math.min(min.z, point.z);
            max.x = Math.max(max.x, point.x);
            max.y = Math.max(max.y, point.y);
            max.z = Math.max(max.z, point.z);
        }
        return new BoundingBox(min, max);
    }
}
