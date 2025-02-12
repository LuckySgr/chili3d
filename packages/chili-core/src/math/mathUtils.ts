// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { Precision } from "../foundation";

export class MathUtils {
    static degToRad(degrees: number) {
        return degrees * (Math.PI / 180);
    }

    static radToDeg(radians: number) {
        return radians * (180 / Math.PI);
    }

    static anyEqualZero(...values: number[]) {
        return values.some((value) => Math.abs(value) < Precision.Float);
    }

    static allEqualZero(...values: number[]) {
        return values.every((value) => Math.abs(value) < Precision.Float);
    }

    static almostEqual(a: number, b: number, tolerance = 1e-8) {
        return Math.abs(a - b) < tolerance;
    }

    static clamp(value: number, min: number, max: number) {
        if (min > max) throw new Error("min must be less than max");

        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    static minMax(values: ArrayLike<number>) {
        if (values.length === 0) return undefined;

        let min = values[0];
        let max = values[0];

        for (let i = 1; i < values.length; i++) {
            const value = values[i];
            if (value < min) min = value;
            if (value > max) max = value;
        }

        return { min, max };
    }
}
