# AI Assistant Setup Guide

## Overview

The AI Assistant has been enhanced with a RAG (Retrieval-Augmented Generation) system that provides detailed explanations of backend calculation logic for each recommendation option. This allows the assistant to explain exactly how feasibility scores, costs, and implementation details are calculated.

## Features Added

✅ **RAG System**: Retrieves actual backend calculation code snippets
✅ **Detailed Explanations**: Provides specific formulas and thresholds from the algorithms
✅ **Enhanced Prompts**: AI assistant now has context of calculation methodologies
✅ **Better Error Handling**: Clear setup instructions and error messages

## Setup Instructions

### 1. Get Your Groq API Key

1. Visit [https://console.groq.com/](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the generated API key

### 2. Configure Environment Variables

1. Open the `frontend/.env` file
2. Replace `your_groq_api_key_here` with your actual API key:
   ```
   VITE_GROQ_API_KEY=your_actual_api_key_here
   ```
3. Save the file

### 3. Restart Development Server

```bash
cd frontend
npm run dev
```

## How It Works

When you ask the AI assistant questions like:
- "How did you calculate the feasibility score?"
- "What are the cost components?"
- "Why was this option recommended?"

The assistant now provides detailed answers based on:

1. **Actual Backend Code**: Real calculation snippets from the algorithms
2. **Specific Formulas**: Exact mathematical formulas used
3. **Threshold Values**: The specific thresholds and conditions
4. **Implementation Logic**: Step-by-step backend processes

## Example Enhanced Responses

**Before**: Generic explanation without calculation details
**After**: "The feasibility is calculated as: `min(1.0, revenue_recovery / estimated_cost)`. If the recovery is less than 10% of the charter cost, the option is considered not feasible."

## Troubleshooting

### Common Issues

1. **"I'm sorry, I'm having trouble connecting right now"**
   - Check if your API key is correctly set in `.env`
   - Verify the API key is valid and has quota remaining
   - Check your internet connection

2. **"Invalid API key"**
   - Double-check the API key in your `.env` file
   - Ensure there are no extra spaces or characters
   - Generate a new API key if the current one is invalid

3. **"API quota exceeded"**
   - Check your usage limits on Groq console
   - Consider upgrading your plan if needed
   - Wait for quota reset if on free tier

### Configuration Files

- `.env` - Your actual API key (keep this private)
- `.env.example` - Template showing required format
- `.gitignore` - Ensures .env is not committed to version control

## Security Notes

- Never commit your `.env` file to version control
- The `.gitignore` file ensures your API key stays secure
- Use environment variables for all sensitive configuration
- Rotate your API key regularly for security

## Testing the Setup

1. Open the application in your browser
2. Navigate to the AI Recommendations page
3. Click on "AI Assistant" for any recommendation option
4. Ask questions about calculations, costs, or feasibility
5. The assistant should now provide detailed technical explanations

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your API key configuration
3. Ensure you're using a supported browser
4. Check the Groq status page for service outages