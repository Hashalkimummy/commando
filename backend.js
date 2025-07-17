const express = require('express');
const app = express();
const port = 3000;

const API_URL = 'https://api.langflow.astra.datastax.com/lf/4412004c-a602-42d0-8d2c-b8761eecd74e/api/v1/run/867bf283-c6a9-42ab-9516-1e5d766d2c65';
const APPLICATION_TOKEN = 'AstraCS:ojtTpzCwPRXqDcUJMcbDrhcq:06b647c3323b9a53f1fd775236565da79b8bc4c15b5abfc8a2326563bc5149fc';

const REQUEST_TIMEOUT = 600000; 
const SERVER_TIMEOUT = 660000; 

app.use(express.json());

// Set server timeout
app.use((req, res, next) => {
  req.setTimeout(SERVER_TIMEOUT);
  res.setTimeout(SERVER_TIMEOUT);
  next();
});

app.options('/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res.sendStatus(200);
});

app.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { message, session_id } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Invalid request data' });
    }

    const payload = {
      input_value: message.trim(),
      output_type: 'chat',
      input_type: 'chat',
      session_id: session_id || 'default_session'
    };

    console.log(`Making API request with ${REQUEST_TIMEOUT}ms timeout...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APPLICATION_TOKEN}`,
        'connection': 'keep-alive'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });


    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 504) {
        console.error('504 Gateway Timeout received from API');
        return res.status(504).json({
          success: false,
          error: 'Gateway timeout - please try again',
          code: 'GATEWAY_TIMEOUT'
        });
      }
      throw new Error(`API error: HTTP ${response.status}`);
    }

    const responseData = await response.json();

    // Extract response text
    let responseText = 'No response received';
    if (responseData.outputs) {
      for (const output of responseData.outputs) {
        if (output.outputs) {
          for (const innerOutput of output.outputs) {
            const text = innerOutput?.results?.message?.text;
            if (text) {
              responseText = text;
              break;
            }
          }
        }
      }
    }

    res.json({
      success: true,
      response: responseText,
      session_id: session_id || 'default_session'
    });

  } catch (err) {
    console.error('Error in /chat endpoint:', err);
    
    // Handle timeout errors
    if (err.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout - please try again',
        code: 'REQUEST_TIMEOUT'
      });
    }
    
    if (err.message.includes('504')) {
      return res.status(504).json({
        success: false,
        error: 'Gateway timeout - please try again later',
        code: 'GATEWAY_TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Langflow proxy server running on http://localhost:${port}`);
});
