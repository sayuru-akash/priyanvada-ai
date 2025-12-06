"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DataGrid from "@/components/admin/DataGrid";
import { fetchLeads } from "./actions";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("submitted_at");
  const [order, setOrder] = useState("desc");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetchLeads({
      search,
      orderBy,
      order,
      page,
      limit: pageSize,
    });

    if (res.success) {
      setLeads(res.data);
      setTotal(res.total);
    }
    setLoading(false);
  }, [search, orderBy, order, page, pageSize]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadLeads();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadLeads]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0); // Reset pagenation on search
  };

  const columns = [
    {
      id: "submission_count",
      label: "Count",
      minWidth: 80,
      format: (val) => (
        <Chip label={val} size="small" variant="outlined" color="primary" />
      ),
    },
    {
      id: "user_name",
      label: "Name",
      minWidth: 150,
      format: (val) => (
        <Typography fontWeight="bold">{val || "Anonymous"}</Typography>
      ),
    },
    { id: "user_email", label: "Email", minWidth: 200 },
    {
      id: "interested_in_paid_plan",
      label: "Interest",
      minWidth: 100,
      format: (val) =>
        val ? (
          <Chip label="Yes" color="success" size="small" />
        ) : (
          <Chip label="No" color="default" size="small" />
        ),
    },
    { id: "budget_range", label: "Budget (Latest)", minWidth: 150 },
    { id: "current_usage_frequency", label: "Usage", minWidth: 150 },
    {
      id: "submitted_at",
      label: "Latest Submission",
      minWidth: 200,
      format: (val) =>
        new Date(val).toLocaleDateString() +
        " " +
        new Date(val).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  const renderDetail = (row) => (
    <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.02)", borderRadius: 1 }}>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ color: "text.secondary", mb: 1 }}
      >
        Submission History ({row.submission_count})
      </Typography>
      <Table
        size="small"
        sx={{
          "& th": { borderBottom: "1px solid rgba(81, 81, 81, 1)" },
          "& td": {
            borderBottom: "1px solid rgba(81, 81, 81, 0.5)",
            color: "text.secondary",
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Budget</TableCell>
            <TableCell>Usage</TableCell>
            <TableCell>Interested</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {row.history.map((h) => (
            <TableRow key={h.id}>
              <TableCell>{new Date(h.submitted_at).toLocaleString()}</TableCell>
              <TableCell>{h.budget_range}</TableCell>
              <TableCell>{h.current_usage_frequency}</TableCell>
              <TableCell>{h.interested_in_paid_plan ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" fontWeight="bold">
          Paid Plan Leads
        </Typography>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search leads..."
          variant="outlined"
          size="small"
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300, backgroundColor: "background.paper" }}
        />
      </Box>

      <DataGrid
        title={`Leads (Unique Emails: ${total})`}
        columns={columns}
        rows={leads}
        loading={loading}
        rowCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        orderBy={orderBy}
        order={order}
        onSortChange={handleRequestSort}
        renderDetail={renderDetail}
      />
    </Box>
  );
}
