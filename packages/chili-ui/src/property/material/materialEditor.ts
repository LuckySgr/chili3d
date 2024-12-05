// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { Binding, IConverter, Material, PathBinding, Property, PubSub, Result, Texture } from "chili-core";
import { button, collection, div, localize, span, svg } from "../../components";
import { ColorConverter } from "../../converters";
import { appendProperty } from "../utils";
import { MaterialDataContent } from "./materialDataContent";
import style from "./materialEditor.module.css";
import { UrlStringConverter } from "./urlConverter";
import { TextureEditor } from "./textureEditor";

class ActiveStyleConverter implements IConverter<Material> {
    constructor(readonly material: Material) {}

    convert(value: Material): Result<string> {
        return Result.ok(this.material === value ? `${style.material} ${style.active}` : style.material);
    }
}

export class MaterialEditor extends HTMLElement {
    private readonly editingControl: HTMLElement;
    private readonly colorConverter = new ColorConverter();

    constructor(readonly dataContent: MaterialDataContent) {
        super();
        this.editingControl = div();
        this.initEditingControl(dataContent.editingMaterial);
        this.append(
            div(
                {
                    className: style.root,
                },
                div(
                    { className: style.title },
                    span({
                        textContent: localize("common.material"),
                    }),
                    svg({
                        icon: "icon-plus",
                        onclick: () => {
                            this.dataContent.addMaterial();
                        },
                    }),
                    svg({
                        icon: "icon-clone",
                        onclick: () => {
                            this.dataContent.copyMaterial();
                        },
                    }),
                    svg({
                        icon: "icon-trash",
                        onclick: () => {
                            this.dataContent.deleteMaterial();
                        },
                    }),
                ),
                collection({
                    className: style.materials,
                    sources: this.dataContent.document.materials,
                    template: (material: Material) =>
                        span({
                            className: new Binding(
                                this.dataContent,
                                "editingMaterial",
                                new ActiveStyleConverter(material),
                            ),
                            title: material.name,
                            style: {
                                backgroundColor: new Binding(material, "color", this.colorConverter),
                                backgroundImage: new PathBinding(
                                    material,
                                    "map.image",
                                    new UrlStringConverter(),
                                ),
                                backgroundBlendMode: "multiply",
                                backgroundSize: "contain",
                            },
                            onclick: () => {
                                this.dataContent.editingMaterial = material;
                            },
                            ondblclick: () => {
                                this.dataContent.callback(material);
                                this.remove();
                            },
                        }),
                }),
                this.editingControl,
                div(
                    {
                        className: style.bottom,
                    },
                    button({
                        textContent: localize("common.confirm"),
                        onclick: () => {
                            this.dataContent.callback(this.dataContent.editingMaterial);
                            this.remove();
                        },
                    }),
                    button({
                        textContent: localize("common.cancel"),
                        onclick: () => {
                            this.remove();
                        },
                    }),
                ),
            ),
        );
    }

    connectedCallback() {
        this.dataContent.onPropertyChanged(this._onEditingMaterialChanged);
        PubSub.default.sub("showProperties", this._handleShowProperty);
    }

    disconnectedCallback() {
        PubSub.default.remove("showProperties", this._handleShowProperty);
    }

    private readonly _handleShowProperty = () => {
        this.remove();
    };

    private readonly _onEditingMaterialChanged = (property: keyof MaterialDataContent) => {
        if (property !== "editingMaterial") return;
        this.editingControl.firstChild?.remove();
        this.initEditingControl(this.dataContent.editingMaterial);
    };

    private initEditingControl(material: Material) {
        let container = div({
            className: style.properties,
        });
        this.editingControl.appendChild(
            div(
                {
                    className: style.editing,
                },
                container,
            ),
        );

        Property.getProperties(material).forEach((x) => {
            let value = (material as any)[x.name];
            if (value instanceof Texture) {
                container.append(new TextureEditor(this.dataContent.document, x.display, value));
                return;
            }

            appendProperty(container, this.dataContent.document, [material], x);
        });
    }
}

customElements.define("material-editor", MaterialEditor);
