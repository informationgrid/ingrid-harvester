import {Controller, Get, PathParams, UseAuth} from "@tsed/common";
import { Returns, Summary } from "@tsed/schema";
import * as fs from "fs/promises";
import * as path from "path";
import {AuthMiddleware} from "../middlewares/auth/AuthMiddleware";

const BASE_HELP_DIR = path.join(__dirname, "../contextHelp");

@Controller("/api/help")
@UseAuth(AuthMiddleware)
export class ContextHelpCtrl {

    @Get("/:locale/:profile/:field")
    @Summary("Get context help markdown for a form field")
    @Returns(200, String)
    async getHelp(
        @PathParams("profile") profile: string,
        @PathParams("locale") locale: string,
        @PathParams("field") field: string
    ): Promise<string> {
        const pathsToTry = [
            path.join(BASE_HELP_DIR, locale, profile, `${field}.md`),
            path.join(BASE_HELP_DIR, locale, "ingrid", `${field}.md`) // fallback
        ];

        for (const filePath of pathsToTry) {
            try {
                const content = await fs.readFile(filePath, "utf-8");
                console.log("ContextHelpCtrl content", content);
                return content;
            } catch {
                // continue to next fallback
            }
        }

        throw new Error("Help file not found");
    }
}
