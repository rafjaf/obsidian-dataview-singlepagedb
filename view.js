/**
 * Single Page DB - A custom view for Obsidian Dataview plugin
 * Version 0.2 (23-03-2025)
 * 
 * This script displays data from a single markdown file's frontmatter in an editable table.
 * It allows for in-place editing of frontmatter data through a convenient interface.
 * Filters can also be applied to the displayed data.
 * 
 * Required input parameters:
 * @param {Object} input - Configuration object for the script
 * @param {Object} input.editable - Settings for editable fields
 * @param {string} input.editable.parent - The frontmatter array property containing the data
 * @param {string} input.editable.id - The property name used as a unique identifier for rows
 * @param {string[]} input.editable.properties - Array of property names that can be edited
 * 
 * Data source (one of these is required):
 * @param {string} [input.query] - Dataview query to fetch data
 * @param {string[]} [input.headers] - Column headers (required if not using query)
 * @param {Array[]} [input.values] - Data values as arrays (required if not using query)
 * 
 * Optional filter settings:
 * @param {Array} [input.filters] - Array of filter configurations
 * @param {string} input.filters[].type - Type of filter ("byWords" or "search")
 * @param {string} input.filters[].name - Display name for the filter (for "byWords" type)
 * @param {string} [input.filters[].property] - Property name to filter on (for "byWords" type)
 */

// Global variables to store the parsed data
let headers, rows;
let currentFilters = {};

/**
 * Creates a delay using a Promise
 * @param {number} ms - Milliseconds to delay
 * @return {Promise} Promise that resolves after specified time
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Updates a specific property in the frontmatter
 * @param {string} parent - Name of the array in frontmatter
 * @param {string} id - Property name used as identifier
 * @param {any} idValue - Value of the identifier for the row to update
 * @param {string} property - Property name to update
 * @param {any} value - New value to set
 */
async function updateFrontmatter(parent, id, idValue, property, value) {
    await app.fileManager.processFrontMatter(
        app.workspace.getActiveFile(),
        (frontmatter) => {
            const rowIndex = frontmatter[parent].findIndex(r => r[id] == idValue);
            frontmatter[parent][rowIndex][property] = value;
        }
    );
    new Notice(`Property updated: ${property}`);
}

/**
 * Displays filter UI elements based on filter configurations
 * Creates filter buttons for "byWords" type filters and search input for "search" type
 */
function displayFilters() {
    for (const f of input.filters) {
        switch(f.type) {
            case "byWords":
                // Build list of words used as filter from the relevant frontmatter property
                let filterWords = [...new Set(
                    dv.current()[input.editable.parent]
                    .flatMap(x => x[f.property] ? x[f.property].split(" ") : "")
                    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) // case insensitive sort
                    .filter(Boolean) // remove empty element, if any
                )];
                currentFilters[f.property] = [];
                dv.span(`Filter by ${f.name}: `);
                
                // Display tag toggle buttons
                filterWords.forEach(w => {
                    let isActive = currentFilters[f.property].includes(w);
                    let buttonText = isActive ? `✅ ${w}` : `⬜ ${w}`;
                    dv.el("button", buttonText, {
                        attr: { 
                            class: `filterBy${f.property}`,
                            style: "margin: 4px; cursor: pointer;",
                        },
                        onclick: async (event) => {
                            isActive = currentFilters[f.property].includes(w);
                            if (isActive) {
                                currentFilters[f.property] = currentFilters[f.property].filter(word => word !== w);
                            } else {
                                currentFilters[f.property] = [...currentFilters[f.property], w];
                            }
                            const button = event.target.closest("button");
                            if (button.innerHTML.includes("✅ ")) {
                                button.innerHTML = button.innerHTML.replace("✅", "⬜");
                            }
                            else {
                                button.innerHTML = button.innerHTML.replace("⬜", "✅");
                            }
                            applyFilters();
                        }
                    });
                });
                
                // Add Clear Filters button
                dv.el("button", "🗑️ Clear Filters", {
                    attr: { style: "margin: 8px; padding: 4px 8px; cursor: pointer; background-color: #f66; color: white; border: none; border-radius: 6px;" },
                    onclick: async () => {
                        currentFilters[f.property] = [];
                        Array.from(dv.container.querySelectorAll(`button.filterBy${f.property}`)).forEach(
                            b => b.innerHTML = b.innerHTML.replace("✅", "⬜")
                        );
                        applyFilters();
                    }
                });
                dv.paragraph("");
                break;
                
            case "search":
                dv.el("div", "<span>Search: </span><input></input>", {attr: {id: "search", style: "display: flex"}});
                dv.container.querySelector("div#search input").addEventListener("blur", applyFilters);
                break;
                
            default:
                throw new Error(`Unknown filter type: ${f.type}`);
                break;
        }
    }
}

