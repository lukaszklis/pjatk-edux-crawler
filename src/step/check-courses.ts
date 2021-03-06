import * as puppeteer from "puppeteer";
import chalk from "chalk";
import {
    getCourseLink,
    getCourseName,
    getUpdatedSections,
    hasUpdatedEduxColumns
} from "../helper/columns-helper";
import { Course } from "../model/course";
import { eduxUrl } from "../config/edux";
import { renderSuccess, renderWarning } from "../helper/messages-helper";

export async function checkCourses(page: puppeteer.Page): Promise<void> {
    const sections = new Map<number, string>();
    const updatedCourses = new Set<Course>();

    const { courseSections, courseElements } = await page.evaluate(() => ({
        courseSections: Array.from(
            document.querySelectorAll(
                "#ctl00_ContentPlaceHolder1_grdNoweElementy_ctl00 th.rgHeader"
            )
        ).map((course: HTMLElement) => course.textContent),
        courseElements: Array.from(
            document.querySelectorAll(
                '[id^="ctl00_ContentPlaceHolder1_grdNoweElementy_ctl00__"'
            )
        )
            .filter((course: HTMLElement) => course.textContent.includes("New"))
            .map((course: HTMLElement) => course.innerHTML.trim())
    }));

    courseSections.forEach((courseSection, index) =>
        sections.set(index, courseSection)
    );
    courseElements
        .map(courseElement => {
            return courseElement
                .replace(/<tr[^>]*>/g, "<tr>")
                .replace(/<td[^>]*>/g, "<td>");
        })
        .forEach(courseElement => {
            if (!hasUpdatedEduxColumns(courseElement)) {
                return;
            }

            updatedCourses.add(
                new Course(
                    getCourseName(courseElement),
                    getCourseLink(courseElement),
                    getUpdatedSections(courseElement, sections)
                )
            );
        });

    if (updatedCourses.size === 0) {
        renderSuccess("No new notifications on the EDUX platform.");
        return;
    }

    renderWarning("New notifications for the following courses:");

    Array.from(updatedCourses.values()).forEach(course => {
        console.log(
            `  * ${course.name} ` +
                chalk.cyan(`(${course.updates.join(", ")})`) +
                ":"
        );
        console.log("    " + chalk.blue.underline(`${eduxUrl}/${course.link}`));
    });
    console.log("");
}
