# Single Page DB for Obsidian

A custom Dataview script that allows you to edit frontmatter data from a single markdown file in a convenient table interface with filtering capabilities.

## Overview

Single Page DB is a JavaScript Dataview script for [Obsidian](https://obsidian.md/) that creates an in-place editable table interface to modify frontmatter data in your notes. The script is particularly useful for managing structured data within a single note, allowing you to:

- View frontmatter array data in a clean table format
- Edit values directly in the table with immediate updates to the frontmatter
- Filter data using tag-like toggles or free-text search
- Handle complex data structures with multiple properties

It's designed to work with the [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview), creating a seamless integration between your structured data and markdown notes.

## Features

- **In-place editing**: Click on cells to edit values directly in the table
- **Instant updates**: Changes are immediately saved to the file's frontmatter
- **Flexible configuration**: Works with any array structure in your frontmatter
- **Visual feedback**: Shows notifications when updates are successful
- **Tag support**: Preserves tag link functionality in the table
- **Filtering capabilities**: Filter your data using word filters or search
- **Visual row count**: Shows the number of visible rows when filters are applied

## Installation

1. Make sure you have the [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) installed in your Obsidian vault
2. Copy the script file `view.js` into your Obsidian vault. It needs to be copied to a visible folder (i.e. not the `.obsidian` folder).
3. Configure the input parameters as described below

## Usage

### Basic Setup

To use Single Page DB, add a Dataview JavaScript code block to your note:

````markdown
```dataviewjs
const input = {
  headers: ["ID", "Task Title", "Status", "Due Date"],
  values: dv.current().tasks.map(t => [t.taskId, t.title, t.status, t.dueDate]),
  editable: {
    parent: "tasks",
    id: "taskId",
    properties: ["taskId", "title", "status", "dueDate"]
  },
};
/* Alternatively, you can replace headers and values by query, e.g.:
  query: `TABLE WITHOUT ID
      t.taskId as "ID",
      t.title as "Task Title",
      t.status as "Status",
      t.dueDate as "Due Date"
    FROM "${dv.current().file.path}"
    FLATTEN this.tasks as T`,
*/
await dv.view('path/to/view', input);
// Note that if the full path to the script is provided, the extension .js must be omitted
// Alternatively, the full path to the folder containing the script can be provided
```
````

### Configuration Parameters

|Parameter|Type|Description|Required|
|---|---|---|---|
|`input.editable.parent`|string|The frontmatter array property containing the data|Yes|
|`input.editable.id`|string|The property name used as a unique identifier for rows|Yes|
|`input.editable.properties`|string[]|Array of property names that can be edited|Yes|
|`input.query`|string|Dataview query to fetch data (alternative to headers/values)|No*|
|`input.headers`|string[]|Column headers (required if not using query)|No*|
|`input.values`|Array[]|Data values as arrays (required if not using query)|No*|
|`input.filters`|Array|Array of filter configurations (optional)|No|

*Either `query` or both `headers` and `values` must be provided.

### Filter Configuration

You can add filters to your table by configuring the `filters` array:

```javascript
filters: [
  {
    type: "byWords", // Filter by clicking on word buttons
    name: "Status",  // Display name (should match column header)
    property: "status" // Frontmatter property to filter on
  },
  {
    type: "search"  // Free text search across all columns
  }
]
```

### Example Frontmatter

This script works with frontmatter that contains an array of objects. For example:

```yaml
---
tasks:
  - taskId: "task-1"
    title: "Complete project documentation"
    status: "In Progress"
    dueDate: "2023-06-30"
  - taskId: "task-2"
    title: "Fix bug in login system"
    status: "Pending"
    dueDate: "2023-06-25"
---
```

### Complete Example with Filters

Here's a complete example including filters:

````markdown
```dataviewjs
const input = {
  headers: ["ID", "Task Title", "Status", "Due Date"],
  values: dv.current().tasks.map(t => [t.taskId, t.title, t.status, t.dueDate]),
  editable: {
    parent: "tasks",
    id: "taskId",
    properties: ["taskId", "title", "status", "dueDate"]
  },
  filters: [
    {
      type: "byWords",
      name: "Status",
      property: "status"
    },
    {
      type: "search",
    }
  ]
};
await dv.view('path/to/view', input);
```
````

## Limitations

- Works only with array structures in frontmatter
- Requires a unique identifier for each row
- Only handles text-based editing (no dropdowns or specialized inputs)
- By default, the view is refreshed each time the table is edited. You can change this behavior by disabling "Automatic view refreshing" in Dataview settings

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- The [Obsidian](https://obsidian.md/) team for creating an amazing knowledge base application
- The creator of [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) for enabling powerful data queries in Obsidian
- This plugin is freely inspired from the plugin [obsidian-dataview-inlinedb](https://github.com/vanadium23/obsidian-dataview-inlinedb). However, this plugin does not assume that the first column is the relevant file, uses nested properties to gather all the database in the frontmatter of a single file and does not rely on MetaEdit API.
- This plugin offers more basic functionalities than the plugin [obsidian-db-folder](https://github.com/RafaelGB/obsidian-db-folder). However, this last plugin is different to the extent that it requires the data to be contained in different notes (one note per item in the database), while the present plugin aims at gathering all the database in the frontmatter of a single file.