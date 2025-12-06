"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Avatar,
  Chip,
  Typography,
  Button,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControlLabel,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import DataGrid from "@/components/admin/DataGrid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  fetchCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from "./actions";

export default function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [editingChar, setEditingChar] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    description: "",
    avatar_url: "",
    personality: "",
    scenario: "",
    greeting: "",
    book_name: "",
    tags: "",
    is_active: true,
  });

  // Feedback State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const loadCharacters = async () => {
    setLoading(true);
    const res = await fetchCharacters();
    if (res.success) setCharacters(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  // Handlers
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const handleOpen = (char = null) => {
    if (char) {
      setEditingChar(char);
      setFormData({
        name: char.name || "",
        title: char.title || "",
        description: char.description || "",
        avatar_url: char.avatar_url || "",
        personality: char.personality || "",
        scenario: char.scenario || "",
        greeting: char.greeting || "",
        book_name: char.book_name || "",
        tags: Array.isArray(char.tags) ? char.tags.join(", ") : "",
        is_active: char.is_active,
      });
    } else {
      setEditingChar(null);
      setFormData({
        name: "",
        title: "",
        description: "",
        avatar_url: "",
        personality: "",
        scenario: "",
        greeting: "",
        book_name: "",
        tags: "",
        is_active: true,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingChar(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.title)
      return showSnackbar("Name and Title are required", "error");

    // Prepare payload
    const payload = {
      ...formData,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    let res;
    if (editingChar) {
      res = await updateCharacter(editingChar.id, payload);
    } else {
      res = await createCharacter(payload);
    }

    if (res.success) {
      handleClose();
      loadCharacters();
      showSnackbar(
        editingChar
          ? "Character updated successfully"
          : "Character created successfully"
      );
    } else {
      showSnackbar("Error: " + res.error, "error");
    }
  };

  const handleDelete = async (id) => {
    if (
      confirm(
        "Are you sure you want to delete this character? This action cannot be undone."
      )
    ) {
      const res = await deleteCharacter(id);
      if (res.success) {
        loadCharacters();
        showSnackbar("Character deleted successfully");
      } else {
        showSnackbar("Error: " + res.error, "error");
      }
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const res = await updateCharacter(id, { is_active: !currentStatus });
    if (res.success) {
      // Refresh to ensure sync
      loadCharacters();
      showSnackbar(`Character ${!currentStatus ? "activated" : "deactivated"}`);
    } else {
      showSnackbar("Failed to update status", "error");
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const columns = [
    {
      id: "avatar_url",
      label: "Avatar",
      width: 80,
      format: (val) => (
        <Avatar src={val} variant="rounded" sx={{ width: 40, height: 40 }} />
      ),
    },
    {
      id: "name",
      label: "Name",
      minWidth: 150,
      format: (val) => <Typography fontWeight="bold">{val}</Typography>,
    },
    { id: "title", label: "Title", minWidth: 150 },
    {
      id: "is_active",
      label: "Status",
      minWidth: 100,
      format: (val, row) => (
        <Switch
          checked={!!val}
          onChange={() => handleToggleStatus(row.id, val)}
          color="success"
          size="small"
        />
      ),
    },
    {
      id: "description",
      label: "Description",
      minWidth: 200,
      format: (val) => (
        <Typography
          variant="caption"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "text.secondary",
          }}
        >
          {val}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      align: "right",
      minWidth: 120,
      format: (_, row) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpen(row)} color="info">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row.id)}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" fontWeight="bold">
          AI Characters
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ textTransform: "none" }}
        >
          Add Character
        </Button>
      </Box>

      <DataGrid
        title="Managed Characters"
        columns={columns}
        rows={characters}
        loading={loading}
        rowCount={characters.length}
        page={0}
        pageSize={100}
        searchPlaceholder="Search characters..."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingChar ? "Edit Character" : "New Character"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Box display="flex" gap={2}>
              <TextField
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                required
              />
            </Box>

            <TextField
              label="Avatar URL"
              name="avatar_url"
              value={formData.avatar_url}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Description (Short)"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />

            <Divider textAlign="left">Personality & Behavior</Divider>

            <TextField
              label="Personality"
              name="personality"
              value={formData.personality}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4}
              helperText="Define traits, style, and behavior"
            />

            <TextField
              label="Scenario"
              name="scenario"
              value={formData.scenario}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              helperText="Current context or situation"
            />

            <TextField
              label="First Message Greeting"
              name="greeting"
              value={formData.greeting}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />

            <Box display="flex" gap={2}>
              <TextField
                label="Source/Book Name"
                name="book_name"
                value={formData.book_name}
                onChange={handleChange}
                fullWidth
                size="small"
              />
              <TextField
                label="Tags (comma separated)"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                fullWidth
                size="small"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  name="is_active"
                  onChange={handleChange}
                />
              }
              label="Active Status"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingChar ? "Update Character" : "Create Character"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
