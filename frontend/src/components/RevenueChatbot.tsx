import { useState, useRef, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  Paper,
  Avatar,
  IconButton,
  Collapse,
  Chip,
  CircularProgress,
  Alert
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Chat as ChatIcon
} from "@mui/icons-material";
import Groq from "groq-sdk";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface RevenueChatbotProps {
  revenueData?: any;
  cargoData?: any;
}

const groq = new Groq({
  apiKey: "your_api_key",
  dangerouslyAllowBrowser: true
});

export function RevenueChatbot({ revenueData, cargoData }: RevenueChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your Revenue Management Business Advisor. I help explain cargo solutions, revenue recovery strategies, and business decisions in simple terms - no technical jargon! Think of me as your friendly business consultant who can break down complex airline cargo operations into easy-to-understand concepts. What would you like to learn about?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateContextualPrompt = (userMessage: string) => {
    const context = {
      revenueData: revenueData ? {
        totalRevenue: revenueData.totalRevenue,
        totalMargin: revenueData.totalMargin,
        averageMargin: revenueData.averageMargin
      } : null,
      cargoData: cargoData ? Object.keys(cargoData).length : 0
    };

    return `You are a friendly Revenue Management Business Advisor for an airline cargo system. Your role is to explain complex revenue management concepts in simple, business-friendly language that anyone can understand.

IMPORTANT GUIDELINES:
- NEVER provide code snippets, technical formulas, or programming syntax
- Always explain concepts using simple business language and real-world analogies
- Use examples with actual rupee amounts to illustrate points
- Focus on business impact and practical implications
- Speak like a business consultant, not a technical expert

Current Business Context:
${context.revenueData ? `
- Total Revenue: ₹${context.revenueData.totalRevenue?.toLocaleString('en-IN') || 'N/A'}
- Total Margin: ₹${context.revenueData.totalMargin?.toLocaleString('en-IN') || 'N/A'}
- Average Margin: ₹${context.revenueData.averageMargin?.toLocaleString('en-IN') || 'N/A'}
` : ''}
- Cargo Items: ${context.cargoData || 'N/A'}

User Question: ${userMessage}

Please provide a business-friendly response that:
1. Explains concepts like you're talking to a business manager, not a programmer
2. Uses analogies and real-world examples (like comparing to taxi services, delivery trucks, etc.)
3. Shows practical business impact with rupee examples
4. Avoids technical jargon - use "success rate" instead of "feasibility_score", "money recovered" instead of "revenue_recovery"
5. Provides actionable business insights
6. Keeps responses conversational and under 250 words
7. Uses Indian Rupee (₹) formatting when discussing money

Think of yourself as explaining to a business owner who wants to understand the practical implications, not the technical details.`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

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
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: generateContextualPrompt(inputMessage)
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 300
      });

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      console.error("Groq API Error:", err);
      setError("Failed to get response from AI assistant. Please try again.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: "bot",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
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
    "How can I recover money from denied cargo?",
    "What happens when flights are full?",
    "Which solution saves the most money?",
    "How do charter flights work for cargo?",
    "What's the best way to handle delays?",
    "How do you decide which cargo to prioritize?"
  ];

  return (
    <Card sx={{
      borderRadius: 3,
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    }}>
      <CardHeader
        avatar={<ChatIcon sx={{ color: "#3b82f6" }} />}
        title="Business Advisor"
        subheader="Get easy-to-understand explanations about cargo solutions and revenue recovery"
        action={
          <IconButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        }
        sx={{
          background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
          borderBottom: "1px solid #cbd5e1",
          "& .MuiCardHeader-title": {
            fontWeight: 600,
            color: "#1e293b",
            fontSize: "1.1rem"
          },
          "& .MuiCardHeader-subheader": {
            color: "#64748b",
            fontSize: "0.9rem"
          }
        }}
      />
      
      <Collapse in={isExpanded}>
        <CardContent sx={{ p: 0 }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Messages Area */}
          <Box
            sx={{
              height: 400,
              overflowY: "auto",
              p: 2,
              bgcolor: "#fafafa"
            }}
          >
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: "flex",
                  justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                  mb: 2
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
                      bgcolor: message.sender === "user" ? "#5D688A" : "#4CAF50"
                    }}
                  >
                    {message.sender === "user" ? <PersonIcon /> : <BotIcon />}
                  </Avatar>
                  
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: message.sender === "user" ? "#5D688A" : "white",
                      color: message.sender === "user" ? "white" : "text.primary",
                      borderRadius: 2,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        fontSize: message.sender === "bot" ? "0.95rem" : "0.9rem"
                      }}
                    >
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
              <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#4CAF50" }}>
                    <BotIcon />
                  </Avatar>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ ml: 1, display: "inline" }}>
                      Thinking...
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <Box sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: "#5D688A", fontWeight: 600 }}>
                💡 Try asking these business questions:
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
                        bgcolor: "#5D688A",
                        color: "white"
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: "1px solid #e0e0e0", bgcolor: "white" }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Ask me anything about cargo solutions, revenue recovery, or business decisions in simple terms..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                sx={{
                  minWidth: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: "#5D688A",
                  "&:hover": {
                    bgcolor: "#4a5578"
                  }
                }}
              >
                <SendIcon />
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
}