// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { Application } from "chili/src/application";

export interface ICommand {
    execute(application: Application): Promise<void>;
}
