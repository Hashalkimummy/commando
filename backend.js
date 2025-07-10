const express = require('express');
const app = express();
const port = 3000;

const API_URL = 'https://api.langflow.astra.datastax.com/lf/4412004c-a602-42d0-8d2c-b8761eecd74e/api/v1/run/867bf283-c6a9-42ab-9516-1e5d766d2c65';
const APPLICATION_TOKEN = 'AstraCS:ojtTpzCwPRXqDcUJMcbDrhcq:06b647c3323b9a53f1fd775236565da79b8bc4c15b5abfc8a2326563bc5149fc';

app.use(express.json());

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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APPLICATION_TOKEN}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
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
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Langflow proxy server running on http://localhost:${port}`);
});
