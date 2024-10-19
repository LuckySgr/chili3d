// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { IDocument } from "../document";
import { HistoryObservable, IDisposable, IPropertyChanged, Id, PubSub, Result } from "../foundation";
import { Matrix4 } from "../math";
import { Property } from "../property";
import { Serialized, Serializer } from "../serialize";
import { IShape, IShapeMeshData } from "../shape";
import { GeometryEntity } from "./geometryEntity";

export interface INode extends IPropertyChanged, IDisposable {
    readonly id: string;
    visible: boolean;
    parentVisible: boolean;
    name: string;
    parent: INodeLinkedList | undefined;
    previousSibling: INode | undefined;
    nextSibling: INode | undefined;
    clone(): this;
}

export interface INodeLinkedList extends INode {
    get firstChild(): INode | undefined;
    get lastChild(): INode | undefined;
    add(...items: INode[]): void;
    remove(...items: INode[]): void;
    size(): number;
    insertAfter(target: INode | undefined, node: INode): void;
    insertBefore(target: INode | undefined, node: INode): void;
    move(child: INode, newParent: this, newPreviousSibling?: INode): void;
}

export interface IModel extends INode {
    readonly document: IDocument;
    readonly geometry: GeometryEntity;
}

export interface IModelGroup extends IModel {
    children: ReadonlyArray<IModel>;
}

export namespace INode {
    export function isLinkedListNode(node: INode): node is INodeLinkedList {
        return (node as INodeLinkedList).add !== undefined;
    }

    export function isModelNode(node: INode): node is IModel {
        return (node as IModel).geometry !== undefined;
    }

    export function isModelGroup(node: INode): node is IModelGroup {
        let group = node as IModelGroup;
        return group.geometry !== undefined && group.children !== undefined;
    }
}

export abstract class Node extends HistoryObservable implements INode {
    private _visible: boolean = true;
    private _parentVisible: boolean = true;

    parent: INodeLinkedList | undefined;
    previousSibling: INode | undefined;
    nextSibling: INode | undefined;

    @Serializer.serialze()
    readonly id: string;

    constructor(
        document: IDocument,
        private _name: string,
        id: string,
    ) {
        super(document);
        this.id = id;
    }

    @Serializer.serialze()
    @Property.define("common.name")
    get name() {
        return this._name;
    }

    set name(value: string) {
        this.setProperty("name", value);
    }

    @Serializer.serialze()
    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this.setProperty("visible", value, () => this.onVisibleChanged());
    }

    protected abstract onVisibleChanged(): void;

    get parentVisible() {
        return this._parentVisible;
    }

    set parentVisible(value: boolean) {
        this.setProperty("parentVisible", value, () => this.onParentVisibleChanged());
    }

    clone(): this {
        let serialized = Serializer.serializeObject(this);
        serialized.properties["id"] = Id.generate();
        serialized.properties["name"] = `${this._name}_copy`;
        let cloned: this = Serializer.deserializeObject(this.document, serialized);
        this.parent?.add(cloned);
        return cloned;
    }

    protected abstract onParentVisibleChanged(): void;
}

export namespace INode {
    export function getNodesBetween(node1: INode, node2: INode): INode[] {
        if (node1 === node2) return [node1];
        let nodes: INode[] = [];
        let prePath = getPathToRoot(node1);
        let curPath = getPathToRoot(node2);
        let index = getCommonParentIndex(prePath, curPath);
        let parent = prePath.at(1 - index) as INodeLinkedList;
        if (parent === curPath[0] || parent === prePath[0]) {
            let child = parent === curPath[0] ? prePath[0] : curPath[0];
            getNodesFromParentToChild(nodes, parent, child);
        } else if (currentAtBack(prePath.at(-index)!, curPath.at(-index)!)) {
            getNodesFromPath(nodes, prePath, curPath, index);
        } else {
            getNodesFromPath(nodes, curPath, prePath, index);
        }
        return nodes;
    }

    function getNodesFromPath(nodes: INode[], path1: INode[], path2: INode[], commonIndex: number) {
        nodeOrChildrenAppendToNodes(nodes, path1[0]);
        path1ToCommonNodes(nodes, path1, commonIndex);
        commonToPath2Nodes(nodes, path1, path2, commonIndex);
    }

    function path1ToCommonNodes(nodes: INode[], path1: INode[], commonIndex: number) {
        for (let i = 0; i < path1.length - commonIndex; i++) {
            let next = path1[i].nextSibling;
            while (next !== undefined) {
                INode.nodeOrChildrenAppendToNodes(nodes, next);
                next = next.nextSibling;
            }
        }
    }

    function commonToPath2Nodes(nodes: INode[], path1: INode[], path2: INode[], commonIndex: number) {
        let nextParent = path1.at(-commonIndex)?.nextSibling;
        while (nextParent) {
            if (nextParent === path2[0]) {
                nodes.push(path2[0]);
                return;
            }
            if (INode.isLinkedListNode(nextParent)) {
                if (getNodesFromParentToChild(nodes, nextParent, path2[0])) {
                    return;
                }
            } else {
                nodes.push(nextParent);
            }
            nextParent = nextParent.nextSibling;
        }
    }

    export function nodeOrChildrenAppendToNodes(nodes: INode[], node: INode) {
        if (INode.isLinkedListNode(node)) {
            getNodesFromParentToChild(nodes, node);
        } else {
            nodes.push(node);
        }
    }

    export function findTopLevelNodes(nodes: Set<INode>) {
        let result: INode[] = [];
        for (const node of nodes) {
            if (!containsDescendant(nodes, node)) {
                result.push(node);
            }
        }
        return result;
    }

