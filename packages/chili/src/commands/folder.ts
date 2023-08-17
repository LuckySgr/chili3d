// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { command, IApplication, ICommand, NodeLinkedList } from "chili-core";

let index: number = 1;

@command({
    name: "NewFolder",
    display: "command.newFolder",
    icon: "icon-folder-plus",
})
export class NewFolder implements ICommand {
    async execute(app: IApplication): Promise<void> {
        let document = app.activeDocument!;
        let folder = new NodeLinkedList(document, `Folder${index++}`);
        document.addNode(folder);
    }
}
