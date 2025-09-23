"use client";

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import {
  Person as PersonIcon,
  Add as AddIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  Psychology as PsychologyIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { useState } from "react";
import Image from "next/image";

export default function CharacterCreator({
  onCharacterCreated,
  onCharacterUpdated,
  onClose,
  user,
  character,
}) {
  const isEditing = Boolean(character);
  const initialData = character
    ? {
        name: character.name || "",
        title: character.title || "",
        description: character.description || "",
        personality: character.personality || "",
        scenario: character.scenario || "",
        greeting: character.greeting || "",
        exampleMessages:
          character.example_messages || character.exampleMessages || [],
        tags: character.tags || [],
        avatarUrl: character.avatar_url || character.avatarUrl || "",
        isPublic:
          character.is_public !== undefined
            ? character.is_public
            : character.isPublic ?? true,
      }
    : {
        name: "",
        title: "",
        description: "",
        personality: "",
        scenario: "",
        greeting: "",
        exampleMessages: [],
        tags: [],
        avatarUrl: "",
        isPublic: true,
      };
  const [currentStep, setCurrentStep] = useState(0);
  const [characterData, setCharacterData] = useState(initialData);
  const [newExampleMessage, setNewExampleMessage] = useState("");
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData.avatarUrl || "");

  const steps = ["Basic Info", "Personality", "Examples", "Finish"];

  const handleInputChange = (field, value) => {
    setCharacterData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      setImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        handleInputChange("avatarUrl", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    handleInputChange("avatarUrl", "");
  };

  const addExampleMessage = () => {
    if (newExampleMessage.trim()) {
      setCharacterData((prev) => ({
        ...prev,
        exampleMessages: [...prev.exampleMessages, newExampleMessage.trim()],
      }));
      setNewExampleMessage("");
    }
  };

  const removeExampleMessage = (index) => {
    setCharacterData((prev) => ({
      ...prev,
      exampleMessages: prev.exampleMessages.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !characterData.tags.includes(newTag.trim())) {
      setCharacterData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setCharacterData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/characters/${character.id}`
        : "/api/characters";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? characterData
        : { ...characterData, creatorId: user.id };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        if (isEditing) {
          onCharacterUpdated?.(result.character);
        } else {
          onCharacterCreated?.(result.character);
        }
        onClose();
      } else {
        console.error(
          `Failed to ${isEditing ? "update" : "create"} character:`,
          result.error
        );
      }
    } catch (error) {
      console.error(
        `${isEditing ? "Error updating" : "Error creating"} character:`,
        error
      );
    }
    setLoading(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return characterData.name.trim() && characterData.description.trim();
      case 1:
        return characterData.greeting.trim();
      case 2:
        return true; // Examples are optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    mx: "auto",
                    mb: 2,
                    bgcolor: "primary.main",
                  }}
                >
                  {imagePreview || characterData.avatarUrl ? (
                    <Image
                      src={imagePreview || characterData.avatarUrl}
                      alt="Character"
                      width={80}
                      height={80}
                      style={{
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    <PhotoIcon sx={{ fontSize: 32 }} />
                  )}
                </Avatar>
                {(imagePreview || characterData.avatarUrl) && (
                  <IconButton
                    size="small"
                    onClick={removeImage}
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bgcolor: "error.main",
                      color: "white",
                      "&:hover": { bgcolor: "error.dark" },
                      width: 24,
                      height: 24,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoIcon />}
                  size="small"
                >
                  Upload Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>

                <Typography variant="caption" color="text.secondary">
                  Or enter image URL below
                </Typography>

                <TextField
                  size="small"
                  placeholder="Avatar URL (optional)"
                  value={imagePreview ? "" : characterData.avatarUrl}
                  onChange={(e) => {
                    if (!imagePreview) {
                      handleInputChange("avatarUrl", e.target.value);
                    }
                  }}
                  disabled={!!imagePreview}
                  sx={{ maxWidth: 300 }}
                />
              </Box>
            </Box>

            <TextField
              autoFocus
              label="Character Name"
              placeholder="e.g., Sherlock Holmes"
              value={characterData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />

            <TextField
              label="Title (Optional)"
              placeholder="e.g., Detective Consultant"
              value={characterData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
            />

            <TextField
              label="Description"
              placeholder="Describe your character's background, appearance, and key traits..."
              multiline
              rows={4}
              value={characterData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              required
            />

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                size="small"
                label="Add Tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <Button onClick={addTag} variant="outlined">
                Add
              </Button>
            </Box>

            {characterData.tags.length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {characterData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => removeTag(tag)}
                    size="small"
                  />
                ))}
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Personality"
              placeholder="e.g., Analytical, observant, somewhat arrogant but brilliant..."
              multiline
              rows={3}
              value={characterData.personality}
              onChange={(e) => handleInputChange("personality", e.target.value)}
            />

            <TextField
              label="Scenario/Setting"
              placeholder="e.g., Victorian London, 221B Baker Street..."
              multiline
              rows={3}
              value={characterData.scenario}
              onChange={(e) => handleInputChange("scenario", e.target.value)}
            />

            <TextField
              label="Greeting Message"
              placeholder="The first message your character will send..."
              multiline
              rows={4}
              value={characterData.greeting}
              onChange={(e) => handleInputChange("greeting", e.target.value)}
              required
              helperText="This will be the first message users see when they start chatting"
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Example Messages (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Add example messages to help the AI understand how your character
              should respond
            </Typography>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                label="Example Message"
                value={newExampleMessage}
                onChange={(e) => setNewExampleMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addExampleMessage();
                  }
                }}
              />
              <Button onClick={addExampleMessage} variant="outlined">
                Add
              </Button>
            </Box>

            {characterData.exampleMessages.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {characterData.exampleMessages.map((message, index) => (
                  <Paper key={index} sx={{ p: 2, position: "relative" }}>
                    <Typography variant="body2">{message}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => removeExampleMessage(index)}
                      sx={{ position: "absolute", top: 4, right: 4 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              textAlign: "center",
            }}
          >
            <PsychologyIcon
              sx={{ fontSize: 64, color: "primary.main", mx: "auto" }}
            />
            <Typography variant="h5" gutterBottom>
              Character Preview
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar src={characterData.avatarUrl}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="h6">
                      {characterData.name}
                      {characterData.title && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          {" • "}
                          {characterData.title}
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {characterData.description.substring(0, 100)}...
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Greeting Message:
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                  &ldquo;{characterData.greeting}&rdquo;
                </Typography>
              </CardContent>
            </Card>

            <FormControlLabel
              control={
                <Switch
                  checked={characterData.isPublic}
                  onChange={(e) =>
                    handleInputChange("isPublic", e.target.checked)
                  }
                />
              }
              label="Make this character public"
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {isEditing ? "Edit Character" : "Create Character"}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {getStepContent(currentStep)}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleBack} disabled={currentStep === 0}>
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {currentStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !canProceed()}
            startIcon={<PersonIcon />}
          >
            {loading
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
              ? "Update Character"
              : "Create Character"}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!canProceed()}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
