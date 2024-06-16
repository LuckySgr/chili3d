// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

const COMMAND_KEYS = [
    "boolean.common",
    "boolean.cut",
    "boolean.fuse",
    "convert.fuse",
    "convert.prism",
    "convert.revol",
    "convert.sweep",
    "convert.toFace",
    "convert.toWire",
    "create.arc",
    "create.bezier",
    "create.box",
    "create.circle",
    "create.folder",
    "create.group",
    "create.line",
    "create.offset",
    "create.polygon",
    "create.rect",
    "create.section",
    "create.thickSolid",
    "doc.new",
    "doc.open",
    "doc.save",
    "doc.saveToFile",
    "edit.redo",
    "edit.undo",
    "file.export.iges",
    "file.export.stp",
    "file.import",
    "modify.array",
    "modify.delete",
    "modify.mirror",
    "modify.move",
    "modify.rotate",
    "modify.split",
    "special.last",
    "workingPlane.alignToPlane",
    "workingPlane.set",
] as const;

export type CommandKeys = (typeof COMMAND_KEYS)[number];
