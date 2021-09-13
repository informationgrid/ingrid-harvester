/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Service} from "@tsed/common";
import {MemoryStorage} from "../storage/MemoryStorage";
import {IUser} from "../../model/User";
import * as fs from "fs";

@Service()
export class UsersService {

    private USERS_CONFIG_FILE = 'users.json';

    constructor(private memoryStorage: MemoryStorage) {
        const users = fs.readFileSync(this.getUserConfig());
        this.memoryStorage.set("users", JSON.parse(users.toString()));
    }

    /**
     * Find a user by his ID.
     * @param id
     * @returns {undefined|IUser}
     */
    async find(id: string) {
        const users: IUser[] = await this.query();
        return users.find((value: IUser) => value._id === id);
    }

    async findByEmail(username: string) {
        const users: IUser[] = await this.query();
        return users.find((value: IUser) => value.username === username);
    }

    async findByCredential(username: string, password: string) {
        const users: IUser[] = await this.query();
        return users.find((value: IUser) => value.username === username && value.password === password);
    }

    /**
     * Create a new User
     * @param name
     * @returns {{id: any, name: string}}
     */
    async create(user: IUser) {
        user._id = require("node-uuid").v4();
        const users = this.memoryStorage.get<IUser[]>("users");

        users.push(user);

        this.memoryStorage.set("users", users);

        return user;
    }

    /**
     *
     * @returns {IUser[]}
     */
    async query(): Promise<IUser[]> {
        return this.memoryStorage.get<IUser[]>("users");
    }

    /**
     *
     * @param user
     * @returns {IUser}
     */
    async update(user: IUser): Promise<IUser> {

        const users = await this.query();

        const index = users.findIndex((value: IUser) => value._id === user._id);

        users[index] = user;

        this.memoryStorage.set("users", users);

        return user;
    }

    private getUserConfig(): string {
        const configDir = process.env.MCLOUD_IMPORTER_CONFIG_DIR;
        return configDir
            ? configDir + '/' + this.USERS_CONFIG_FILE
            : this.USERS_CONFIG_FILE;
    }
}