    export function containsDescendant(nodes: Set<INode>, node: INode): boolean {
        if (node.parent === undefined) return false;
        if (nodes.has(node.parent)) return true;
        return containsDescendant(nodes, node.parent);
    }

    function getNodesFromParentToChild(nodes: INode[], parent: INodeLinkedList, until?: INode): boolean {
        nodes.push(parent);
        let node = parent.firstChild;
        while (node !== undefined) {
            if (until === node) {
                nodes.push(node);
                return true;
            }

            if (INode.isLinkedListNode(node)) {
                if (getNodesFromParentToChild(nodes, node, until)) return true;
            } else {
                nodes.push(node);
            }
            node = node.nextSibling;
        }
        return false;
    }

    function currentAtBack(preNode: INode, curNode: INode) {
        while (preNode.nextSibling !== undefined) {
            if (preNode.nextSibling === curNode) return true;
            preNode = preNode.nextSibling;
        }
        return false;
    }

    function getCommonParentIndex(prePath: INode[], curPath: INode[]) {
        let index = 1;
        for (index; index <= Math.min(prePath.length, curPath.length); index++) {
            if (prePath.at(-index) !== curPath.at(-index)) break;
        }
        if (prePath.at(1 - index) !== curPath.at(1 - index)) throw new Error("can not find a common parent");
        return index;
    }

    function getPathToRoot(node: INode): INode[] {
        let path: INode[] = [];
        let parent: INode | undefined = node;
        while (parent !== undefined) {
            path.push(parent);
            parent = parent.parent;
        }
        return path;
    }
}

export interface IMeshGeometry extends IPropertyChanged {
    materialId: string;
    matrix: Matrix4;
    get mesh(): IShapeMeshData
}

export abstract class GeometryNode extends Node implements IMeshGeometry {
    private _materialId: string;
    @Serializer.serialze()
    @Property.define("common.material", { type: "materialId" })
    get materialId(): string {
        return this._materialId;
    }
    set materialId(value: string) {
        this.setProperty("materialId", value);
    }

    protected _matrix: Matrix4 = Matrix4.identity();
    @Serializer.serialze()
    get matrix(): Matrix4 {
        return this._matrix;
    }
    set matrix(value: Matrix4) {
        this.setProperty(
            "matrix",
            value,
            (_p, oldMatrix) => {
                this.onMatrixChanged(value, oldMatrix);
            },
            {
                equals: (left, right) => left.equals(right),
            },
        );
    }

    constructor(
        document: IDocument,
        name: string,
        materialId: string,
        id: string
    ) {
        super(document, name, id);
        this._materialId = materialId;
    }

    protected onMatrixChanged(newMatrix: Matrix4, oldMatrix: Matrix4): void {}

    protected onVisibleChanged(): void {
        this.document.visual.context.setVisible(this, this.visible && this.parentVisible);
    }

    protected onParentVisibleChanged(): void {
        this.document.visual.context.setVisible(this, this.visible && this.parentVisible);
    }

    protected _mesh: IShapeMeshData | undefined;
    get mesh(): IShapeMeshData {
        if (this._mesh === undefined) {
            this._mesh = this.createMesh();
        }
        return this._mesh;
    }

    protected abstract createMesh(): IShapeMeshData;

}

export abstract class ShapeNode extends GeometryNode {
    protected _shape: Result<IShape> = Result.err("shape not created");
    get shape(): Result<IShape> {
        if (!this._shape.isOk) {
            this._shape = this.createShape();
        }
        return this._shape;
    }

    protected abstract createShape(): Result<IShape>;

    protected override onMatrixChanged(newMatrix: Matrix4): void {
        if (this.shape.isOk) this.shape.ok().matrix = newMatrix;
    }

    protected override createMesh(): IShapeMeshData {
        if (!this.shape.isOk) {
            throw new Error(this.shape.error());
        }
        return this.shape.ok().mesh;
    }

    protected updateShape(shape: Result<IShape>, notify: boolean): boolean {
        if (shape.isOk && this._shape.isOk && this._shape.ok().isEqual(shape.ok())) {
            return false;
        }

        if (!shape.isOk) {
            PubSub.default.pub("displayError", shape.error());
            return false;
        }

        let oldShape = this._shape;
        this._shape = shape;
        this._mesh = undefined;
        this._shape.ok().matrix = this._matrix;
        if (notify) this.emitPropertyChanged("shape", oldShape);
        return true;
    }

}

export namespace NodeSerializer {
    export function serialize(node: INode) {
        let nodes: Serialized[] = [];
        serializeNodeToArray(nodes, node, undefined);
        return nodes;
    }

    function serializeNodeToArray(nodes: Serialized[], node: INode, parentId: string | undefined) {
        let serialized: any = Serializer.serializeObject(node);
        if (parentId) serialized["parentId"] = parentId;
        nodes.push(serialized);

        if (INode.isLinkedListNode(node) && node.firstChild) {
            serializeNodeToArray(nodes, node.firstChild, node.id);
        }
        if (node.nextSibling) {
            serializeNodeToArray(nodes, node.nextSibling, parentId);
        }
        return nodes;
    }

    export function deserialize(document: IDocument, nodes: Serialized[]) {
        let nodeMap: Map<string, INodeLinkedList> = new Map();
        nodes.forEach((n) => {
            let node = Serializer.deserializeObject(document, n);
            if (INode.isLinkedListNode(node)) {
                nodeMap.set(n.properties["id"], node);
            }
            let parentId = (n as any)["parentId"];
            if (!parentId) return;
            if (nodeMap.has(parentId)) {
                nodeMap.get(parentId)!.add(node);
            } else {
                console.warn("parent not found: " + parentId);
            }
        });
        return nodeMap.get(nodes[0].properties["id"]);
    }
}
