import {Controller, Get, PathParams, UseAuth} from "@tsed/common";
import { Returns, Summary } from "@tsed/schema";
import * as fs from "fs/promises";
import * as path from "path";
import {AuthMiddleware} from "../middlewares/auth/AuthMiddleware";
import { marked } from "marked";
const matter = require('gray-matter');

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

    @Get("/:locale/:profile/:field")
    @Summary("Get context help markdown for a form field")
    @Returns(200, String)
    async getHelp(
        @PathParams("profile") profile: string,
        @PathParams("locale") locale: string,
        @PathParams("field") field: string
    ): Promise<ContextHelpResult> {
        const pathsToTry = [
            path.join(BASE_HELP_DIR, locale, profile, `${field}.md`),
            path.join(BASE_HELP_DIR, locale, "ingrid", `${field}.md`) // fallback
        ];

        function renderMarkdownFile(content: string): string {
            try {
                return <string>marked(content);
            } catch (e) {
                console.error("Failed to parse markdown", e);
                return "<p>Error rendering help content</p>";
            }
        }

        for (const filePath of pathsToTry) {
            try {
                const markdownContent = await fs.readFile(filePath, "utf-8");
                const { data, content } = matter(markdownContent)
                const htmlContent = renderMarkdownFile(content)
                return {
                    title: data.title,
                    id: data.id,
                    profile: data.profile,
                    htmlContent: htmlContent
                };
            } catch {
                // continue to next fallback
            }
        }

        throw new Error("Help file not found");
    }
}
