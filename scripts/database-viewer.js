#!/usr/bin/env node

/**
 * Database Viewer - Web-based PostgreSQL Table Browser
 * Provides a web interface to browse tables, view data with pagination, sorting, and search
 */

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const path = require("path");
const postgres = require("../lib/postgres");

const app = express();
const PORT = process.env.DB_VIEWER_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "db-viewer-public")));

// Database connection test
async function testConnection() {
  try {
    await postgres.query("SELECT 1");
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// API Routes

// Get all tables with metadata
app.get("/api/tables", async (req, res) => {
  try {
    const query = `
      SELECT 
        t.table_name,
        t.table_schema,
        obj_description(c.oid) as table_comment,
        (
          SELECT COUNT(*) 
          FROM information_schema.columns 
          WHERE table_name = t.table_name 
          AND table_schema = t.table_schema
        ) as column_count,
        CASE 
          WHEN t.table_type = 'BASE TABLE' THEN 'Table'
          WHEN t.table_type = 'VIEW' THEN 'View'
          ELSE t.table_type
        END as table_type
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND t.table_schema NOT LIKE 'pg_temp_%'
      AND t.table_schema NOT LIKE 'pg_toast_temp_%'
      ORDER BY t.table_schema, t.table_name;
    `;

    const result = await postgres.query(query);

    // Get row counts for each table
    const tablesWithCounts = await Promise.all(
      result.rows.map(async (table) => {
        try {
          const countQuery = `SELECT COUNT(*) as row_count FROM "${table.table_schema}"."${table.table_name}"`;
          const countResult = await postgres.query(countQuery);
          return {
            ...table,
            row_count: parseInt(countResult.rows[0].row_count),
          };
        } catch (error) {
          return {
            ...table,
            row_count: "N/A",
          };
        }
      })
    );

    res.json({
      success: true,
      tables: tablesWithCounts,
    });
  } catch (error) {
    console.error("Error fetching tables:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get table structure (columns info)
app.get("/api/table/:schema/:table/structure", async (req, res) => {
  try {
    const { schema, table } = req.params;

    const query = `
      SELECT 
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        col_description(pgc.oid, c.ordinal_position) as column_comment,
        CASE 
          WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
          WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
          WHEN c.is_nullable = 'NO' THEN 'NOT NULL'
          ELSE ''
        END as constraints
      FROM information_schema.columns c
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      LEFT JOIN information_schema.table_constraints tc ON tc.table_name = c.table_name 
        AND tc.table_schema = c.table_schema AND tc.constraint_type = 'PRIMARY KEY'
      LEFT JOIN information_schema.key_column_usage pk ON pk.table_name = c.table_name 
        AND pk.table_schema = c.table_schema AND pk.column_name = c.column_name 
        AND pk.constraint_name = tc.constraint_name
      LEFT JOIN information_schema.key_column_usage fk ON fk.table_name = c.table_name 
        AND fk.table_schema = c.table_schema AND fk.column_name = c.column_name
      LEFT JOIN information_schema.table_constraints fktc ON fktc.constraint_name = fk.constraint_name
        AND fktc.constraint_type = 'FOREIGN KEY'
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position;
    `;

    const result = await postgres.query(query, [table, schema]);

    res.json({
      success: true,
      columns: result.rows,
    });
  } catch (error) {
    console.error("Error fetching table structure:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get table data with pagination, sorting, and search
app.get("/api/table/:schema/:table/data", async (req, res) => {
  try {
    const { schema, table } = req.params;
    const {
      page = 1,
      limit = 25,
      sort = "",
      order = "ASC",
      search = "",
      searchColumn = "",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build the query
    let baseQuery = `FROM "${schema}"."${table}"`;
    let whereClause = "";
    let orderClause = "";
    let queryParams = [];

    // Add search functionality
    if (search && searchColumn) {
      whereClause = ` WHERE "${searchColumn}"::text ILIKE $${
        queryParams.length + 1
      }`;
      queryParams.push(`%${search}%`);
    }

    // Add sorting
    if (sort) {
      orderClause = ` ORDER BY "${sort}" ${order.toUpperCase()}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}${whereClause}`;
    const countResult = await postgres.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get data with pagination
    const dataQuery = `SELECT * ${baseQuery}${whereClause}${orderClause} LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);

    const dataResult = await postgres.query(dataQuery, queryParams);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: offset + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching table data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Serve the main HTML page
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Viewer - Priyanvada AI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: #2563eb;
            color: white;
            padding: 1rem 2rem;
            margin-bottom: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.8rem;
            font-weight: 600;
        }
        
        .header p {
            opacity: 0.9;
            margin-top: 0.5rem;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error {
            background: #fee2e2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            border: 1px solid #fecaca;
        }
        
        .tables-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .table-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .table-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .table-card h3 {
            color: #1f2937;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .table-meta {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 0.75rem;
        }
        
        .table-stats {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
        }
        
        .stat {
            background: #f3f4f6;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            color: #374151;
        }
        
        .table-view {
            display: none;
        }
        
        .table-view.active {
            display: block;
        }
        
        .table-header {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .back-button {
            background: #6b7280;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
        
        .back-button:hover {
            background: #4b5563;
        }
        
        .table-controls {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .search-box, .select-box {
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.875rem;
        }
        
        .search-box {
            min-width: 200px;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background-color 0.2s;
        }
        
        .btn-primary {
            background: #2563eb;
            color: white;
        }
        
        .btn-primary:hover {
            background: #1d4ed8;
        }
        
        .data-table {
            background: white;
            border-radius: 8px;
            overflow-x: auto;
            overflow-y: visible;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            max-width: 100%;
            position: relative;
        }
        
        .data-table::after {
            content: "← Scroll to see more columns →";
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #6b7280;
            font-style: italic;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }
        
        .data-table.scrollable::after {
            opacity: 1;
        }
        
        .data-table table {
            width: 100%;
            min-width: 800px; /* Ensure minimum width for readability */
            border-collapse: collapse;
            table-layout: auto;
        }
        
        .data-table th,
        .data-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            font-size: 0.875rem;
        }
        
        .data-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
            cursor: pointer;
            position: relative;
            white-space: nowrap;
            min-width: 120px;
        }
        
        .data-table th:hover {
            background: #f3f4f6;
        }
        
        .data-table td {
            min-width: 120px;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            cursor: pointer;
            position: relative;
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            font-size: 0.875rem;
            transition: all 0.2s;
            word-break: break-all;
        }
        
        .data-table td:hover {
            background: #f3f4f6;
        }
        
        .data-table td.expandable {
            color: #2563eb;
            font-weight: 500;
            padding-right: 2rem;
        }
        
        .data-table td.expandable::after {
            content: "�";
            position: absolute;
            right: 0.5rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.875rem;
            opacity: 0.7;
            transition: all 0.2s;
        }
        
        .data-table td.expandable:hover {
            background: #eff6ff;
            transform: scale(1.02);
        }
        
        .data-table td.expandable:hover::after {
            opacity: 1;
            transform: translateY(-50%) scale(1.2);
        }
        
        .data-table td.json-field {
            background: #f0fdf4;
            border-left: 3px solid #16a34a;
        }
        
        .data-table td.json-field::after {
            content: "{ }";
            font-weight: bold;
            color: #16a34a;
        }
        
        .data-table td.null-field {
            background: #fef2f2;
            font-style: italic;
            color: #9ca3af;
        }
        
        .data-table td.long-text {
            background: #fefce8;
            border-left: 3px solid #eab308;
        }
        
        .data-table tr:hover {
            background: #f9fafb;
        }
        
        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        
        .pagination-info {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .pagination-controls {
            display: flex;
            gap: 0.5rem;
        }
        
        .pagination-btn {
            padding: 0.5rem 0.75rem;
            border: 1px solid #d1d5db;
            background: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        
        .pagination-btn:hover:not(:disabled) {
            background: #f3f4f6;
        }
        
        .pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .pagination-btn.active {
            background: #2563eb;
            color: white;
            border-color: #2563eb;
        }
        
        .structure-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 1rem;
        }
        
        .structure-table table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .structure-table th,
        .structure-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            font-size: 0.875rem;
        }
        
        .structure-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        .constraint-badge {
            display: inline-block;
            padding: 0.125rem 0.375rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            background: #dbeafe;
            color: #1e40af;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 1rem;
        }
        
        .tab {
            padding: 0.75rem 1rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #6b7280;
            font-weight: 500;
        }
        
        .tab.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s;
        }
        
        .modal.show {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .modal-content {
            background: white;
            margin: auto;
            padding: 0;
            border-radius: 12px;
            max-width: 90%;
            max-height: 90%;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s;
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f9fafb;
            border-radius: 12px 12px 0 0;
        }
        
        .modal-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }
        
        .close-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            padding: 0.25rem;
            border-radius: 4px;
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .close-modal:hover {
            background: #e5e7eb;
            color: #374151;
        }
        
        .modal-body {
            padding: 1.5rem;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .modal-field-info {
            margin-bottom: 1rem;
            padding: 1rem;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        
        .modal-field-name {
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.25rem;
        }
        
        .modal-field-type {
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .modal-value {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 0.875rem;
            line-height: 1.6;
            color: #374151;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 50vh;
            overflow-y: auto;
        }
        
        .modal-value.json {
            background: #f8f9fa;
            border-color: #28a745;
        }
        
        .modal-value.null {
            background: #fff5f5;
            border-color: #f56565;
            color: #e53e3e;
            font-style: italic;
            text-align: center;
        }
        
        .modal-actions {
            padding: 1rem 1.5rem;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            background: #f9fafb;
            border-radius: 0 0 12px 12px;
        }
        
        .copy-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .copy-btn:hover {
            background: #1d4ed8;
        }
        
        .copy-btn.copied {
            background: #059669;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .tables-grid {
                grid-template-columns: 1fr;
            }
            
            .table-controls {
                flex-direction: column;
                align-items: stretch;
            }
            
            .search-box {
                min-width: auto;
            }
            
            .data-table td {
                min-width: 100px;
                max-width: 200px;
                font-size: 0.75rem;
            }
            
            .pagination {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗄️ Database Viewer</h1>
            <p>Browse and explore your PostgreSQL database tables</p>
        </div>
        
        <div id="tables-view">
            <div class="loading">
                <div class="spinner"></div> Loading database tables...
            </div>
        </div>
        
        <div id="table-view" class="table-view">
            <button id="back-to-tables" class="back-button">← Back to Tables</button>
            
            <div class="table-header">
                <h2 id="table-title"></h2>
                <p id="table-info"></p>
            </div>
            
            <div class="tabs">
                <div class="tab active" data-tab="data">Data</div>
                <div class="tab" data-tab="structure">Structure</div>
            </div>
            
            <div id="data-tab" class="tab-content active">
                <div class="table-controls">
                    <select id="search-column" class="select-box">
                        <option value="">Search in all columns</option>
                    </select>
                    <input type="text" id="search-input" class="search-box" placeholder="Search...">
                    <button id="search-button" class="btn btn-primary">Search</button>
                    <select id="page-size" class="select-box">
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>
                </div>
                
                <div class="data-table">
                    <div id="data-loading" class="loading">
                        <div class="spinner"></div> Loading data...
                    </div>
                </div>
            </div>
            
            <div id="structure-tab" class="tab-content">
                <div class="structure-table">
                    <div id="structure-loading" class="loading">
                        <div class="spinner"></div> Loading structure...
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal for viewing full field content -->
    <div id="field-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modal-title">Field Content</h3>
                <button class="close-modal" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-field-info" id="modal-field-info"></div>
                <div class="modal-value" id="modal-value"></div>
            </div>
            <div class="modal-actions">
                <button class="copy-btn" id="copy-btn" onclick="copyToClipboard()">
                    📋 Copy Content
                </button>
            </div>
        </div>
    </div>

    <script>
        let currentTable = null;
        let currentSchema = null;
        let currentPage = 1;
        let currentPageSize = 25;
        let currentSort = '';
        let currentOrder = 'ASC';
        let currentSearch = '';
        let currentSearchColumn = '';
        let currentTableColumns = [];
        let tableDataCache = {}; // Store full data for modal viewing

        // Load tables on page load
        document.addEventListener('DOMContentLoaded', loadTables);

        // Modal management
        function showModalFromData(element) {
            const rowIndex = element.getAttribute('data-row');
            const columnName = element.getAttribute('data-column');
            const dataType = element.getAttribute('data-type');
            const cacheKey = \`\${rowIndex}_\${columnName}\`;
            const value = tableDataCache[cacheKey];
            
            showModal(columnName, value, dataType);
        }

        function showModal(columnName, value, dataType) {
            const modal = document.getElementById('field-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalFieldInfo = document.getElementById('modal-field-info');
            const modalValue = document.getElementById('modal-value');
            
            // Set title
            modalTitle.textContent = \`Field: \${columnName}\`;
            
            // Prepare content summary
            let contentSummary = '';
            let contentLength = 0;
            
            if (value === null || value === undefined) {
                contentSummary = 'NULL value';
            } else if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    contentSummary = \`Array with \${value.length} items\`;
                    contentLength = JSON.stringify(value).length;
                } else {
                    contentSummary = \`Object with \${Object.keys(value).length} properties\`;
                    contentLength = JSON.stringify(value).length;
                }
            } else {
                contentSummary = \`\${typeof value === 'string' ? 'Text' : 'Value'} • \${String(value).length} characters\`;
                contentLength = String(value).length;
            }
            
            // Set field info
            modalFieldInfo.innerHTML = \`
                <div class="modal-field-name">\${columnName}</div>
                <div class="modal-field-type">Type: \${dataType} • \${contentSummary}</div>
            \`;
            
            // Set value with appropriate styling
            modalValue.className = 'modal-value';
            
            if (value === null || value === undefined) {
                modalValue.textContent = 'NULL';
                modalValue.classList.add('null');
            } else if (typeof value === 'object') {
                modalValue.textContent = JSON.stringify(value, null, 2);
                modalValue.classList.add('json');
            } else {
                modalValue.textContent = String(value);
            }
            
            // Show modal
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Focus on copy button for keyboard navigation
            setTimeout(() => {
                document.getElementById('copy-btn').focus();
            }, 100);
        }

        function closeModal() {
            const modal = document.getElementById('field-modal');
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }

        function copyToClipboard() {
            const modalValue = document.getElementById('modal-value');
            const copyBtn = document.getElementById('copy-btn');
            
            navigator.clipboard.writeText(modalValue.textContent).then(() => {
                copyBtn.innerHTML = '✅ Copied!';
                copyBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy Content';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        }

        // Close modal when clicking outside
        document.getElementById('field-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        // Load tables on page load
        document.addEventListener('DOMContentLoaded', loadTables);

        // Event listeners
        document.getElementById('back-to-tables').addEventListener('click', showTablesView);
        document.getElementById('search-button').addEventListener('click', performSearch);
        document.getElementById('search-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
        document.getElementById('page-size').addEventListener('change', function() {
            currentPageSize = parseInt(this.value);
            currentPage = 1;
            loadTableData();
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.dataset.tab;
                switchTab(tabName);
            });
        });

        async function loadTables() {
            const tablesView = document.getElementById('tables-view');
            
            try {
                const response = await fetch('/api/tables');
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                const tables = result.tables;
                
                if (tables.length === 0) {
                    tablesView.innerHTML = '<p class="text-center">No tables found in the database.</p>';
                    return;
                }
                
                const tablesHtml = \`
                    <div class="tables-grid">
                        \${tables.map(table => \`
                            <div class="table-card" onclick="showTableView('\${table.table_schema}', '\${table.table_name}')">
                                <h3>\${table.table_name}</h3>
                                <div class="table-meta">\${table.table_schema} • \${table.table_type}</div>
                                <div class="table-stats">
                                    <div class="stat">📊 \${table.row_count} rows</div>
                                    <div class="stat">📋 \${table.column_count} columns</div>
                                </div>
                                \${table.table_comment ? \`<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">\${table.table_comment}</p>\` : ''}
                            </div>
                        \`).join('')}
                    </div>
                \`;
                
                tablesView.innerHTML = tablesHtml;
                
            } catch (error) {
                console.error('Error loading tables:', error);
                tablesView.innerHTML = \`<div class="error">Error loading tables: \${error.message}</div>\`;
            }
        }

        function showTableView(schema, table) {
            currentSchema = schema;
            currentTable = table;
            currentPage = 1;
            
            document.getElementById('tables-view').style.display = 'none';
            document.getElementById('table-view').classList.add('active');
            document.getElementById('table-title').textContent = table;
            document.getElementById('table-info').textContent = \`Schema: \${schema}\`;
            
            // Load data and structure
            loadTableData();
            loadTableStructure();
        }

        function showTablesView() {
            document.getElementById('table-view').classList.remove('active');
            document.getElementById('tables-view').style.display = 'block';
            currentTable = null;
            currentSchema = null;
        }

        function switchTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabName + '-tab');
            });
        }

        async function loadTableData() {
            const dataTable = document.querySelector('#data-tab .data-table');
            dataTable.innerHTML = '<div id="data-loading" class="loading"><div class="spinner"></div> Loading data...</div>';
            
            try {
                const params = new URLSearchParams({
                    page: currentPage,
                    limit: currentPageSize,
                    sort: currentSort,
                    order: currentOrder,
                    search: currentSearch,
                    searchColumn: currentSearchColumn
                });
                
                const response = await fetch(\`/api/table/\${currentSchema}/\${currentTable}/data?\${params}\`);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                renderTableData(result.data, result.pagination);
                
            } catch (error) {
                console.error('Error loading table data:', error);
                dataTable.innerHTML = \`<div class="error">Error loading data: \${error.message}</div>\`;
            }
        }

        async function loadTableStructure() {
            const structureTable = document.querySelector('#structure-tab .structure-table');
            structureTable.innerHTML = '<div id="structure-loading" class="loading"><div class="spinner"></div> Loading structure...</div>';
            
            try {
                const response = await fetch(\`/api/table/\${currentSchema}/\${currentTable}/structure\`);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                currentTableColumns = result.columns; // Store for use in modal
                renderTableStructure(result.columns);
                updateSearchColumns(result.columns);
                
            } catch (error) {
                console.error('Error loading table structure:', error);
                structureTable.innerHTML = \`<div class="error">Error loading structure: \${error.message}</div>\`;
            }
        }

        function renderTableData(data, pagination) {
            if (data.length === 0) {
                document.querySelector('#data-tab .data-table').innerHTML = '<p class="loading">No data found.</p>';
                return;
            }
            
            // Store data in cache for modal access
            tableDataCache = {};
            data.forEach((row, rowIndex) => {
                Object.keys(row).forEach(col => {
                    tableDataCache[\`\${rowIndex}_\${col}\`] = row[col];
                });
            });
            
            const columns = Object.keys(data[0]);
            
            const tableHtml = \`
                <div style="padding: 0.75rem 1rem; background: #f8fafc; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; color: #6b7280;">
                    📊 Showing \${columns.length} columns • \${data.length} rows on this page
                </div>
                <table>
                    <thead>
                        <tr>
                            \${columns.map(col => \`
                                <th onclick="sortBy('\${col}')" style="cursor: pointer;">
                                    \${col}
                                    \${currentSort === col ? (currentOrder === 'ASC' ? ' ↑' : ' ↓') : ''}
                                </th>
                            \`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        \${data.map((row, rowIndex) => \`
                            <tr>
                                \${columns.map(col => {
                                    let value = row[col];
                                    let displayValue = value;
                                    let isExpandable = false;
                                    let cellClass = '';
                                    
                                    if (value === null) {
                                        displayValue = '<em style="color: #9ca3af;">NULL</em>';
                                        cellClass = 'null-field';
                                    } else if (typeof value === 'object') {
                                        displayValue = \`📄 \${Array.isArray(value) ? 'Array' : 'Object'} (\${Array.isArray(value) ? value.length + ' items' : Object.keys(value).length + ' keys'})\`;
                                        isExpandable = true;
                                        cellClass = 'expandable json-field';
                                    } else if (typeof value === 'string') {
                                        if (value.length > 50) {
                                            displayValue = value.substring(0, 50) + '...';
                                            isExpandable = true;
                                            cellClass = 'expandable long-text';
                                        } else if (value.length > 20) {
                                            cellClass = 'long-text';
                                        }
                                    }
                                    
                                    const columnInfo = currentTableColumns.find(c => c.column_name === col);
                                    const dataType = columnInfo ? columnInfo.data_type : 'Unknown';
                                    
                                    if (isExpandable) {
                                        return \`<td class="\${cellClass}" 
                                                   data-row="\${rowIndex}" 
                                                   data-column="\${col}" 
                                                   data-type="\${dataType}"
                                                   onclick="showModalFromData(this)"
                                                   title="Click to view full content">\${displayValue}</td>\`;
                                    } else {
                                        return \`<td class="\${cellClass}" 
                                                   title="\${String(value || '').replace(/"/g, '&quot;')}">\${displayValue}</td>\`;
                                    }
                                }).join('')}
                            </tr>
                        \`).join('')}
                    </tbody>
                </table>
                <div class="pagination">
                    <div class="pagination-info">
                        Showing \${((pagination.page - 1) * pagination.limit) + 1} to \${Math.min(pagination.page * pagination.limit, pagination.total)} of \${pagination.total} entries
                    </div>
                    <div class="pagination-controls">
                        <button class="pagination-btn" onclick="changePage(1)" \${!pagination.hasPrev ? 'disabled' : ''}>First</button>
                        <button class="pagination-btn" onclick="changePage(\${pagination.page - 1})" \${!pagination.hasPrev ? 'disabled' : ''}>Previous</button>
                        
                        \${generatePageNumbers(pagination).map(page => 
                            typeof page === 'number' 
                                ? \`<button class="pagination-btn \${page === pagination.page ? 'active' : ''}" onclick="changePage(\${page})">\${page}</button>\`
                                : \`<span class="pagination-btn">...</span>\`
                        ).join('')}
                        
                        <button class="pagination-btn" onclick="changePage(\${pagination.page + 1})" \${!pagination.hasNext ? 'disabled' : ''}>Next</button>
                        <button class="pagination-btn" onclick="changePage(\${pagination.totalPages})" \${!pagination.hasNext ? 'disabled' : ''}>Last</button>
                    </div>
                </div>
            \`;
            
            const tableElement = document.querySelector('#data-tab .data-table');
            tableElement.innerHTML = tableHtml;
            
            // Add scrollable indicator if table has many columns
            if (columns.length > 6) {
                tableElement.classList.add('scrollable');
                
                // Remove indicator after user scrolls
                const table = tableElement.querySelector('table');
                const scrollHandler = () => {
                    if (tableElement.scrollLeft > 0) {
                        tableElement.classList.remove('scrollable');
                        tableElement.removeEventListener('scroll', scrollHandler);
                    }
                };
                tableElement.addEventListener('scroll', scrollHandler);
                
                // Auto-remove after 3 seconds
                setTimeout(() => {
                    tableElement.classList.remove('scrollable');
                }, 3000);
            }
        }

        function renderTableStructure(columns) {
            const structureHtml = \`
                <table>
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Default</th>
                            <th>Constraints</th>
                        </tr>
                    </thead>
                    <tbody>
                        \${columns.map(col => \`
                            <tr>
                                <td><strong>\${col.column_name}</strong></td>
                                <td>\${col.data_type}\${col.character_maximum_length ? \`(\${col.character_maximum_length})\` : ''}</td>
                                <td>\${col.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                                <td>\${col.column_default || '-'}</td>
                                <td>\${col.constraints ? \`<span class="constraint-badge">\${col.constraints}</span>\` : '-'}</td>
                            </tr>
                        \`).join('')}
                    </tbody>
                </table>
            \`;
            
            document.querySelector('#structure-tab .structure-table').innerHTML = structureHtml;
        }

        function updateSearchColumns(columns) {
            const searchColumn = document.getElementById('search-column');
            searchColumn.innerHTML = '<option value="">Search in all columns</option>' +
                columns.map(col => \`<option value="\${col.column_name}">\${col.column_name}</option>\`).join('');
        }

        function generatePageNumbers(pagination) {
            const pages = [];
            const current = pagination.page;
            const total = pagination.totalPages;
            
            if (total <= 7) {
                for (let i = 1; i <= total; i++) {
                    pages.push(i);
                }
            } else {
                if (current <= 4) {
                    for (let i = 1; i <= 5; i++) pages.push(i);
                    pages.push('...');
                    pages.push(total);
                } else if (current >= total - 3) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = total - 4; i <= total; i++) pages.push(i);
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
                    pages.push('...');
                    pages.push(total);
                }
            }
            
            return pages;
        }

        function sortBy(column) {
            if (currentSort === column) {
                currentOrder = currentOrder === 'ASC' ? 'DESC' : 'ASC';
            } else {
                currentSort = column;
                currentOrder = 'ASC';
            }
            currentPage = 1;
            loadTableData();
        }

        function changePage(page) {
            currentPage = page;
            loadTableData();
        }

        function performSearch() {
            currentSearch = document.getElementById('search-input').value;
            currentSearchColumn = document.getElementById('search-column').value;
            currentPage = 1;
            loadTableData();
        }
    </script>
</body>
</html>
  `);
});

// Start server
async function startServer() {
  console.log("🗄️ Database Viewer Starting...");
  console.log("═".repeat(50));

  // Test database connection
  const isConnected = await testConnection();
  if (!isConnected) {
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Database Viewer is running!`);
    console.log(`📋 Open your browser and go to: http://localhost:${PORT}`);
    console.log(`\n✨ Features:`);
    console.log(`   • Browse all database tables`);
    console.log(`   • View table structure and constraints`);
    console.log(`   • Paginated data viewing`);
    console.log(`   • Search and sort functionality`);
    console.log(`   • Responsive web interface`);
    console.log(`\n📊 Press Ctrl+C to stop the server`);
    console.log("═".repeat(50));
  });
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n\n👋 Database Viewer stopped!");
  process.exit(0);
});

// Start the server if this script is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error("💥 Failed to start Database Viewer:", error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
