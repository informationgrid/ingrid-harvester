import {Controller, Get, PathParams, UseAuth} from "@tsed/common";
import { Returns, Summary } from "@tsed/schema";
import * as fs from "fs";
import * as path from "path";
import {AuthMiddleware} from "../middlewares/auth/AuthMiddleware.js";
import { marked } from "marked";
import {ProfileFactoryLoader} from "../profiles/profile.factory.loader.js";
import matter from "gray-matter";
const BASE_HELP_DIR = path.join(__dirname, "../contextHelp");

interface ContextHelpResult {
    id?: string,
    title?: string,
    profile?: string,
    htmlContent: string;
}

@Controller("/api/help")
@UseAuth(AuthMiddleware)
export class ContextHelpCtrl {

    @Get("/:locale/:contextHelpId")
    @Summary("Get context help")
    @Returns(200, String)
    async getHelp(
        @PathParams("locale") locale: string,
        @PathParams("contextHelpId") contextHelpId: string
    ): Promise<ContextHelpResult> {
        const profile = ProfileFactoryLoader.get().getProfileName();
        const pathsToTry = [
            path.join(BASE_HELP_DIR, locale, profile, `${contextHelpId}.md`),
            path.join(BASE_HELP_DIR, locale, "ingrid", `${contextHelpId}.md`) // fallback
        ];

        function renderMarkdownFile(content: string): string {
            try {
                return marked(content, { async: false });
            } catch (e) {
                console.error("Failed to parse markdown", e);
                return "<p>Error rendering help content</p>";
            }
        }

        for (const filePath of pathsToTry) {
            if(fs.existsSync(filePath)) {
                const markdownContent = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
                const { data, content } = matter(markdownContent);
                const htmlContent = renderMarkdownFile(content);
                return {
                    title: data.title,
                    id: data.id,
                    profile: data.profile,
                    htmlContent: htmlContent
                };
            }
        }

        throw new Error("Help file not found");
    }
}
