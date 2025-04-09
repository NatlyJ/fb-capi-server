require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function hashData(data) {
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

app.post('/fb-event', async (req, res) => {
  const { event_name, event_id, email, value, currency } = req.body;

  if (!event_name || !email) {
    return res.status(400).json({ error: "Missing required fields: event_name or email" });
  }

  const payload = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event_id || `evt_${Date.now()}`,
    action_source: 'website',
    user_data: {
      em: email ? hashData(email) : undefined
    },
    custom_data: {
      value: value || 0,
      currency: currency || 'EUR'
    }
  };

  try {
    const response = await axios.post(`https://graph.facebook.com/v18.0/${process.env.PIXEL_ID}/events`, {
      data: [payload],
      access_token: process.env.FB_ACCESS_TOKEN
    });

    res.json({ success: true, fb_response: response.data });
  } catch (error) {
    console.error("FB ERROR RESPONSE:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      fb_error: error.response?.data
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
