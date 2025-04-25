require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== data hash =====
function hashData(data) {
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

// ===== FACEBOOK EVENT =====
app.post('/fb-event', async (req, res) => {
  const { event_name, event_id, email, first_name, phone } = req.body;

  const payload = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id,
    action_source: 'website',
    user_data: {
      em: email ? hashData(email) : undefined,
      fn: first_name ? hashData(first_name) : undefined,
      ph: phone ? hashData(phone) : undefined,
      client_user_agent: req.headers['user-agent'],
      client_ip_address: req.ip
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

// ===== GA4 EVENT =====
app.post('/ga4-event', async (req, res) => {
  const { client_id, event_name, params } = req.body;

  const payload = {
    client_id: client_id || crypto.randomUUID(),
    events: [{
      name: event_name,
      params: params || {}
    }]
  };

  try {
    const response = await axios.post(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
      payload
    );
    res.json({ success: true, ga_response: response.data });
  } catch (error) {
    console.error('GA4 Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== GOOGLE ADS SERVER-SIDE CONVERSION =====
app.post('/google-ads-event', async (req, res) => {
  const {
    gclid,
    email,
    phone,
    conversion_action, // В формате: customers/1234567890/conversionActions/987654321
    conversion_value = 1.0,
    currency_code = 'USD'
  } = req.body;

  const conversion_date_time = new Date().toISOString().replace('Z', '+00:00'); // e.g. '2025-04-25T15:00:00+00:00'

  const user_identifiers = [];
  if (email) user_identifiers.push({ hashed_email: hashData(email) });
  if (phone) user_identifiers.push({ hashed_phone_number: hashData(phone) });

  const payload = {
    conversions: [{
      conversion_action,
      conversion_date_time,
      conversion_value,
      currency_code,
      gclid,
      user_identifiers
    }],
    partial_failure: false
  };

  try {
    const response = await axios.post(
      `https://googleads.googleapis.com/v14/customers/${process.env.GOOGLE_CUSTOMER_ID}/googleAds:uploadClickConversions`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
          'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, google_ads_response: response.data });
  } catch (error) {
    console.error('Google Ads Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Server Start =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
