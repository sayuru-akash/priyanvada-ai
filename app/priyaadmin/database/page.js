"use client";

import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import DataGrid from "@/components/admin/DataGrid";
import { fetchTables, fetchTableData } from "./actions";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";

export default function DatabasePage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Load list of tables on mount
    fetchTables().then((res) => {
      if (res.success) {
        setTables(res.tables);
        if (res.tables.length > 0) {
          setSelectedTable(res.tables[0].table_name);
        }
      }
    });
  }, []);

  useEffect(() => {
    const loadTableData = async () => {
      setLoading(true);
      try {
        const offset = page * 10;
        const res = await fetchTableData(selectedTable, offset, 10);
        if (res.success) {
          setTableData(res.data);
          setTotal(res.total);
        }
      } finally {
        setLoading(false);
      }
    };

    if (selectedTable) {
      loadTableData();
    }
  }, [selectedTable, page]);

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
    setPage(0); // Reset to first page
  };

  // Dynamically generate columns based on first row of data
  const columns =
    tableData.length > 0
      ? Object.keys(tableData[0]).map((key) => ({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          minWidth: 100,
          format: (value) => {
            if (value === null)
              return (
                <Typography
                  variant="caption"
                  sx={{ fontStyle: "italic", color: "text.disabled" }}
                >
                  null
                </Typography>
              );
            if (typeof value === "object")
              return (
                JSON.stringify(value).substring(0, 50) +
                (JSON.stringify(value).length > 50 ? "..." : "")
              );
            if (key.includes("time") || key.includes("date"))
              return new Date(value).toLocaleString();
            return (
              String(value).substring(0, 50) +
              (String(value).length > 50 ? "..." : "")
            );
          },
        }))
      : [];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Database Viewer
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Select Table</InputLabel>
          <Select
            value={selectedTable}
            label="Select Table"
            onChange={handleTableChange}
          >
            {tables.map((t) => (
              <MenuItem key={t.table_name} value={t.table_name}>
                {t.table_name}{" "}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  ({t.row_count} rows)
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {selectedTable && (
        <DataGrid
          title={`Table: ${selectedTable}`}
          columns={columns}
          rows={tableData}
          loading={loading}
          rowCount={total}
          page={page}
          pageSize={10}
          onPageChange={setPage}
          // No search implemented for generic viewer yet
        />
      )}
    </Box>
  );
}
