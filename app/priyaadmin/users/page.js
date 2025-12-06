"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Avatar,
  Chip,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Badge,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DataGrid from "@/components/admin/DataGrid";
import { createClient } from "@supabase/supabase-js";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Link from "next/link";
import UserExportDialog from "@/components/admin/UserExportDialog";

// NOTE: In a real production app with RLS, we should use a server component or a route handler
// to fetch users if the service role key is needed.
// Since we are in 'use client', we can't use the service role key directly here security-wise if this was public.
// However, this is an ADMIN panel. But still, exposing service key in client bundle is bad.
// Solution: We will fetch data via a Server Action or Route Handler.
// For now, let's create a server action in a separate file to fetch users securely.

import { fetchUsers } from "./actions";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("created_at");
  const [order, setOrder] = useState("desc");

  // Filters
  const [hasImages, setHasImages] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Export
  const [exportOpen, setExportOpen] = useState(false);

  const loadUsers = async (
    searchTerm = "",
    newPage = 0,
    sort = orderBy,
    sortOrder = order,
    filters = { hasImages }
  ) => {
    setLoading(true);
    try {
      // Offset-based pagination
      const offset = newPage * 10;
      const { data, count } = await fetchUsers(
        offset,
        10,
        searchTerm,
        sort,
        sortOrder,
        filters
      );
      setUsers(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(search, page, orderBy, order, { hasImages });
  }, [page, search, orderBy, order, hasImages]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(0);
    // loadUsers called by effect
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Filter Handlers
  const handleFilterClick = (event) => setAnchorEl(event.currentTarget);
  const handleFilterClose = () => setAnchorEl(null);

  const activeFiltersCount = hasImages ? 1 : 0;

  const renderActions = () => (
    <>
      <Button
        startIcon={<FileDownloadIcon />}
        variant="outlined"
        onClick={() => setExportOpen(true)}
      >
        Export
      </Button>
      <IconButton onClick={handleFilterClick}>
        <Badge badgeContent={activeFiltersCount} color="primary">
          <FilterListIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasImages}
                onChange={(e) => {
                  setHasImages(e.target.checked);
                  setPage(0);
                }}
              />
            }
            label="Has Images"
          />
        </MenuItem>
      </Menu>
    </>
  );

  const columns = [
    {
      id: "avatar_url",
      label: "Avatar",
      width: 60,
      format: (value, row) => (
        <Avatar src={value} sx={{ width: 32, height: 32 }}>
          {(row.full_name || row.username || row.email || "?")[0].toUpperCase()}
        </Avatar>
      ),
    },
    {
      id: "email",
      label: "User",
      minWidth: 200,
      sortable: true,
      format: (value, row) => (
        <Box>
          <Typography variant="body2">{value}</Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              {row.full_name || row.username || "Guest"}
            </Typography>
            {row.has_images && (
              <Typography variant="caption" title="Has Images">
                🖼️
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: "total_chats",
      label: "Chats",
      minWidth: 80,
      sortable: true,
      align: "center",
      format: (val) => (
        <Chip label={val || 0} size="small" variant="outlined" />
      ),
    },
    {
      id: "total_messages",
      label: "Msgs",
      minWidth: 80,
      sortable: true,
      align: "center",
      format: (val) => (
        <Chip
          label={val || 0}
          size="small"
          color={val > 0 ? "primary" : "default"}
        />
      ),
    },
    {
      id: "has_images",
      label: "Media",
      minWidth: 80,
      sortable: true,
      align: "center",
      format: (val, row) =>
        row.image_count > 0 ? (
          <Chip
            label={`${row.image_count} Imgs`}
            size="small"
            color="secondary"
          />
        ) : (
          "-"
        ),
    },
    {
      id: "created_at",
      label: "Joined",
      minWidth: 100,
      sortable: true,
      format: (value) => new Date(value).toLocaleDateString(),
    },
    {
      id: "actions",
      label: "Actions",
      align: "right",
      format: (_, row) => (
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          component={Link}
          href={`/priyaadmin/users/${row.id}`}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <DataGrid
        title="Users Management"
        columns={columns}
        rows={users}
        loading={loading}
        rowCount={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search by email, name..."
        orderBy={orderBy}
        order={order}
        onSortChange={handleRequestSort}
        actions={renderActions()}
      />
      <UserExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </Box>
  );
}
