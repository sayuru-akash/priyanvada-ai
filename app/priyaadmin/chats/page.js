"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Chip,
  Button,
  Typography,
  Avatar,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
} from "@mui/material";
import DataGrid from "@/components/admin/DataGrid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Link from "next/link";
import { fetchChats } from "./actions";
import { fetchCharacters } from "../characters/actions";

export default function ChatsPage() {
  const [chats, setChats] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters State
  const [filters, setFilters] = useState({
    characterId: "",
    userSearch: "",
    hasImages: false,
  });

  // Sorting State
  const [orderBy, setOrderBy] = useState("updated_at");
  const [order, setOrder] = useState("desc");

  // Load Characters on Mount
  useEffect(() => {
    fetchCharacters().then((res) => {
      if (res.success) setCharacters(res.data);
    });
  }, []);

  // Load Chats with filters and sorting
  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      try {
        const offset = page * 10;
        const { data, count } = await fetchChats(offset, 10, filters, {
          orderBy,
          order,
        });
        setChats(data || []);
        setTotal(count || 0);
      } finally {
        setLoading(false);
      }
    };

    // Debounce user search slightly to avoid excessive calls
    const timeoutId = setTimeout(() => {
      loadChats();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [page, filters, orderBy, order]);

  // Handlers
  const handleSortChange = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page on filter change
  };

  const resetFilters = () => {
    setFilters({ characterId: "", userSearch: "", hasImages: false });
    setPage(0);
  };

  const columns = [
    {
      id: "character_avatar",
      label: "Character",
      width: 60,
      format: (val, row) => (
        <Avatar src={val || row.character_avatar} alt={row.character_name}>
          <SmartToyIcon />
        </Avatar>
      ),
    },
    { id: "character_name", label: "Name", minWidth: 150 },
    {
      id: "user_email",
      label: "User",
      minWidth: 200,
      format: (val, row) => (
        <Box>
          <Typography variant="body2">{val || "Unknown User"}</Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {row.user_id?.substring(0, 8)}...
          </Typography>
        </Box>
      ),
    },
    {
      id: "message_count",
      label: "Msgs",
      minWidth: 80,
      sortable: true,
      format: (val) => (
        <Chip label={val || 0} size="small" variant="outlined" />
      ),
    },
    {
      id: "images_count",
      label: "Images",
      minWidth: 80,
      sortable: true,
      format: (val) => (
        <Chip
          label={val || 0}
          size="small"
          color={val > 0 ? "secondary" : "default"}
        />
      ),
    },
    {
      id: "updated_at",
      label: "Last Active",
      minWidth: 150,
      sortable: true,
      format: (value) => new Date(value).toLocaleString(),
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
          href={`/priyaadmin/chats/${row.id}`}
          variant="contained"
          color="primary"
          sx={{ textTransform: "none" }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      {/* Filters Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
        >
          {/* Search User */}
          <TextField
            size="small"
            label="Search User"
            placeholder="Email or Name..."
            value={filters.userSearch}
            onChange={(e) => handleFilterChange("userSearch", e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: { xs: "100%", md: 200 } }}
          />

          {/* Filter Character */}
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 200 } }}>
            <InputLabel>Filter Character</InputLabel>
            <Select
              value={filters.characterId}
              label="Filter Character"
              onChange={(e) =>
                handleFilterChange("characterId", e.target.value)
              }
            >
              <MenuItem value="">
                <em>All Characters</em>
              </MenuItem>
              {characters.map((char) => (
                <MenuItem key={char.id} value={char.id}>
                  {char.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Has Images */}
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.hasImages}
                onChange={(e) =>
                  handleFilterChange("hasImages", e.target.checked)
                }
              />
            }
            label="Has Images"
            sx={{ whiteSpace: "nowrap" }}
          />

          {/* Clear Button */}
          {(filters.characterId || filters.userSearch || filters.hasImages) && (
            <Button
              startIcon={<ClearIcon />}
              onClick={resetFilters}
              color="inherit"
            >
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      <DataGrid
        title="Chat Sessions"
        columns={columns}
        rows={chats}
        loading={loading}
        rowCount={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        // Sorting
        orderBy={orderBy}
        order={order}
        onSortChange={handleSortChange}
        // Remove old search prop if unused or keep it empty
        searchPlaceholder=""
      />
    </Box>
  );
}
