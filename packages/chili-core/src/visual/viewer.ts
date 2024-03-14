// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { IDisposable } from "../foundation";
import { Plane } from "../math";
import { IView } from "./view";
import { IVisual } from "./visual";

export interface IViewer extends IDisposable {
    readonly visual: IVisual;
    activeView: IView | undefined;
    createView(name: string, workplane: Plane): IView;
    removeView(view: IView): void;
    views(): readonly IView[];
    update(): void;
}
