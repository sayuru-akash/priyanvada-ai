"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material";
import * as XLSX from "xlsx";
import { exportAllUsers } from "@/app/priyaadmin/users/actions";

const AVAILABLE_COLUMNS = [
  { id: "id", label: "User ID" },
  { id: "email", label: "Email" },
  { id: "full_name", label: "Full Name" },
  { id: "created_at", label: "Joined Date" },
  { id: "last_sign_in_at", label: "Last Login" },
  { id: "total_chats", label: "Total Chats" },
  { id: "total_messages", label: "Total Messages" },
  { id: "image_count", label: "Total Images" },
  { id: "last_message_at", label: "Last Message" },
];

export default function ExportUsersDialog({ open, onClose }) {
  const [selectedColumns, setSelectedColumns] = useState(
    AVAILABLE_COLUMNS.map((c) => c.id)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggleColumn = (id) => {
    if (selectedColumns.includes(id)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== id));
    } else {
      setSelectedColumns([...selectedColumns, id]);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedColumns(AVAILABLE_COLUMNS.map((c) => c.id));
    } else {
      setSelectedColumns([]);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exportAllUsers();
      if (!res.success) throw new Error(res.error || "Failed to fetch data");

      const data = res.data;

      // Filter Data by Selected Columns
      const exportData = data.map((user) => {
        const row = {};
        selectedColumns.forEach((colId) => {
          const colDef = AVAILABLE_COLUMNS.find((c) => c.id === colId);
          if (colDef) {
            row[colDef.label] = user[colId];
          }
        });
        return row;
      });

      // Create Sheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-width
      const wscols = selectedColumns.map((colId) => ({ wch: 20 })); // Simple fixed width or calc max
      worksheet["!cols"] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      // Download
      XLSX.writeFile(
        workbook,
        `Priyanvada_Users_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Export Users</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select columns to include in the Excel export.
        </Typography>

        <Box mb={2}>
          <FormControlLabel
            label="Select All"
            control={
              <Checkbox
                checked={selectedColumns.length === AVAILABLE_COLUMNS.length}
                indeterminate={
                  selectedColumns.length > 0 &&
                  selectedColumns.length < AVAILABLE_COLUMNS.length
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            }
          />
        </Box>

        <FormGroup
          sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
        >
          {AVAILABLE_COLUMNS.map((col) => (
            <FormControlLabel
              key={col.id}
              control={
                <Checkbox
                  checked={selectedColumns.includes(col.id)}
                  onChange={() => handleToggleColumn(col.id)}
                />
              }
              label={col.label}
            />
          ))}
        </FormGroup>

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            Error: {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading || selectedColumns.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : "Export Excel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
