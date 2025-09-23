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
} from "@mui/material";
import {
  Person as PersonIcon,
  Chat as ChatIcon,
  Rocket as RocketIcon,
} from "@mui/icons-material";
import { useState } from "react";

const steps = ["Enter Your Details", "Setup Complete", "Start Chatting"];

export default function UserSetup({ onUserSetup }) {
  const [activeStep, setActiveStep] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!username.trim()) {
        return;
      }

      setLoading(true);
      try {
        await onUserSetup({
          username: username.trim(),
          email: email.trim() || null,
        });
        setActiveStep(1);
        setTimeout(() => setActiveStep(2), 1500);
      } catch (error) {
        console.error("Setup failed:", error);
      }
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleNext();
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Fade in timeout={500}>
            <Card sx={{ maxWidth: 400, mx: "auto" }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: "center", mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: "primary.main",
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="h5" gutterBottom>
                    Welcome to AI Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Let&apos;s get you set up with your personal AI assistant
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <TextField
                    autoFocus
                    fullWidth
                    label="Username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    error={!username.trim() && username !== ""}
                    helperText={
                      !username.trim() && username !== ""
                        ? "Username is required"
                        : ""
                    }
                  />

                  <TextField
                    fullWidth
                    label="Email (Optional)"
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleNext}
                    disabled={!username.trim() || loading}
                    sx={{ mt: 2 }}
                  >
                    {loading ? "Setting up..." : "Get Started"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Fade>
        );

      case 1:
        return (
          <Fade in timeout={500}>
            <Card sx={{ maxWidth: 400, mx: "auto", textAlign: "center" }}>
              <CardContent sx={{ p: 4 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: "success.main",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <ChatIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  All Set!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your account has been created successfully. Preparing your
                  chat interface...
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        );

      case 2:
        return (
          <Fade in timeout={500}>
            <Card sx={{ maxWidth: 400, mx: "auto", textAlign: "center" }}>
              <CardContent sx={{ p: 4 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: "secondary.main",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <RocketIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  Ready to Chat!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Welcome to your AI assistant. You can now start chatting!
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            component="h1"
            textAlign="center"
            gutterBottom
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            AI Chat Assistant
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Your intelligent conversation partner powered by Google AI
          </Typography>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {getStepContent(activeStep)}

        <Box sx={{ mt: 6, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Features: Multiple AI personalities • Chat history • Markdown
            support • Responsive design
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
