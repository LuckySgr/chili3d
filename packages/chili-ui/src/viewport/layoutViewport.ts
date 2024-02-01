// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { AsyncController, IDocument, IView, Plane, PubSub, XYZ } from "chili-core";
import { OKCancel } from "../components/okCancel";
import { BindableElement } from "../controls";
import style from "./layoutViewport.module.css";
import { Viewport } from "./viewport";

export class LayoutViewport extends BindableElement {
    private readonly _selectionController: OKCancel;
    private readonly _viewports: Viewport[] = [];

    constructor() {
        super();
        this.className = style.root;
        this._selectionController = new OKCancel();
        this.append(this._selectionController);
        this.clearSelectionControl();
    }

    override connectedCallback(): void {
        super.connectedCallback();
        PubSub.default.sub("activeViewChanged", this._handleActiveViewChanged);
        PubSub.default.sub("activeDocumentChanged", this._handleActiveDocumentChanged);
        PubSub.default.sub("documentClosed", this._handleDocumentClosed);
        PubSub.default.sub("showSelectionControl", this.showSelectionControl);
        PubSub.default.sub("clearSelectionControl", this.clearSelectionControl);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        PubSub.default.remove("activeViewChanged", this._handleActiveViewChanged);
        PubSub.default.remove("activeDocumentChanged", this._handleActiveDocumentChanged);
        PubSub.default.remove("documentClosed", this._handleDocumentClosed);
        PubSub.default.remove("showSelectionControl", this.showSelectionControl);
        PubSub.default.remove("clearSelectionControl", this.clearSelectionControl);
    }

    private _handleDocumentClosed = (document: IDocument) => {
        this.clearViewports();
    };

    private clearViewports() {
        this._viewports.forEach((v) => {
            v.view.close();
        });
        this._viewports.length = 0;
    }

    private createView(document: IDocument) {
        let view = document.visual.viewer.createView("3D", Plane.XY);
        view.cameraController.lookAt(new XYZ(1000, 1000, 1000), XYZ.zero, XYZ.unitZ);
        let viewport = new Viewport(view);
        viewport.classList.add(style.viewport);
        this.appendChild(viewport);
        this._viewports.push(viewport);
        view.setDom(viewport);
        document.visual.viewer.update();
    }

    private _handleActiveViewChanged = (view: IView | undefined) => {
        this._viewports.forEach((v) => {
            v.setActive(v.view === view);
        });
    };

    private _handleActiveDocumentChanged = (document: IDocument | undefined) => {
        this.clearViewports();
        if (document !== undefined) {
            this.createView(document);
            document.visual.viewer.activeView = this._viewports.at(-1)?.view;
        }
    };

    private showSelectionControl = (controller: AsyncController) => {
        this._selectionController.setControl(controller);
        this._selectionController.style.visibility = "visible";
    };

    private clearSelectionControl = () => {
        this._selectionController.setControl(undefined);
        this._selectionController.style.visibility = "hidden";
    };
}

customElements.define("chili-viewport", LayoutViewport);