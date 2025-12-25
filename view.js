/**
 * Single Page DB - A custom view for Obsidian Dataview plugin
 * Version 0.2.2 (25-12-2025)
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
    // Iterate through each filter configuration
    for (const f of input.filters) {
        switch(f.type) {
            case "byWords":
                // ---------- WORD FILTER SECTION ----------
                
                // Build list of unique words from the relevant frontmatter property
                let filterWords = [...new Set(
                    // Get all parent items from dataview
                    dv.current()[input.editable.parent]
                        // Extract property values and split into individual words
                        .flatMap(x => x[f.property] ? x[f.property].split(" ") : "")
                        // Sort words alphabetically (case insensitive)
                        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                        // Remove any empty elements
                        .filter(Boolean)
                )];
                
                // Initialize empty array for tracking active filters for this property
                currentFilters[f.property] = [];
                
                // Display filter section label
                dv.span(`Filter by ${f.name}: `);
                
                // Create toggle button for each unique filter word
                filterWords.forEach(w => {
                    // Track if this word is currently active in the filter
                    let isActive = currentFilters[f.property].includes(w);
                    
                    // Set button text with appropriate checkbox icon
                    let buttonText = isActive ? `✅ ${w}` : `⬜ ${w}`;
                    
                    // Create the button element
                    dv.el("button", buttonText, {
                        attr: { 
                            class: `filterBy${f.property}`,
                            style: "margin: 4px; cursor: pointer;",
                        },
                        onclick: async (event) => {
                            // Check if word is already in filter
                            isActive = currentFilters[f.property].includes(w);
                            
                            // Toggle word in/out of active filters
                            if (isActive) {
                                // Remove word from filter
                                currentFilters[f.property] = currentFilters[f.property].filter(word => word !== w);
                            } else {
                                // Add word to filter
                                currentFilters[f.property] = [...currentFilters[f.property], w];
                            }
                            
                            // Update button appearance
                            const button = event.target.closest("button");
                            if (button.innerHTML.includes("✅ ")) {
                                button.innerHTML = button.innerHTML.replace("✅", "⬜");
                            }
                            else {
                                button.innerHTML = button.innerHTML.replace("⬜", "✅");
                            }
                            
                            // Refresh filtered view
                            applyFilters();
                        }
                    });
                });
                
                // Create a "Clear Filters" button for this filter group
                dv.el("button", "🗑️ Clear Filters", {
                    attr: { style: "margin: 8px; padding: 4px 8px; cursor: pointer; background-color: #f66; color: white; border: none; border-radius: 6px;" },
                    onclick: async () => {
                        // Reset the filter array
                        currentFilters[f.property] = [];
                        
                        // Update all filter buttons to unchecked state
                        Array.from(dv.container.querySelectorAll(`button.filterBy${f.property}`)).forEach(
                            b => b.innerHTML = b.innerHTML.replace("✅", "⬜")
                        );
                        
                        // Refresh filtered view
                        applyFilters();
                    }
                });
                
                // Add spacing after filter group
                dv.paragraph("");
                break;
                
            case "search":
                // ---------- SEARCH FILTER SECTION ----------
                
                // Create search input element with label and buttons
                dv.el("div", "<span>Search: </span><input></input><button class='search-trigger' title='Search'>🔍</button><button class='search-clear' title='Clear'>✖️</button>", {
                    attr: {
                        id: "search", 
                        style: "display: flex; align-items: center;"
                    }
                });
                
                const searchInput = dv.container.querySelector("div#search input");
                const searchButton = dv.container.querySelector("div#search button.search-trigger");
                const clearButton = dv.container.querySelector("div#search button.search-clear");
                
                // Apply filters when user finishes typing (blur event)
                searchInput.addEventListener("blur", applyFilters);
                
                // Apply filters when pressing Enter key
                searchInput.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        applyFilters();
                    }
                });
                
                // Apply filters when clicking the search button
                searchButton.addEventListener("click", applyFilters);
                
                // Clear search and apply filters when clicking the clear button
                clearButton.addEventListener("click", () => {
                    searchInput.value = "";
                    applyFilters();
                });
                break;
                
            default:
                // Handle unknown filter types
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
    // Counter for visible rows after filtering
    let visibleRowCount = 0;
    
    // Get all table rows
    let tableRows = dv.container.querySelectorAll("table tbody tr");
    
    // Process each row in the table
    for (let i = 0; i < rows.length; i++) {
        // Start with assumption that row should be visible
        let showRow = true;
        
        // Check each filter configuration
        for (const f of input.filters) {
            switch(f.type) {
                case "byWords":
                    // ---------- WORD FILTER LOGIC ----------
                    
                    // Find which column corresponds to this filter
                    const col = Array.from(dv.container.querySelectorAll("table.editable th")).findIndex(
                        h => h.textContent == f.name
                    );
                    
                    // Check if row contains all selected filter words
                    if (!currentFilters[f.property].every(c => rows[i][col]?.includes(c))) {
                        // Hide row if it doesn't match filter criteria
                        showRow = false;
                        continue; // Skip remaining filters for this row
                    }
                    break;
                    
                case "search":
                    // ---------- SEARCH FILTER LOGIC ----------
                    
                    // Get current search text from input
                    const searchText = dv.container.querySelector("div#search input").value;
                    
                    // Only apply search if there's actual text entered
                    if (searchText && !rows[i].some(r => 
						r?.toString().toLowerCase().includes(searchText.toLowerCase())
					)) {
                        // Hide row if no cell contains the search text
                        showRow = false;
                        continue; // Skip remaining filters for this row
                    }
                    break;
            }
        }
        
        // Show or hide the row based on filter results
        tableRows[i].style.display = showRow ? "table-row" : "none";
        
        // Count visible rows for the summary
        if (showRow) {
            visibleRowCount += 1;
        }
    }
    
    // Update the visible row count in the table header
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
        const value = rows[row][col] || "";
        td.innerHTML = `<textarea>${value}</textarea>`;
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
        div#search {display: flex; width: 100%; align-items: center;}
        div#search > span {display: flex; width: 100%; align-items: center;}
        div#search > span > span {padding-right: 10px;}
        div#search input {flex: 1; padding: 4px 8px;}
        div#search button {
            margin-left: 4px;
            padding: 4px 8px;
            cursor: pointer;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-secondary);
            border-radius: 4px;
            font-size: 14px;
        }
        div#search button:hover {
            background: var(--background-modifier-hover);
        }
        div#search button.search-clear {
            background: #dc3545;
            color: white;
            border-color: #dc3545;
        }
        div#search button.search-clear:hover {
            background: #c82333;
            border-color: #c82333;
        }
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
