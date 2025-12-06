"use client";

import { useState, Fragment } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Typography,
  TableSortLabel,
  Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

function DataGridRow({ row, columns, renderDetail }) {
  const [open, setOpen] = useState(false);

  if (!renderDetail) {
    return (
      <TableRow hover role="checkbox" tabIndex={-1}>
        {columns.map((column) => {
          const value = row[column.id];
          return (
            <TableCell key={column.id} align={column.align}>
              {column.format ? column.format(value, row) : value}
            </TableCell>
          );
        })}
      </TableRow>
    );
  }

  return (
    <Fragment>
      <TableRow
        hover
        role="checkbox"
        tabIndex={-1}
        sx={{ "& > *": { borderBottom: "unset" } }}
      >
        <TableCell padding="checkbox">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        {columns.map((column) => {
          const value = row[column.id];
          return (
            <TableCell key={column.id} align={column.align}>
              {column.format ? column.format(value, row) : value}
            </TableCell>
          );
        })}
      </TableRow>
      <TableRow>
        <TableCell
          style={{ paddingBottom: 0, paddingTop: 0 }}
          colSpan={columns.length + 1}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>{renderDetail(row)}</Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}

export default function DataGrid({
  columns,
  rows,
  loading = false,
  rowCount = 0,
  page = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onSearch,
  searchPlaceholder = "Search...",
  title,
  actions,
  orderBy,
  order,
  onSortChange,
  renderDetail,
  disablePagination,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const createSortHandler = (property) => (event) => {
    if (onSortChange) {
      onSortChange(property);
    }
  };

  return (
    <Paper sx={{ width: "100%", mb: 2, overflow: "hidden" }}>
      {/* Header Toolbar */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #333",
        }}
      >
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          {onSearch && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
          )}
          {actions}
        </Box>
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {renderDetail && <TableCell padding="checkbox" />}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth, width: column.width }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : "asc"}
                      onClick={createSortHandler(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderDetail ? 1 : 0)}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderDetail ? 1 : 0)}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography color="text.secondary">
                    No records found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <DataGridRow
                  key={row.id || index}
                  row={row}
                  columns={columns}
                  renderDetail={renderDetail}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!disablePagination && onPageChange && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={rowCount}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={(e, newPage) => onPageChange(newPage)}
          onRowsPerPageChange={(e) =>
            onPageSizeChange && onPageSizeChange(parseInt(e.target.value, 10))
          }
        />
      )}
    </Paper>
  );
}
