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
  const {
    event_name,
    event_id,
    email,
    first_name,
    phone,
    browser_language,
    user_agent
  } = req.body;

  const payload = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id,
    action_source: 'website',
    user_data: {
      em: email ? hashData(email) : undefined,
      fn: first_name ? hashData(first_name) : undefined,
      ph: phone ? hashData(phone) : undefined,
      client_user_agent: user_agent,
      client_ip_address: req.ip,
      browser_language: browser_language
    }
  };

  try {
    const response = await axios.post(`https://graph.facebook.com/v18.0/${process.env.PIXEL_ID}/events`, {
      data: [payload],
      access_token: process.env.FB_ACCESS_TOKEN
    });

    res.json({ success: true, fb_response: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
