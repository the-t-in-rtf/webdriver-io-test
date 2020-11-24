// TODO: Research making axe a dev include and running the tests with `mount` in Jest.
const fs = require("fs");

describe("Use aXe to check the deployed space theme.", () => {
    // TODO: Make this check the current version of all themes rather than the remote site.
    before(() => {
        const axeSource = fs.readFileSync("node_modules/axe-core/axe.min.js", { encoding: "utf-8"});
        browser.url("https://space.codelearncreate.org");
        browser.execute(axeSource);
    });

    it("Should have the right title.", () => {
    	expect(browser).toHaveTitle("Inclusive Coding Environment");
    });

    it("Should not have any accessibility check failures.", () => {
        const axeResults = browser.execute(() => {
            return axe.run({
                resultTypes: ["violations", "incomplete"]
            });
        });

        if (axeResults.violations) {
            expect(axeResults.violations.length).toBe(0);

            if (axeResults.violations.length) {
                console.log("AXE VIOLATIONS:");
                axeResults.violations.forEach((violation) => {
                    console.log("  - " + violation.id);
                });
            }
        }

        if (axeResults.incomplete) {
            if (axeResults.incomplete.length) {
                console.log("AXE INCOMPLETE CHECKS:");
                axeResults.incomplete.forEach((incompleteCheckRule) => {
                    console.log("  - " + incompleteCheckRule.id);
                });
            }
        }
    });
});
