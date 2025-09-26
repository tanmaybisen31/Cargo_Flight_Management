import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Paper,
  Avatar,
  IconButton,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from "@mui/icons-material";
import Groq from "groq-sdk";
import type { RecommendationOption, CargoRecommendation } from "../api/types";
import { getRAGContext } from "../api/ragService";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface OptionAIAssistantProps {
  open: boolean;
  onClose: () => void;
  option: RecommendationOption;
  cargoRecommendation: CargoRecommendation;
}

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const optionTypeLabels = {
  charter_flight: "Charter Flight",
  alternative_routing: "Alternative Routing",
  capacity_upgrade: "Capacity Upgrade",
  delay_acceptance: "Accept Delay",
  partial_shipment: "Partial Shipment",
  customer_negotiation: "Customer Negotiation"
};

const optionTypeIcons = {
  charter_flight: <TrendingUpIcon />,
  alternative_routing: <TrendingUpIcon />,
  capacity_upgrade: <TrendingUpIcon />,
  delay_acceptance: <ScheduleIcon />,
  partial_shipment: <CheckCircleIcon />,
  customer_negotiation: <WarningIcon />
};

export function OptionAIAssistant({ open, onClose, option, cargoRecommendation }: OptionAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check API key configuration
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      setApiKeyError("Groq API key not configured. Please add your API key to the .env file.");
      setMessages([
        {
          id: "setup-error",
          content: "⚠️ AI Assistant Setup Required\n\nTo use the AI assistant, you need to:\n1. Get your API key from https://console.groq.com/\n2. Update the VITE_GROQ_API_KEY in frontend/.env file\n3. Restart the development server\n\nOnce configured, I can help you understand the calculation details and implementation specifics for this recommendation option.",
          sender: "bot",
          timestamp: new Date()
        }
      ]);
    } else {
      setApiKeyError(null);
      setMessages([
        {
          id: "welcome",
          content: `Hello! I'm your AI assistant for this ${optionTypeLabels[option.type as keyof typeof optionTypeLabels]} option. I can help you understand how this solution works, why it's feasible, and answer any questions about the implementation details. What would you like to know about this option?`,
          sender: "bot",
          timestamp: new Date()
        }
      ]);
    }
  }, [option.type]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateContextualPrompt = (userMessage: string) => {
    const ragContext = getRAGContext(option);

    const context = {
      optionType: option.type,
      optionDescription: option.description,
      feasibility: option.feasibility,
      cost: option.cost,
      recovery: option.recovery,
      timeHours: option.time_hours,
      risk: option.risk,
      impact: option.impact,
      actions: option.actions,
      cargoId: cargoRecommendation.cargo_id,
      cargoPriority: cargoRecommendation.priority,
      revenueAtRisk: cargoRecommendation.revenue_at_risk,
      denialReason: cargoRecommendation.denial_reason
    };

    return `You are an AI assistant specialized in explaining revenue recovery options for airline cargo management with deep knowledge of the calculation algorithms.

Current Option Context:
- Option Type: ${optionTypeLabels[option.type as keyof typeof optionTypeLabels]}
- Description: ${option.description}
- Feasibility Score: ${(option.feasibility * 100).toFixed(0)}%
- Implementation Cost: ₹${option.cost.toLocaleString('en-IN')}
- Expected Recovery: ₹${option.recovery.toLocaleString('en-IN')}
- Implementation Time: ${option.time_hours} hours
- Risk Level: ${option.risk}
- Impact: ${option.impact}
- Required Actions: ${option.actions.join(', ')}

Cargo Context:
- Cargo ID: ${cargoRecommendation.cargo_id}
- Priority: ${cargoRecommendation.priority}
- Revenue at Risk: ₹${cargoRecommendation.revenue_at_risk.toLocaleString('en-IN')}
- Denial Reason: ${cargoRecommendation.denial_reason}

CALCULATION CONTEXT (from backend algorithms):
${ragContext.calculation_snippets.map((snippet, index) => `Code Snippet ${index + 1}: ${snippet}`).join('\n')}

FEASIBILITY EXPLANATION:
${ragContext.feasibility_explanation}

COST BREAKDOWN:
${ragContext.cost_breakdown}

IMPLEMENTATION DETAILS:
${ragContext.implementation_details}

User Question: ${userMessage}

Please provide a detailed, professional response that:
1. Directly addresses the user's question using the specific calculation context provided
2. References the actual backend calculation code and algorithms when explaining feasibility
3. Explains the exact cost components and how they are calculated from the code
4. Details the implementation process based on the actual backend logic
5. Uses specific numbers, formulas, and thresholds from the calculation context
6. Explains the technical reasoning behind each calculation step
7. Provides actionable insights about implementation based on the code logic
8. Keeps responses under 300 words but comprehensive
9. Uses professional but accessible language
10. Focuses on helping the revenue manager understand the technical calculations

When explaining feasibility, reference the specific code formulas and thresholds.
When explaining costs, break down each component from the calculation logic.
When explaining implementation, detail the step-by-step process from the backend perspective.`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Check if API key is configured
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      setError("Please configure your Groq API key in the .env file first.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      console.log("Attempting to connect to Groq API...");
      console.log("API Key (first 10 chars):", apiKey.substring(0, 10) + "...");
      console.log("Model:", "llama-3.1-8b-instant");

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: generateContextualPrompt(inputMessage)
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 400
      });

      console.log("API Response received successfully");
      console.log("Response content:", completion.choices[0]?.message?.content?.substring(0, 100) + "...");

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      console.error("Groq API Error:", err);
      console.error("Error details:", {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });

      let errorMessage = "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";

      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.message.includes("API key") || err.message.includes("401") || err.message.includes("Unauthorized")) {
          errorMessage = "Invalid API key. Please check your Groq API key configuration.";
        } else if (err.message.includes("network") || err.message.includes("fetch") || err.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (err.message.includes("quota") || err.message.includes("rate limit") || err.message.includes("429")) {
          errorMessage = "API quota exceeded. Please try again later or check your usage limits.";
        } else if (err.message.includes("CORS") || err.message.includes("cors")) {
          errorMessage = "CORS error. This might be a browser security issue.";
        } else {
          errorMessage = `API Error: ${err.message}`;
        }
      }

      setError(errorMessage);

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        sender: "bot",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    `How did you calculate ${option.feasibility * 100}% feasibility using the backend algorithms?`,
    "What are the exact cost components from the calculation code and their formulas?",
    "Can you explain the step-by-step implementation process based on the backend logic?",
    "What specific thresholds and conditions from the code determine this option's viability?",
    "How does the revenue recovery calculation work in the backend algorithms?"
  ];

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: "80vh",
          display: "flex",
          flexDirection: "column"
        }
      }}
    >
      <DialogTitle sx={{
        bgcolor: "#1e3a8a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 3
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
            <HelpIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Assistant - {optionTypeLabels[option.type as keyof typeof optionTypeLabels]}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {cargoRecommendation.cargo_id} • {cargoRecommendation.priority} Priority
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        p: 0,
        overflow: "hidden"
      }}>
        {/* API Key Error Alert */}
        {apiKeyError && (
          <Alert
            severity="warning"
            sx={{ mx: 3, mt: 2, mb: 1 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => window.open('https://console.groq.com/', '_blank')}
              >
                Get API Key
              </Button>
            }
          >
            {apiKeyError}
          </Alert>
        )}

        {/* Option Summary */}
        <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            {optionTypeIcons[option.type as keyof typeof optionTypeIcons]}
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {optionTypeLabels[option.type as keyof typeof optionTypeLabels]}
            </Typography>
            <Chip
              label={option.risk}
              size="small"
              color={option.risk === "Low" ? "success" : option.risk === "Medium" ? "warning" : "error"}
            />
          </Box>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {option.description}
          </Typography>

          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Cost</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatter.format(option.cost)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Recovery</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                {formatter.format(option.recovery)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Feasibility</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {(option.feasibility * 100).toFixed(0)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Time</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {option.time_hours}h
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Chat Messages */}
        <Box sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent: message.sender === "user" ? "flex-end" : "flex-start"
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  maxWidth: "80%",
                  flexDirection: message.sender === "user" ? "row-reverse" : "row"
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: message.sender === "user" ? "#1e3a8a" : "#10b981"
                  }}
                >
                  {message.sender === "user" ? <PersonIcon /> : <BotIcon />}
                </Avatar>

                <Paper
                  sx={{
                    p: 2,
                    bgcolor: message.sender === "user" ? "#1e3a8a" : "white",
                    color: message.sender === "user" ? "white" : "text.primary",
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.7,
                      display: "block",
                      mt: 0.5,
                      fontSize: "0.7rem"
                    }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          ))}

          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "#10b981" }}>
                  <BotIcon />
                </Avatar>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ ml: 1, display: "inline" }}>
                    Analyzing option details...
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <Box sx={{ p: 3, borderTop: "1px solid #e0e0e0" }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: "#1e3a8a", fontWeight: 600 }}>
              Try asking about this option:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {suggestedQuestions.map((question, index) => (
                <Chip
                  key={index}
                  label={question}
                  variant="outlined"
                  size="small"
                  onClick={() => setInputMessage(question)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "#1e3a8a",
                      color: "white"
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Input Area */}
        <Box sx={{ p: 3, borderTop: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder={
                apiKeyError
                  ? "Configure API key to enable AI assistant"
                  : `Ask about this ${optionTypeLabels[option.type as keyof typeof optionTypeLabels]} option...`
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || !!apiKeyError}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !!apiKeyError}
              sx={{
                minWidth: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: "#1e3a8a",
                "&:hover": {
                  bgcolor: "#1e40af"
                }
              }}
            >
              <SendIcon />
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
