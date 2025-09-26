// Simple test script to verify Groq API connectivity
// Run with: node test-groq-api.js

import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGroqAPI() {
  const apiKey = process.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    console.error('❌ No API key found in environment variables');
    console.log('Please check your .env file');
    return;
  }

  console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');
  console.log('🚀 Testing Groq API connection...');

  const groq = new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond with 'API test successful' if you can read this message."
        },
        {
          role: "user",
          content: "Hello, can you respond?"
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 50
    });

    console.log('✅ API Test Successful!');
    console.log('Response:', completion.choices[0]?.message?.content);

  } catch (error) {
    console.error('❌ API Test Failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 This looks like an API key issue. Please check:');
      console.log('1. Is your API key correct?');
      console.log('2. Has your API key expired?');
      console.log('3. Do you have sufficient quota?');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('\n💡 This looks like a network issue. Please check:');
      console.log('1. Your internet connection');
      console.log('2. Firewall settings');
      console.log('3. VPN configuration');
    } else {
      console.log('\n💡 Unexpected error. Full error details:');
      console.log(error);
    }
  }
}

testGroqAPI();