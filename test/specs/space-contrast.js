// TODO: Research running these tests with `mount` in Jest.
const fs = require("fs");

// TODO: Move this to a helper library.
function regionsOverlap (startX1, startY1, endX1, endY1, startX2, startY2, endX2, endY2) {
    if ((startX1 < endX2) && (startX2 < endX1) && (startY1 < endY2) && (startY2 < endY1)) {
        // console.log("Region (" + startX1 + "," + startY2 + ") -> (" + endX1 + "," + endY1 + ") overlaps with region (" + startX2 + "," + startY2 + ") -> (" + endX2 + "," + endY2 + ").");
        return true;
    }
    else {
        return false;
    }
}

function elementsOverlap (element1, element2) {
    const startX1 = element1.location.x;
    const startY1 = element1.location.y;
    const endX1   = startX1 + element1.size.width;
    const endY1   = startY1 + element1.size.height;

    const startX2 = element2.location.x;
    const startY2 = element2.location.y;
    const endX2   = startX2 + element2.size.width;
    const endY2   = startY2 + element2.size.height;

    return regionsOverlap (startX1, startY1, endX1, endY1, startX2, startY2, endX2, endY2);
}

// TODO: Move this to a helper library

// Adapted from:
// https://github.com/dequelabs/axe-core/blob/ea89c82b7da97b68f98478cab848cb41052ebd05/lib/commons/color/color.js
function getRelativeLuminance (rgbaValue) {
    // Convert a string like rgba(52,58,64,1) into integer color values.
    const rgbaSegments = rgbaValue.split(/[\(,\)]/); 


    var rSRGB = rgbaSegments[1] / 255;
    var gSRGB = rgbaSegments[2] / 255;
    var bSRGB = rgbaSegments[3] / 255;

    var r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow((rSRGB + 0.055) / 1.055, 2.4);
    var g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow((gSRGB + 0.055) / 1.055, 2.4);
    var b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow((bSRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// TODO: Move to a helper library

// Adapted from:
// https://github.com/dequelabs/axe-core/blob/52fb13872f2ff477b3a32d10d1fb5c72fde3adda/lib/commons/color/get-contrast.js#L12
function getContrast (fgColor, bgColor) {
    // TODO: Add flattening for non solid alphas if required.
    // if (fgColor.alpha < 1) {
	// 	fgColor = flattenColors(fgColor, bgColor);
	// }

	var bL = getRelativeLuminance(bgColor);
	var fL = getRelativeLuminance(fgColor);

	return (Math.max(fL, bL) + 0.05) / (Math.min(fL, bL) + 0.05);
}

describe("Check the contrast of the deployed space theme.", () => {
    // TODO: Make this check the current version of all themes rather than the remote site.
    before(() => {
        const axeSource = fs.readFileSync("node_modules/axe-core/axe.min.js", { encoding: "utf-8"});
        browser.url("https://space.codelearncreate.org");
        browser.execute(axeSource);
    });

    it("Should have the right title.", () => {
    	expect(browser).toHaveTitle("Inclusive Coding Environment");
    });

    // TODO: Expand this to also consider button text color and borders, per:
    // https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html

    it ("Should not have any low contrast clickable elements.", () => {
        
        // Use browser.react$$ to find "our" clickable React components by type.
        const clickableComponents = {};
        ["AriaDisablingButton", "Button", "ProgramSpeedController", "ToggleSwitch"].forEach((componentType) => {
            // https://webdriver.io/docs/api/browser/react$$.html
            const typeComponents = browser.react$$(componentType);
            if (typeComponents.length) {
                typeComponents.forEach((typeComponent) => {
                    let text = typeComponent.getText();
                    if (text.length === 0) {
                        text = typeComponent.getAttribute("aria-label");
                    }
                    clickableComponents[typeComponent.elementId] = {
                        // TODO: Remove
                        // component: typeComponent,
                        text: text, // e.g.: 'Share'
                        size: typeComponent.getSize(), //  e.g.: { width: 180, height: 43 }
                        location: typeComponent.getLocation(), //  e.g.: { x: 234, y: 1409.84375 }
                        "background-color": typeComponent.getCSSProperty("background-color")
                        //  e.g.: {
                        //   property: 'background-color',
                        //   value: 'rgba(52,58,64,1)',
                        //   parsed: { hex: '#343a40', alpha: 1, type: 'color', rgba: 'rgba(52,58,64,1)' }
                        // }
                    }
                });
            }
        });

        // console.log("Found " + Object.keys(clickableComponents).length + " clickable components.");
        
        // Go through the clickable components and make sure that either none overlap with each other, or that
        // any that overlap have enough contrast.  Avoid checking each pairing twice by keeping a list of ids for which
        // we've checked all pairings.
        const completedIds = [];
        Object.keys(clickableComponents).forEach((primaryComponentId) => {
            const primaryComponent = clickableComponents[primaryComponentId];
            const overlappingElements = [];
            Object.keys(clickableComponents).forEach((secondaryComponentId) => {
                if (secondaryComponentId !== primaryComponentId && completedIds.indexOf(secondaryComponentId) === -1) { 
                    const secondaryComponent = clickableComponents[secondaryComponentId];
                    if (elementsOverlap(primaryComponent, secondaryComponent)) {
                        overlappingElements.push(secondaryComponent);
                    }
                }
            })

            overlappingElements.forEach((overlappingElement) => {
                const backgroundContrast = getContrast(primaryComponent["background-color"].parsed.rgba, overlappingElement["background-color"].parsed.rgba);

                if (backgroundContrast < 3) {
                    console.log("The background of clickable component '" + primaryComponent.text + "' (" + primaryComponent["background-color"].parsed.hex + ") does not have enough contrast with overlapping clickable component '" + overlappingElement.text + "' (" + overlappingElement["background-color"].parsed.hex + "). Contrast Ratio: " + backgroundContrast);
                }
            });

            completedIds.push(primaryComponentId);
        });


        // Now make a list of anything else that might overlap with the buttons.
        const otherElements = {}
        
        // If nothing else is behind us, the body must be.
        const bodyElement = browser.$("body");
        const bodyBackgroundColor = bodyElement.getCSSProperty("background-color");
        
        // 1. Use XPath to get all elements, as in browser.$("//body//*").
        const allElementsInBody = browser.$$("//body//*"); // TODO: Confirm whether this includes the body itself.

        allElementsInBody.forEach((elementInBody) => {
            // Exclude anything we've already seen, assuming IDs are used consistently, then make a note of the
            // coordinates and colours of any visible elements with a background-color set.
            if (!clickableComponents[elementInBody.elementId]) {
                const backgroundColor = elementInBody.getCSSProperty("background-color");
                const elementSize = elementInBody.getSize();
                if (elementInBody.isDisplayed() && backgroundColor && backgroundColor.parsed.alpha && (backgroundColor.parsed.hex !== bodyBackgroundColor.parsed.hex) && elementSize && elementSize.width && elementSize.height) {
                    let text = elementInBody.getText();
                    if (text.length === 0) {
                        text = elementInBody.getAttribute("aria-label");
                    }
                    otherElements[elementInBody.elementId] = {
                        // TODO: Remove
                        component: elementInBody,
                        text: text,
                        size: elementSize,
                        location: elementInBody.getLocation(),
                        "background-color": backgroundColor
                    };             
                }
            }
        });

        // console.log("Found " + Object.keys(otherElements).length + " additional visible elements with a background color.");
    
        // Go through the clickable components looking for items that at least partially overlap with them.
        Object.keys(clickableComponents).forEach((componentID) => {
            const clickableComponent = clickableComponents[componentID];
            const overlappingElements = [];
            Object.keys(otherElements).forEach((elementId) => {
                const elementInBody = otherElements[elementId];
                if (elementsOverlap(clickableComponent, elementInBody)) {
                    overlappingElements.push(elementInBody);
                }
            });

            if (overlappingElements.length) {
                // console.log("Found " + overlappingElements.length + " elements that overlap with clickable component '" + clickableComponent.text + "'. Checking contrast.");

                overlappingElements.forEach((overlappingElement) => {
                    const backgroundContrast = getContrast(clickableComponent["background-color"].parsed.rgba, overlappingElement["background-color"].parsed.rgba);

                    // TODO: Surely there is a better way to display this kind of diagnostic info about a failure.
                    if (backgroundContrast < 3) {
                        console.log("The background of clickable component '" + clickableComponent.text + "' (" + clickableComponent["background-color"].parsed.hex + ") does not have enough contrast with its background (" + overlappingElement["background-color"].parsed.hex + "). Contrast Ratio: " + backgroundContrast);
                    }

                    // TODO: Enable once we have zero errors.
                    // expect(contrast).toBeGreaterThanOrEqual(3);
                });
            }
            // Check with the body if nothing else overlaps.
            else {
                const contrast = getContrast(clickableComponent["background-color"].parsed.rgba, bodyBackgroundColor.parsed.rgba);

                // TODO: Surely there is a better way to display this kind of diagnostic info about a failure.
                if (contrast < 3) {
                    console.log("Clickable component '" + clickableComponent.text + "' (" + clickableComponent["background-color"].parsed.hex + ") does not have enough contrast with the body (" + bodyBackgroundColor.parsed.hex + "). Contrast Ratio: " + contrast);
                }

                // TODO: Enable once we have zero errors.
                // expect(contrast).toBeGreaterThanOrEqual(3);
            }
        });

        // TODO: Discuss cases in which there are multiple layers of background items, so that we can ensure that we
        // Are only comparing things that visibly overlap.
    });
});

// TODO: Break this apart and make it a non-webdriver test.
describe("Unit tests for the 'overlap' function.", () => {
    it ("Should report identical regions as overlapping.", () => {
        const overlaps = regionsOverlap (0, 0, 10, 10, 0, 0, 10, 10);
        expect(overlaps).toBe(true);
    });

    it ("Should report horizontal neighbours as non-overlapping.", () => {
        const overlaps = regionsOverlap (0, 0, 10, 10, 11, 0, 21, 10);
        expect(overlaps).toBe(false);
    });


    it ("Should report vertical neighbours as non-overlapping.", () => {
        const overlaps = regionsOverlap (0, 0, 10, 10, 0, 11, 0, 21);
        expect(overlaps).toBe(false);
    });

    it ("Should be able to handle overlapping negative coordinates.", () => {
        const overlaps = regionsOverlap (-10, -10, 0, 0, -5, -5, 5, 5);
        expect(overlaps).toBe(true);
    });

    it ("Should be able to handle non-overlapping negative coordinates.", () => {
        const overlaps = regionsOverlap (-10, -10, -5, -5, -4, -4, 6, 6);
        expect(overlaps).toBe(false);
    });
});