/**
 * Applies active filters to the table rows
 * Shows/hides rows based on filter criteria
 * Updates the row count in the table header
 */
function applyFilters() {
    let visibleRowCount = 0;
    let tableRows = dv.container.querySelectorAll("table tbody tr");
    
    for (let i = 0; i < rows.length; i++) {
        let showRow = true;
        
        for (const f of input.filters) {
            switch(f.type) {
                case "byWords":
                    const col = Array.from(dv.container.querySelectorAll("table.editable th")).findIndex(
                        h => h.textContent == f.name
                    );
                    if (!currentFilters[f.property].every(c => rows[i][col].includes(c))) {
                        showRow = false;
                        continue; // out of filters loop
                    }
                    break;
                    
                case "search":
                    const searchText = dv.container.querySelector("div#search input").value;
                    if (searchText && !rows[i].some(r => r?.includes(searchText))) {
                        showRow = false;
                        continue; // out of filters loop
                    }
                    break;
            }
        }
        
        tableRows[i].style.display = showRow ? "table-row" : "none";
        if (showRow) {
            visibleRowCount += 1;
        }
    }
    
    // Update visible row count in the table header
    dv.container.querySelector("table.editable th span.dataview.small-text").textContent = visibleRowCount;
}

/**
 * Handles click events on the table
 * Makes cells editable when clicked if they are configured as editable
 * @param {Event} event - The click event
 */
async function tableClick(event) {
    // Preserve default behavior when clicking on tags
    if (event.target.matches("a.tag")) {
        event.stopPropagation();
        return;
    }
    
    // Handle case when clicking outside a currently edited cell
    const textarea = dv.container.querySelector("table textarea");
    if (textarea && (event.target != textarea)) {
        await tableBlur({target: textarea});
        event.stopPropagation();
        return;
    }
    
    // Make cell editable if clicked on an editable cell
    const td = event.target.closest('td');
    const col = td?.cellIndex;
    if (td && 
        !td.querySelector("textarea") && 
        input?.editable?.properties?.[col]) { 
        const row = td.parentElement.rowIndex - 1;
        // Replace cell content with editable textarea
        td.innerHTML = `<textarea>${rows[row][col]}</textarea>`;
    }
}

/**
 * Handles blur events when leaving an editable cell
 * Updates the frontmatter if the value changed
 * @param {Event} event - The blur event
 */
async function tableBlur(event) {
    const td = event.target.closest('td');
    if (!td.querySelector("textarea")) {
        return;
    }
    
    const col = td.cellIndex;
    const row = td.parentElement.rowIndex - 1;
    const value = event.target.value;
    
    // Replace textarea with the new value
    td.innerHTML = "";
    dv.span(value, {container: td});
    
    // Update frontmatter if value was modified
    if (value != rows[row][col]) {
        const parent = input.editable.parent;
        const id = input.editable.id;
        const colOfId = input.editable.properties.indexOf(id);
        const idValue = rows[row][colOfId];
        const property = input.editable.properties[col];
        
        await updateFrontmatter(parent, id, idValue, property, value);
        rows[row][col] = value; // Update the local data
    }
}

/**
 * Main entry point that renders the editable table
 * @param {Object} input - Configuration settings
 */
async function renderInlineDb(input) {
    // Validate input parameters
    if (!input.editable || !input.editable.parent || !input.editable.id || !input.editable.properties) {
        dv.el("span", "Error: Missing required editable configuration (parent, id, properties)");
        return;
    }
    
    // Build query and get data
    if (input.query) {
        const result = await dv.query(input.query);
        headers = result.value.headers;
        rows = result.value.values;
    } else if (input.headers && input.values) {
        headers = input.headers;
        rows = input.values;
    } else {
        dv.el("span", "Error: Either query or headers/values must be provided");
        return;
    }
    
    // Add CSS for editable table
    let styleBlock = document.createElement("style");
    styleBlock.innerHTML = `
        table.editable textarea {width: 100%;}
        div#search > span {display: flex; width: 100%;}
        div#search > span > span {padding-right: 10px;}
        div#search input {flex: 1;}
    `;
    dv.container.appendChild(styleBlock);
    
    // Display filters, if any
    if (input.filters?.length) {
        displayFilters();
    }
    
    // Render the table
    dv.table(headers, rows);
    
    // Wait for table to be rendered in the DOM
    let counter = 0;
    while (!dv.container.querySelector("table")) {
        await delay(500);
        counter++;
        if (counter == 10) {
            dv.el("span", "Error: no table detected");
            return;
        }
    }
    
    // Add class and event listeners to the table
    const table = dv.container.querySelector("table");
    table.addClass("editable");
    table.addEventListener("click", tableClick);
    table.addEventListener("blur", tableBlur, true);
}

// Main execution block - run the script and handle errors
try {
    await renderInlineDb(input);
} catch (error) {
    console.error(error);
    dv.el('span', `Error: ${error.message}`);
}
